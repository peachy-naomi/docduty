from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from dependencies import get_current_user_id
from rate_tables import get_current_rate

router = APIRouter()


class FlatCalcInput(BaseModel):
    amount_naira: float


def calculate_vat_internal(amount_naira: float) -> dict:
    rate = get_current_rate("vat")
    percent = rate["rate_data"]["rate_percent"]
    vat_amount = round(amount_naira * (percent / 100), 2)
    return {
        "amount_naira": amount_naira,
        "vat_rate_percent": percent,
        "vat_amount_naira": vat_amount,
        "total_naira": round(amount_naira + vat_amount, 2),
    }


@router.post("/calculators/vat")
def calculate_vat(input: FlatCalcInput, user_id: int = Depends(get_current_user_id)):
    return calculate_vat_internal(input.amount_naira)


class CategoryCalcInput(BaseModel):
    category_name: str
    amount_naira: float | None = None
    size_sqm: float | None = None


def calculate_category_based(rate_type: str, input: CategoryCalcInput) -> dict:
    rate = get_current_rate(rate_type)
    categories = rate["rate_data"].get("categories", [])

    match = next((c for c in categories if c["name"] == input.category_name), None)
    if not match:
        available = [c["name"] for c in categories]
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category '{input.category_name}'. Available categories: {available}",
        )

    if match["type"] == "fixed":
        fee = match["value"]
    elif match["type"] == "percent":
        if input.amount_naira is None:
            raise HTTPException(status_code=400, detail="amount_naira is required for percentage-based categories")
        fee = round(input.amount_naira * (match["value"] / 100), 2)
    elif match["type"] == "per_unit":
        if input.size_sqm is None:
            raise HTTPException(status_code=400, detail="size_sqm is required for per-square-meter categories")
        fee = round(input.size_sqm * match["value"], 2)
    else:
        raise HTTPException(status_code=500, detail=f"Unknown rate structure for category '{match['name']}'")

    return {
        "category": match["name"],
        "calculation_type": match["type"],
        "rate_value": match["value"],
        "size_sqm": input.size_sqm if match["type"] == "per_unit" else None,
        "fee_naira": fee,
        "as_of": str(rate["effective_date"]),
        "notes": rate.get("notes"),
    }


@router.get("/calculators/{rate_type}/categories")
def list_categories(rate_type: str, user_id: int = Depends(get_current_user_id)):
    if rate_type not in ("lasaa", "wht", "stamp_duty"):
        raise HTTPException(status_code=400, detail="Invalid calculator type")
    rate = get_current_rate(rate_type)
    return {"categories": rate["rate_data"].get("categories", [])}


@router.post("/calculators/lasaa")
def calculate_lasaa(input: CategoryCalcInput, user_id: int = Depends(get_current_user_id)):
    return calculate_category_based("lasaa", input)


@router.post("/calculators/wht")
def calculate_wht(input: CategoryCalcInput, user_id: int = Depends(get_current_user_id)):
    return calculate_category_based("wht", input)


@router.post("/calculators/stamp-duty")
def calculate_stamp_duty(input: CategoryCalcInput, user_id: int = Depends(get_current_user_id)):
    return calculate_category_based("stamp_duty", input)


class PAYEInput(BaseModel):
    annual_income_naira: float


@router.post("/calculators/paye")
def calculate_paye(input: PAYEInput, user_id: int = Depends(get_current_user_id)):
    rate = get_current_rate("paye")
    bands = rate["rate_data"].get("bands", [])
    if not bands:
        raise HTTPException(status_code=404, detail="PAYE bands are not yet configured")

    remaining_income = input.annual_income_naira
    total_tax = 0.0
    breakdown = []
    previous_threshold = 0.0

    for band in bands:
        band_ceiling = band.get("up_to_naira")
        band_size = (band_ceiling - previous_threshold) if band_ceiling is not None else remaining_income
        taxable_in_band = min(remaining_income, band_size)

        if taxable_in_band <= 0:
            break

        band_tax = round(taxable_in_band * (band["rate_percent"] / 100), 2)
        total_tax += band_tax
        breakdown.append({
            "band_rate_percent": band["rate_percent"],
            "taxable_amount_naira": taxable_in_band,
            "tax_naira": band_tax,
        })

        remaining_income -= taxable_in_band
        previous_threshold = band_ceiling if band_ceiling is not None else previous_threshold

    return {
        "annual_income_naira": input.annual_income_naira,
        "total_tax_naira": round(total_tax, 2),
        "net_income_naira": round(input.annual_income_naira - total_tax, 2),
        "breakdown": breakdown,
        "as_of": str(rate["effective_date"]),
    }
