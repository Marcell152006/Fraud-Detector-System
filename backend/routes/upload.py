"""
CSV batch upload route.

POST /api/upload
  Multipart: file (CSV)
  Returns: BatchResponse with summary + per-row results

GET /api/upload/download/{batch_id}
  Returns: enriched CSV download
"""
import io
import csv
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from services.csv_service import process_csv

router = APIRouter()

ALLOWED_EXTENSIONS = {".csv"}
ALLOWED_CONTENT_TYPES = {
    "text/csv", "application/csv",
    "application/vnd.ms-excel", "text/plain",
}


@router.post("")
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a CSV file for batch fraud prediction."""
    # Validate file type
    filename = file.filename or ""
    if not filename.lower().endswith(".csv") and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        summary = await process_csv(file_bytes, db)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")

    return summary


@router.get("/download/{batch_id}")
async def download_batch_results(batch_id: str, db: AsyncSession = Depends(get_db)):
    """Stream an enriched CSV containing predictions for the given batch."""
    from sqlalchemy import select
    from database.models import PredictionRecord
    import json

    stmt = select(PredictionRecord).where(PredictionRecord.batch_id == batch_id)
    result = await db.execute(stmt)
    records = result.scalars().all()

    if not records:
        raise HTTPException(status_code=404, detail="Batch not found.")

    output = io.StringIO()
    fieldnames = [
        "id", "transaction_type", "amount", "prediction",
        "probability", "risk_level", "confidence", "reasons", "created_at",
        "step", "type", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()

    for rec in records:
        features = json.loads(rec.input_features)
        writer.writerow({
            "id":               rec.id,
            "transaction_type": rec.transaction_type,
            "amount":           rec.amount,
            "prediction":       rec.prediction,
            "probability":      rec.fraud_probability,
            "risk_level":       rec.risk_level,
            "confidence":       rec.confidence,
            "reasons":          rec.reasons,
            "created_at":       rec.created_at.isoformat(),
            **{k: features.get(k, "") for k in ["step", "type", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest"]},
        })

    output.seek(0)
    return StreamingResponse(
        iter([output.read()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=batch_{batch_id}.csv"},
    )
