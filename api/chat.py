import os
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from ai_tools import TOOLS
from ai_tool_executor import execute_tool

router = APIRouter()

BASE_SYSTEM_PROMPT = """You are DocDuty's AI compliance assistant, helping Nigerian small business owners
handle invoicing, contracts, and tax/regulatory compliance.

When a conversation starts (the user's first message, e.g. a greeting like "hi" or "hello"),
do NOT respond with a generic list of capabilities, and do NOT ask whether they already have a
business profile set up — you already know the answer from context (see below), so asking is
redundant and just adds friction. If their profile is complete, call get_compliance_health_score
immediately and open with a real, specific status update based on what it returns — e.g. "You're
at 60% compliance — you have an invoice and a contract on file, but no privacy policy yet." Be
direct and grounded in their actual data, not vague.

Rules you must always follow:
1. Before calling any tool that creates a real document (create_invoice), always summarize
   exactly what you're about to create and ask the user to confirm first. Never create a
   document from an ambiguous or ungathered request. CRITICAL: before showing any VAT figure
   in this summary, you MUST call calculate_vat to get the actual current rate and amount —
   never estimate or recall VAT from general knowledge, since the real system rate may differ
   from what you'd otherwise guess. The confirmation summary must always match what the
   invoice will actually show.
2. For ANY question about business regulations, licenses, or legal requirements, ALWAYS call
   search_compliance_knowledge first before answering. Base your answer on what it returns.
   If it returns found: false, tell the user honestly that DocDuty doesn't have verified
   information on that topic yet, rather than answering from general knowledge — the whole
   point of this tool is to ground answers in actually-sourced regulatory data, not guesses.
3. When you do answer a compliance question, cite which source/agency the information came
   from (provided in the tool result), and always note that you are not a substitute for a
   licensed accountant or lawyer for anything with real financial or legal consequences.
4. If you need a client_id and the user only gave a business name, call list_clients first
   to find the matching client before proceeding.
5. Be concise and practical — business owners want clear answers, not long essays.
"""

ONBOARDING_ADDENDUM = """
IMPORTANT: This business has not completed their profile yet. Before helping with anything else,
you must first collect this information through natural conversation, ONE question at a time —
never ask more than one thing per message.

If this is the user's first message in the conversation, open with something direct like:
"Welcome to DocDuty! Let's set up your business profile so I can give you accurate, personalized
compliance guidance." Then immediately ask the first question below. Do NOT ask whether they
already have a profile — you already know they don't, that's why this instruction exists.

1. Legal structure (must be exactly one of: "Business Name (Sole Proprietorship)", "Business Name (Partnership)",
   "Private Limited Company (Ltd)", "Public Limited Company (PLC)", "Limited Liability Partnership (LLP)",
   "Limited Partnership (LP)", "Incorporated Trustees", "Not yet registered")
2. What the business actually does, in their own words (open-ended, don't force it into categories)
3. Which Nigerian state the business primarily operates in
4. Staff size (exactly one of: "Just me", "2-5", "6-20", "21-50", "50+")
5. Office status (exactly one of: "Rented", "Owned", "Home-based", "No physical office")
6. Approximate monthly revenue range (exactly one of: "Under ₦500,000", "₦500,000 - ₦2,000,000",
   "₦2,000,000 - ₦10,000,000", "₦10,000,000 - ₦25,000,000", "Above ₦25,000,000") — explain briefly
   this helps DocDuty flag when they may need to register for VAT
7. If they have paid staff, their typical salary range (exactly one of: "No paid staff",
   "Under ₦100,000/month per staff", "₦100,000 - ₦300,000/month per staff",
   "₦300,000 - ₦800,000/month per staff", "Above ₦800,000/month per staff") — explain this helps
   with PAYE tax withholding guidance

Call save_business_profile after EACH individual answer, don't wait to collect everything first.
Once all seven are collected, call save_business_profile one final time with onboarding_complete: true,
then let them know their profile is set up and ask what they'd like help with today.
"""


