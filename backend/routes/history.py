"""
Prediction history route.

GET    /api/history   — paginated, searchable, filterable
DELETE /api/history/{id}
"""
import json
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from db import get_db
from database.models import PredictionRecord

router = APIRouter()


@router.get("")
async def get_history(
    page:        int           = Query(1, ge=1),
    page_size:   int           = Query(20, ge=1, le=100),
    search:      Optional[str] = Query(None, description="Search by transaction type or prediction"),
    prediction:  Optional[str] = Query(None, description="Filter: Fraud | Legitimate"),
    risk:        Optional[str] = Query(None, description="Filter: Low | Medium | High"),
    source:      Optional[str] = Query(None, description="Filter: single | batch"),
    db: AsyncSession = Depends(get_db),
):
    """
    Return paginated prediction history with optional search and filters.
    """
    stmt       = select(PredictionRecord)
    count_stmt = select(func.count()).select_from(PredictionRecord)

    # Build filter list
    filters = []
    if search:
        term = f"%{search}%"
        filters.append(
            or_(
                PredictionRecord.transaction_type.ilike(term),
                PredictionRecord.prediction.ilike(term),
                PredictionRecord.risk_level.ilike(term),
            )
        )
    if prediction:
        filters.append(PredictionRecord.prediction == prediction)
    if risk:
        filters.append(PredictionRecord.risk_level == risk)
    if source:
        filters.append(PredictionRecord.source == source)

    for f in filters:
        stmt       = stmt.where(f)
        count_stmt = count_stmt.where(f)

    total_result = await db.execute(count_stmt)
    total        = total_result.scalar() or 0

    stmt = (
        stmt
        .order_by(desc(PredictionRecord.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result  = await db.execute(stmt)
    records = result.scalars().all()

    items = [
        {
            "id":               r.id,
            "source":           r.source,
            "batch_id":         r.batch_id,
            "transaction_type": r.transaction_type,
            "amount":           r.amount,
            "prediction":       r.prediction,
            "probability":      r.fraud_probability,
            "risk":             r.risk_level,
            "confidence":       r.confidence,
            "reasons":          r.reasons.split("; ") if r.reasons else [],
            "created_at":       r.created_at.isoformat(),
            "input_features":   json.loads(r.input_features),
        }
        for r in records
    ]

    return {
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "items":       items,
    }


@router.delete("/{record_id}", status_code=204)
async def delete_record(record_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a single prediction record by ID."""
    result = await db.execute(
        select(PredictionRecord).where(PredictionRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Record not found.")
    await db.delete(record)
    await db.commit()
