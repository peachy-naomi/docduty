from fastapi import APIRouter, Depends, HTTPException
from database import get_connection
from dependencies import get_current_user_id
from account_utils import get_account_for_user
from compliance_analysis import run_compliance_analysis

router = APIRouter()


def get_health_score_internal(account: dict) -> dict:
    """
    A simple, transparent factor-based score reflecting how much of DocDuty's
    protection an account is actually using. Reused by both the /health-score
    endpoint and the AI chat's onboarding-completion greeting.
    """
    conn = get_connection()
    cur = conn.cursor()
    checks = {}

    cur.execute(
        "SELECT COUNT(*) as count FROM invoices WHERE account_id = %s AND document_type IN ('invoice', 'receipt')",
        (account["id"],),
    )
    checks["has_revenue_document"] = cur.fetchone()["count"] > 0

    cur.execute(
        """
        SELECT COUNT(*) as count FROM contracts c
        JOIN contract_templates ct ON ct.id = c.template_id
        WHERE c.account_id = %s AND ct.slug = 'privacy-policy'
        """,
        (account["id"],),
    )
    checks["has_privacy_policy"] = cur.fetchone()["count"] > 0

    cur.execute(
        """
        SELECT COUNT(*) as count FROM contracts c
        JOIN contract_templates ct ON ct.id = c.template_id
        WHERE c.account_id = %s AND ct.slug != 'privacy-policy'
        """,
        (account["id"],),
    )
    checks["has_contract"] = cur.fetchone()["count"] > 0

    cur.execute(
        "SELECT COUNT(*) as count FROM compliance_deadlines WHERE account_id = %s AND completed = FALSE AND due_date < CURRENT_DATE",
        (account["id"],),
    )
    checks["no_overdue_deadlines"] = cur.fetchone()["count"] == 0

    cur.execute("SELECT onboarding_completed FROM accounts WHERE id = %s", (account["id"],))
    checks["profile_completed"] = bool(cur.fetchone()["onboarding_completed"])

    labels = {
        "has_revenue_document": "Generated an invoice or receipt",
        "has_privacy_policy": "Privacy policy on file",
        "has_contract": "A contract or agreement on file",
        "no_overdue_deadlines": "No overdue deadlines",
        "profile_completed": "Business profile completed",
    }

    cur.execute(
        "SELECT requirement, status FROM compliance_requirements WHERE account_id = %s",
        (account["id"],),
    )
    personalized_requirements = cur.fetchall()

    cur.close()
    conn.close()

    if personalized_requirements:
        met_count = sum(1 for r in personalized_requirements if r["status"] == "met")
        total = len(personalized_requirements)
        score = round((met_count / total) * 100) if total else 0

        return {
            "score": score,
            "personalized": True,
            "checks": {
                f"requirement_{i}": {"passed": r["status"] == "met", "label": r["requirement"]}
                for i, r in enumerate(personalized_requirements)
            },
        }

    total_checks = len(checks)
    score = round(sum(100 / total_checks for passed in checks.values() if passed))

    return {
        "score": score,
        "personalized": False,
        "checks": {key: {"passed": checks[key], "label": labels[key]} for key in checks},
    }


@router.post("/compliance/analyze")
def analyze_compliance(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    if not account.get("onboarding_completed"):
        raise HTTPException(status_code=400, detail="Complete your business profile before running a compliance analysis")

    try:
        requirements = run_compliance_analysis(account)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    return {"requirements": requirements}


@router.get("/compliance/requirements")
def get_compliance_requirements(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT requirement, status, reasoning, source_agency, analyzed_at FROM compliance_requirements WHERE account_id = %s ORDER BY id",
        (account["id"],),
    )
    requirements = cur.fetchall()
    cur.close()
    conn.close()
    return {"requirements": requirements}


@router.get("/health-score")
def get_health_score(user_id: int = Depends(get_current_user_id)):
    account = get_account_for_user(user_id)
    return get_health_score_internal(account)