def load_session_messages(session_id: int) -> list:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT role, content FROM chat_messages WHERE session_id = %s ORDER BY id ASC", (session_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    messages = [{"role": row["role"], "content": row["content"]} for row in rows]

    # Defensive repair: if the conversation was interrupted mid-tool-call (e.g. a
    # crash between saving the assistant's tool_use and saving the tool_result),
    # the last assistant message may contain an unresolved tool_use with no
    # matching result. Claude's API rejects that outright, so we trim it off
    # rather than let the whole conversation become permanently unusable.
    if messages and messages[-1]["role"] == "assistant":
        last_content = messages[-1]["content"]
        if isinstance(last_content, list) and any(
            isinstance(b, dict) and b.get("type") == "tool_use" for b in last_content
        ):
            messages = messages[:-1]

    return messages


def save_message(session_id: int, role: str, content) -> None:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO chat_messages (session_id, role, content) VALUES (%s, %s, %s)",
        (session_id, role, json.dumps(content, default=str)),
    )
    cur.execute("UPDATE chat_sessions SET updated_at = %s WHERE id = %s", (datetime.utcnow(), session_id))
    conn.commit()
    cur.close()
    conn.close()


def create_session(account_id: int, user_id: int, first_message: str) -> int:
    title = first_message[:60] + ("..." if len(first_message) > 60 else "")
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO chat_sessions (account_id, user_id, title) VALUES (%s, %s, %s) RETURNING id",
        (account_id, user_id, title),
    )
    session_id = cur.fetchone()["id"]
    conn.commit()
    cur.close()
    conn.close()
    return session_id


class ChatInput(BaseModel):
    message: str
    session_id: int | None = None


@router.post("/chat")
def chat(input: ChatInput, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI assistant is not configured")

    if account and not account.get("onboarding_completed"):
        system_prompt = BASE_SYSTEM_PROMPT + ONBOARDING_ADDENDUM
    else:
        system_prompt = BASE_SYSTEM_PROMPT

    session_id = input.session_id
    if session_id is None:
        session_id = create_session(account["id"], user_id, input.message)
        messages = []
    else:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id FROM chat_sessions WHERE id = %s AND account_id = %s", (session_id, account["id"]))
        if not cur.fetchone():
            cur.close()
            conn.close()
            raise HTTPException(status_code=404, detail="Chat session not found")
        cur.close()
        conn.close()
        messages = load_session_messages(session_id)

    save_message(session_id, "user", input.message)
    messages.append({"role": "user", "content": input.message})

    client = Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system_prompt,
        tools=TOOLS,
        messages=messages,
    )

    while response.stop_reason == "tool_use":
        assistant_content = [block.model_dump() for block in response.content]
        save_message(session_id, "assistant", assistant_content)
        messages.append({"role": "assistant", "content": response.content})

        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = execute_tool(block.name, block.input, account, user_id)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, default=str),
                })

        save_message(session_id, "user", tool_results)
        messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system_prompt,
            tools=TOOLS,
            messages=messages,
        )

    final_content = [block.model_dump() for block in response.content]
    save_message(session_id, "assistant", final_content)

    final_text = "".join(block.text for block in response.content if block.type == "text")

    return {"reply": final_text, "session_id": session_id}


@router.get("/chat/sessions")
def list_sessions(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, title, created_at, updated_at FROM chat_sessions WHERE account_id = %s ORDER BY updated_at DESC",
        (account["id"],),
    )
    sessions = cur.fetchall()
    cur.close()
    conn.close()
    return {"sessions": sessions}


@router.get("/chat/sessions/{session_id}")
def get_session(session_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, title FROM chat_sessions WHERE id = %s AND account_id = %s", (session_id, account["id"]))
    session = cur.fetchone()
    cur.close()
    conn.close()

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT role, content FROM chat_messages WHERE session_id = %s ORDER BY id ASC", (session_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()

    display_messages = []
    for row in rows:
        content = row["content"]
        if isinstance(content, str):
            display_messages.append({"role": row["role"], "content": content})
        elif isinstance(content, list):
            text_parts = [b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"]
            if text_parts:
                display_messages.append({"role": row["role"], "content": "".join(text_parts)})

    return {"session": session, "messages": display_messages}


@router.delete("/chat/sessions/{session_id}")
def delete_session(session_id: int, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM chat_sessions WHERE id = %s AND account_id = %s RETURNING id", (session_id, account["id"]))
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="Chat session not found")

    return {"message": "Conversation deleted"}
