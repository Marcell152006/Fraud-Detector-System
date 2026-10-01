"""
Analytics route — deeper chart data beyond the dashboard overview.

GET /api/analytics
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from database.models import PredictionRecord
from schemas.transaction import AnalyticsData

router = APIRouter()


@router.get("", response_model=AnalyticsData)
async def get_analytics(db: AsyncSession = Depends(get_db)):
    """
    Return rich analytics datasets for the Analytics page charts.
    """
    types = ["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]

    # ── Fraud by transaction type ─────────────────────────────────────────────
    fraud_by_type = []
    for t in types:
        fraud_q = await db.execute(
            select(func.count()).select_from(PredictionRecord)
            .where(PredictionRecord.transaction_type == t)
            .where(PredictionRecord.prediction == "Fraud")
        )
        legit_q = await db.execute(
            select(func.count()).select_from(PredictionRecord)
            .where(PredictionRecord.transaction_type == t)
            .where(PredictionRecord.prediction == "Legitimate")
        )
        fraud_by_type.append({
            "type":       t,
            "fraud":      fraud_q.scalar() or 0,
            "legitimate": legit_q.scalar() or 0,
        })

    # ── Risk distribution ─────────────────────────────────────────────────────
    risk_distribution = []
    for level in ["High", "Medium", "Low"]:
        q = await db.execute(
            select(func.count()).select_from(PredictionRecord)
            .where(PredictionRecord.risk_level == level)
        )
        risk_distribution.append({"name": level, "value": q.scalar() or 0})

    # ── Prediction history: daily counts last 30 days ─────────────────────────
    since_30 = datetime.utcnow() - timedelta(days=30)
    history_q = await db.execute(
        select(
            func.date(PredictionRecord.created_at).label("date"),
            PredictionRecord.prediction,
            func.count().label("count"),
        )
        .where(PredictionRecord.created_at >= since_30)
        .group_by(
            func.date(PredictionRecord.created_at),
            PredictionRecord.prediction,
        )
        .order_by(func.date(PredictionRecord.created_at))
    )
    history_raw = history_q.fetchall()
    history_map: dict[str, dict] = {}
    for row in history_raw:
        d = str(row.date)
        if d not in history_map:
            history_map[d] = {"date": d, "fraud": 0, "legitimate": 0}
        key = "fraud" if row.prediction == "Fraud" else "legitimate"
        history_map[d][key] = row.count
    prediction_history = sorted(history_map.values(), key=lambda x: x["date"])

    # ── Fraud percentage breakdown ────────────────────────────────────────────
    total_q = await db.execute(select(func.count()).select_from(PredictionRecord))
    total   = total_q.scalar() or 1  # avoid division by zero

    fraud_total_q = await db.execute(
        select(func.count()).select_from(PredictionRecord)
        .where(PredictionRecord.prediction == "Fraud")
    )
    fraud_total = fraud_total_q.scalar() or 0
    legit_total = total - fraud_total

    fraud_percentage = [
        {"name": "Fraud",      "value": round(fraud_total / total * 100, 1)},
        {"name": "Legitimate", "value": round(legit_total / total * 100, 1)},
    ]

    # ── Top 10 riskiest transactions ──────────────────────────────────────────
    top_q = await db.execute(
        select(PredictionRecord)
        .order_by(desc(PredictionRecord.fraud_probability))
        .limit(10)
    )
    top_records = top_q.scalars().all()
    top_risk_transactions = [
        {
            "id":               r.id,
            "transaction_type": r.transaction_type,
            "amount":           r.amount,
            "prediction":       r.prediction,
            "probability":      r.fraud_probability,
            "risk":             r.risk_level,
            "created_at":       r.created_at.isoformat(),
        }
        for r in top_records
    ]

    return AnalyticsData(
        fraud_by_type=fraud_by_type,
        risk_distribution=risk_distribution,
        prediction_history=prediction_history,
        fraud_percentage=fraud_percentage,
        top_risk_transactions=top_risk_transactions,
    )
