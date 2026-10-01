"""
SQLAlchemy ORM models.
"""
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from db import Base


class PredictionRecord(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, index=True)

    # Source: "single" | "batch"
    source:   Mapped[str] = mapped_column(sa.String(16), nullable=False, default="single")
    batch_id: Mapped[str | None] = mapped_column(sa.String(64), nullable=True, index=True)

    # Full input features stored as JSON for auditability
    input_features: Mapped[str] = mapped_column(sa.Text, nullable=False)

    # Denormalised fields for fast querying / filtering
    transaction_type: Mapped[str] = mapped_column(sa.String(16), nullable=False, default="UNKNOWN")
    amount:           Mapped[float] = mapped_column(sa.Float, nullable=False, default=0.0)

    # Prediction output
    prediction:        Mapped[str]   = mapped_column(sa.String(16), nullable=False)  # "Fraud"|"Legitimate"
    fraud_probability: Mapped[float] = mapped_column(sa.Float, nullable=False)        # 0-100
    risk_level:        Mapped[str]   = mapped_column(sa.String(16), nullable=False)   # Low|Medium|High
    confidence:        Mapped[str]   = mapped_column(sa.String(16), nullable=False, default="")
    reasons:           Mapped[str]   = mapped_column(sa.Text, nullable=False, default="")

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, nullable=False, default=datetime.utcnow
    )
