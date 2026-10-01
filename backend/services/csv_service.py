"""
CSV batch upload and persistence service.
"""
import io
import uuid
import json
import pandas as pd
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from services.predictor import predict_batch
from database.models import PredictionRecord


async def process_csv(file_bytes: bytes, db: AsyncSession) -> dict:
    """
    Parse CSV, run batch predictions, persist all records, return summary.

    Args:
        file_bytes: raw bytes of the uploaded CSV file.
        db:         SQLAlchemy async session.

    Returns:
        dict with batch_id, counts, fraud_rate, and per-row results.

    Raises:
        ValueError: if the CSV is empty or missing critical columns.
    """
    df = pd.read_csv(io.BytesIO(file_bytes))

    if df.empty:
        raise ValueError("The uploaded CSV file is empty.")

    # Validate that at minimum 'amount' is present
    if "amount" not in df.columns:
        raise ValueError("CSV must contain at least an 'amount' column.")

    result_df = predict_batch(df)
    batch_id  = str(uuid.uuid4())
    now       = datetime.utcnow()

    records = []
    for _, row in result_df.iterrows():
        # Build the stored feature dict using the original numeric columns.
        # 'type' is kept as the raw string for auditability.
        feature_keys = [
            "step", "type", "amount", "oldbalanceOrg",
            "newbalanceOrig", "oldbalanceDest", "newbalanceDest",
        ]
        feature_dict = {}
        for k in feature_keys:
            if k in row:
                val = row[k]
                feature_dict[k] = str(val) if k == "type" else float(val) if val == val else 0.0
            else:
                feature_dict[k] = 0.0

        # Resolve transaction type string for storage
        type_str = str(row.get("type", "UNKNOWN")).upper()

        records.append(
            PredictionRecord(
                source="batch",
                batch_id=batch_id,
                input_features=json.dumps(feature_dict),
                transaction_type=type_str,
                amount=float(row.get("amount", 0)),
                prediction=str(row["label"]),
                fraud_probability=float(row["probability_pct"]),
                risk_level=str(row["risk_level"]),
                confidence=str(row["confidence"]),
                reasons=str(row.get("reasons", "")),
                created_at=now,
            )
        )

    db.add_all(records)
    await db.commit()

    total       = len(result_df)
    fraud_count = int((result_df["prediction"] == 1).sum())

    return {
        "batch_id":         batch_id,
        "total":            total,
        "fraud_count":      fraud_count,
        "legitimate_count": total - fraud_count,
        "fraud_rate":       round(fraud_count / total * 100, 2) if total else 0,
        "results":          result_df.rename(columns={
            "label":           "prediction",
            "probability_pct": "probability",
            "risk_level":      "risk",
        }).to_dict(orient="records"),
    }
