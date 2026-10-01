"""
Pydantic schemas for request validation and response serialisation.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


# ── Request ───────────────────────────────────────────────────────────────────

class TransactionInput(BaseModel):
    """
    Single transaction input.
    `type` must be one of the five PaySim transaction type strings.
    `isFlaggedFraud` is accepted for API compatibility but is NOT forwarded
    to the model (it was dropped during training preprocessing).
    """
    step:           float = Field(..., description="Unit of time — 1 step = 1 hour")
    type:           str   = Field(..., description="Transaction type: CASH_IN|CASH_OUT|DEBIT|PAYMENT|TRANSFER")
    amount:         float = Field(..., ge=0, description="Transaction amount")
    oldbalanceOrg:  float = Field(..., ge=0, description="Sender balance before transaction")
    newbalanceOrig: float = Field(..., ge=0, description="Sender balance after transaction")
    oldbalanceDest: float = Field(..., ge=0, description="Receiver balance before transaction")
    newbalanceDest: float = Field(..., ge=0, description="Receiver balance after transaction")
    isFlaggedFraud: float = Field(0, ge=0, le=1, description="Internal fraud flag (accepted but not used by model)")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        valid = {"CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"}
        if str(v).upper() not in valid:
            raise ValueError(f"type must be one of {valid}")
        return str(v).upper()

    model_config = {
        "json_schema_extra": {
            "example": {
                "step": 250,
                "type": "TRANSFER",
                "amount": 500000,
                "oldbalanceOrg": 1000000,
                "newbalanceOrig": 500000,
                "oldbalanceDest": 100000,
                "newbalanceDest": 600000,
            }
        }
    }


# ── Response ──────────────────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    """Full prediction result returned to the client."""
    id:          int
    prediction:  str        # "Fraud" | "Legitimate"
    probability: float      # 0.0 – 100.0 percentage
    risk:        str        # Low | Medium | High
    confidence:  str        # Low | Medium | High | Very High
    reasons:     list[str]  # explanation bullets
    created_at:  datetime

    model_config = {"from_attributes": True}


class BatchRowResult(BaseModel):
    """Single row in a batch prediction response."""
    row:         int
    prediction:  str
    probability: float
    risk:        str
    confidence:  str
    reasons:     str        # semicolon-joined for CSV friendliness


class BatchResponse(BaseModel):
    batch_id:         str
    total:            int
    fraud_count:      int
    legitimate_count: int
    fraud_rate:       float
    results:          list[dict]


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_predictions:   int
    fraud_count:         int
    legitimate_count:    int
    fraud_rate:          float
    high_risk_count:     int
    medium_risk_count:   int
    low_risk_count:      int
    recent_predictions:  list[dict]   # last 5 records
    pie_data:            list[dict]   # [{name, value}]  Fraud vs Legit
    bar_data:            list[dict]   # [{name, fraud, legitimate}] by type
    line_data:           list[dict]   # [{date, count}] daily total
    monthly_trend:       list[dict]   # [{month, fraud, legitimate}]


# ── History ───────────────────────────────────────────────────────────────────

class HistoryItem(BaseModel):
    id:                 int
    source:             str
    batch_id:           Optional[str]
    transaction_type:   str
    amount:             float
    prediction:         str
    probability:        float
    risk:               str
    confidence:         str
    created_at:         datetime

    model_config = {"from_attributes": True}


class HistoryResponse(BaseModel):
    total:       int
    page:        int
    page_size:   int
    total_pages: int
    items:       list[HistoryItem]


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsData(BaseModel):
    fraud_by_type:       list[dict]   # [{type, fraud, legitimate}]
    risk_distribution:   list[dict]   # [{name, value}]
    prediction_history:  list[dict]   # [{date, fraud, legitimate}]
    fraud_percentage:    list[dict]   # [{name, value}] percentage breakdown
    top_risk_transactions: list[dict] # top 10 highest-probability records
