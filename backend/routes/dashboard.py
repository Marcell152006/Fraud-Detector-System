"""
Dashboard route — returns all KPIs, chart data, and recent predictions.

GET /api/dashboard
"""
import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from database.models import PredictionRecord
from schemas.transaction import DashboardStats

router = APIRouter()


@router.get("", response_model=DashboardStats)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Return aggregated stats, chart datasets, and recent predictions
    for the frontend dashboard.
    """
    # ── Basic counts ──────────────────────────────────────────────────────────
    total_q = await db.execute(select(func.count()).select_from(PredictionRecord))
    total = total_q.scalar() or 0

    fraud_q = await db.execute(
        select(func.count()).select_from(PredictionRecord)
        .where(PredictionRecord.prediction == "Fraud")
    )
    fraud_count = fraud_q.scalar() or 0
    legit_count = total - fraud_count

    # ── Risk level counts ─────────────────────────────────────────────────────
    async def _risk_count(level: str) -> int:
        q = await db.execute(
            select(func.count()).select_from(PredictionRecord)
            .where(PredictionRecord.risk_level == level)
        )
        return q.scalar() or 0

    high_count   = await _risk_count("High")
    medium_count = await _risk_count("Medium")
    low_count    = await _risk_count("Low")

    # ── Recent 5 predictions ──────────────────────────────────────────────────
    recent_q = await db.execute(
        select(PredictionRecord)
        .order_by(desc(PredictionRecord.created_at))
        .limit(5)
    )
    recent_rows = recent_q.scalars().all()
    recent_predictions = [
        {
            "id":               r.id,
            "transaction_type": r.transaction_type,
            "amount":           r.amount,
            "prediction":       r.prediction,
            "probability":      r.fraud_probability,
            "risk":             r.risk_level,
            "created_at":       r.created_at.isoformat(),
        }
        for r in recent_rows
    ]

    # ── Pie chart: Fraud vs Legitimate ────────────────────────────────────────
    pie_data = [
        {"name": "Fraud",      "value": fraud_count},
        {"name": "Legitimate", "value": legit_count},
    ]

    # ── Bar chart: Fraud count by transaction type ────────────────────────────
    types = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]
    bar_data = []
    for t in types:
        fraud_t_q = await db.execute(
            select(func.count()).select_from(PredictionRecord)
            .where(PredictionRecord.transaction_type == t)
            .where(PredictionRecord.prediction == "Fraud")
        )
        legit_t_q = await db.execute(
            select(func.count()).select_from(PredictionRecord)
            .where(PredictionRecord.transaction_type == t)
            .where(PredictionRecord.prediction == "Legitimate")
        )
        bar_data.append({
            "name":       t,
            "fraud":      fraud_t_q.scalar() or 0,
            "legitimate": legit_t_q.scalar() or 0,
        })

    # ── Line chart: daily prediction count over last 14 days ─────────────────
    since_14 = datetime.utcnow() - timedelta(days=14)
    line_q = await db.execute(
        select(
            func.date(PredictionRecord.created_at).label("date"),
            func.count().label("count"),
        )
        .where(PredictionRecord.created_at >= since_14)
        .group_by(func.date(PredictionRecord.created_at))
        .order_by(func.date(PredictionRecord.created_at))
    )
    line_data = [{"date": str(r.date), "count": r.count} for r in line_q.fetchall()]

    # ── Monthly trend: last 6 months ──────────────────────────────────────────
    since_6m = datetime.utcnow() - timedelta(days=180)
    monthly_q = await db.execute(
        select(
            func.strftime("%Y-%m", PredictionRecord.created_at).label("month"),
            PredictionRecord.prediction,
            func.count().label("count"),
        )
        .where(PredictionRecord.created_at >= since_6m)
        .group_by(
            func.strftime("%Y-%m", PredictionRecord.created_at),
            PredictionRecord.prediction,
        )
        .order_by(func.strftime("%Y-%m", PredictionRecord.created_at))
    )
    monthly_raw = monthly_q.fetchall()

    # Pivot into [{month, fraud, legitimate}]
    monthly_map: dict[str, dict] = {}
    for row in monthly_raw:
        m = str(row.month)
        if m not in monthly_map:
            monthly_map[m] = {"month": m, "fraud": 0, "legitimate": 0}
        key = "fraud" if row.prediction == "Fraud" else "legitimate"
        monthly_map[m][key] = row.count
    monthly_trend = sorted(monthly_map.values(), key=lambda x: x["month"])

    return DashboardStats(
        total_predictions=total,
        fraud_count=fraud_count,
        legitimate_count=legit_count,
        fraud_rate=round(fraud_count / total * 100, 2) if total else 0.0,
        high_risk_count=high_count,
        medium_risk_count=medium_count,
        low_risk_count=low_count,
        recent_predictions=recent_predictions,
        pie_data=pie_data,
        bar_data=bar_data,
        line_data=line_data,
        monthly_trend=monthly_trend,
    )
