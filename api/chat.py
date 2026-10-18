import os
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from anthropic import Anthropic, APIConnectionError
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from subscription_utils import enforce_chat_limit
from ai_tools import TOOLS
from ai_tool_executor import execute_tool
from prompts import BASE_SYSTEM_PROMPT, ONBOARDING_ADDENDUM

router = APIRouter()

MODEL = "claude-haiku-4-5-20251001"


def repair_history(messages: list) -> list:
    """
    Claude's API requires every assistant tool_use to be answered by a tool_result in the
    very next user message. A crash between those two writes leaves an orphaned tool_use
    that would break every later request in the session. This drops any orphaned
    tool_use turn anywhere in the history, plus any tool_result with no matching tool_use.
    """
    cleaned = []
    i = 0
    n = len(messages)
    while i < n:
        msg = messages[i]
        content = msg["content"]

        if msg["role"] == "assistant" and isinstance(content, list):
            tool_ids = {b["id"] for b in content if isinstance(b, dict) and b.get("type") == "tool_use"}
            if tool_ids:
                nxt = messages[i + 1] if i + 1 < n else None
                answered = False
                if nxt and nxt["role"] == "user" and isinstance(nxt["content"], list):
                    result_ids = {
                        b.get("tool_use_id")
                        for b in nxt["content"]
                        if isinstance(b, dict) and b.get("type") == "tool_result"
                    }
                    answered = tool_ids <= result_ids
                if not answered:
                    i += 1
                    continue
                cleaned.append(msg)
                cleaned.append(nxt)
                i += 2
                continue

        # A user turn made only of tool_results, reached here, has no kept tool_use before it
        if (
            msg["role"] == "user"
            and isinstance(content, list)
            and content
            and all(isinstance(b, dict) and b.get("type") == "tool_result" for b in content)
        ):
            i += 1
            continue

        cleaned.append(msg)
        i += 1
    return cleaned


def load_session_messages(session_id: int) -> list:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT role, content FROM chat_messages WHERE session_id = %s ORDER BY id ASC", (session_id,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    messages = [{"role": row["role"], "content": row["content"]} for row in rows]
    return repair_history(messages)


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


def run_tools(content_blocks, account: dict, user_id: int):
    """
    Executes every tool_use block. A tool that raises is reported back to the model as an
    error result, so every tool_use always gets a matching tool_result.
    """
    results = []
    options = None
    for block in content_blocks:
        if block.type != "tool_use":
            continue
        if block.name == "present_choice_options":
            options = block.input.get("options")
        try:
            result = execute_tool(block.name, block.input, account, user_id)
        except Exception as e:
            print(f"Tool '{block.name}' failed: {e}")
            result = {"error": f"Tool '{block.name}' failed: {e}"}
        results.append({
            "type": "tool_result",
            "tool_use_id": block.id,
            "content": json.dumps(result, default=str),
        })
    return results, options


def call_claude(client: Anthropic, system_prompt: str, messages: list):
    try:
        return client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system_prompt,
            tools=TOOLS,
            messages=messages,
        )
    except APIConnectionError:
        raise HTTPException(status_code=503, detail="Couldn't reach the AI service. Please retry.")


class ChatInput(BaseModel):
    message: str
    session_id: int | None = None


@router.post("/chat")
def chat(input: ChatInput, user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI assistant is not configured")

    enforce_chat_limit(account["id"], account)

    if account and not account.get("onboarding_completed"):
        known_context = f"\nAccount context already on file: business_name='{account.get('business_name')}', account_type='{account.get('account_type')}'.\n"
        system_prompt = BASE_SYSTEM_PROMPT + ONBOARDING_ADDENDUM + known_context
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
    response = call_claude(client, system_prompt, messages)

    pending_options = None

    while response.stop_reason == "tool_use":
        # Run the tools first, then persist the assistant turn and its results together
        tool_results, options = run_tools(response.content, account, user_id)
        if options:
            pending_options = options

        save_message(session_id, "assistant", [block.model_dump() for block in response.content])
        save_message(session_id, "user", tool_results)

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        response = call_claude(client, system_prompt, messages)

    save_message(session_id, "assistant", [block.model_dump() for block in response.content])
    final_text = "".join(block.text for block in response.content if block.type == "text")

    return {"reply": final_text, "session_id": session_id, "options": pending_options}


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
