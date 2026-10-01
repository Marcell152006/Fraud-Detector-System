"""
Single-transaction prediction route.

POST /api/predict
  Body: TransactionInput JSON
  Returns: PredictionResponse
"""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from database.models import PredictionRecord
from schemas.transaction import TransactionInput, PredictionResponse
from services.predictor import predict_single

router = APIRouter()


@router.post("", response_model=PredictionResponse, status_code=201)
async def predict_transaction(
    payload: TransactionInput,
    db: AsyncSession = Depends(get_db),
):
    """
    Run the Random Forest model on a single transaction and persist the result.
    """
    try:
        result = predict_single(payload.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction error: {exc}")

    # 'type' is always a string from the validated schema
    type_str = str(payload.type).upper()

    record = PredictionRecord(
        source="single",
        batch_id=None,
        input_features=json.dumps(payload.model_dump()),
        transaction_type=type_str,
        amount=payload.amount,
        prediction=result["prediction"],
        fraud_probability=result["probability"],
        risk_level=result["risk"],
        confidence=result["confidence"],
        reasons="; ".join(result["reasons"]),
        created_at=datetime.utcnow(),
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return PredictionResponse(
        id=record.id,
        prediction=record.prediction,
        probability=record.fraud_probability,
        risk=record.risk_level,
        confidence=record.confidence,
        reasons=result["reasons"],
        created_at=record.created_at,
    )
