"""
ML prediction service — wraps the Random Forest model.

Responsibilities:
  - Load and cache the model with lru_cache
  - Encode the string transaction type to the int the model expects
  - Run single and batch inference
  - Compute risk level (0-30 LOW, 31-70 MEDIUM, 71-100 HIGH)
  - Compute confidence label
  - Generate human-readable explanation from feature values + feature importance
"""
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from functools import lru_cache

MODEL_PATH = Path(__file__).parent.parent / "models" / "fraud_detection_model.pkl"

# ── Type encoding ────────────────────────────────────────────────────────────
# PaySim dataset encodes transaction types as integers

# Feature columns in the exact order the model was trained on
FEATURE_COLUMNS = [
    "step",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest",
    "type_CASH_OUT",
    "type_DEBIT",
    "type_PAYMENT",
    "type_TRANSFER",
]

# Human-readable labels for feature importance explanations
FEATURE_LABELS: dict[str, str] = {
    "step":           "Time step",
    "type":           "Transaction type",
    "amount":         "Transaction amount",
    "oldbalanceOrg":  "Sender's original balance",
    "newbalanceOrig": "Sender's new balance",
    "oldbalanceDest": "Receiver's original balance",
    "newbalanceDest": "Receiver's new balance",
    "isFlaggedFraud": "System fraud flag",
}


# ── Model loader ─────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_model():
    """Load and cache the Random Forest model. Raises FileNotFoundError if missing."""
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found at {MODEL_PATH}. "
            "Place fraud_detection_model.pkl inside backend/models/"
        )
    return joblib.load(MODEL_PATH)


# ── Risk / Confidence helpers ─────────────────────────────────────────────────

def _risk_level(prob: float) -> str:
    """Map fraud probability to a risk label (matches new 0-30/31-70/71-100 spec)."""
    pct = prob * 100
    if pct <= 30:
        return "Low"
    if pct <= 70:
        return "Medium"
    return "High"


def _confidence_label(prob: float) -> str:
    """Return a human-readable confidence string based on probability distance from 0.5."""
    dist = abs(prob - 0.5)
    if dist >= 0.45:
        return "Very High"
    if dist >= 0.35:
        return "High"
    if dist >= 0.20:
        return "Medium"
    return "Low"


# ── Explanation engine ────────────────────────────────────────────────────────

def _build_explanation(features: dict, fraud_prob: float) -> list[str]:
    """
    Generate a list of human-readable reason strings that explain the prediction.

    Strategy:
      1. Use model feature importances to rank which features matter most.
      2. Apply threshold-based rules to produce plain-English messages.
      3. Return the top reasons (max 5) sorted by feature importance.
    """
    reasons: list[tuple[float, str]] = []  # (importance_weight, message)

    try:
        model = _load_model()
        importances: np.ndarray = model.feature_importances_
        importance_map = dict(zip(FEATURE_COLUMNS, importances))
    except Exception:
        importance_map = {col: 1.0 for col in FEATURE_COLUMNS}

    amount         = features.get("amount", 0)
    old_orig       = features.get("oldbalanceOrg", 0)
    new_orig       = features.get("newbalanceOrig", 0)
    old_dest       = features.get("oldbalanceDest", 0)
    new_dest       = features.get("newbalanceDest", 0)
    type_val       = features.get("type", 0)          # already encoded int
    is_flagged     = features.get("isFlaggedFraud", 0)

    balance_reduction = old_orig - new_orig

    # ── Rule-based messages weighted by feature importance ────────────────────

    # Amount-related
    if amount > 200_000:
        reasons.append((importance_map.get("amount", 0),
                         "Very high transaction amount"))
    elif amount > 50_000:
        reasons.append((importance_map.get("amount", 0),
                         "High transaction amount"))

    # Transaction type
    if type_val in (TYPE_MAP["TRANSFER"], TYPE_MAP["CASH_OUT"]):
        label = "TRANSFER" if type_val == TYPE_MAP["TRANSFER"] else "CASH_OUT"
        reasons.append((importance_map.get("type", 0),
                         f"{label} transaction type is high-risk"))

    # Balance reduction on sender side
    if old_orig > 0 and balance_reduction / old_orig > 0.8:
        reasons.append((importance_map.get("oldbalanceOrg", 0),
                         "Sender balance reduced by more than 80%"))
    elif balance_reduction > 100_000:
        reasons.append((importance_map.get("newbalanceOrig", 0),
                         "Large balance reduction on sender account"))

    # Sender wiped to zero
    if new_orig == 0 and old_orig > 0:
        reasons.append((importance_map.get("newbalanceOrig", 0),
                         "Sender account balance emptied to zero"))

    # Destination balance anomaly
    if old_dest == 0 and new_dest > 0:
        reasons.append((importance_map.get("oldbalanceDest", 0),
                         "Destination account had zero balance before transfer"))
    elif new_dest > 0 and old_dest == 0:
        reasons.append((importance_map.get("newbalanceDest", 0),
                         "Suspicious destination account balance pattern"))

    # System flag
    if is_flagged:
        reasons.append((importance_map.get("isFlaggedFraud", 0),
                         "Transaction flagged by internal fraud system"))

    # High overall fraud probability
    if fraud_prob > 0.9:
        reasons.append((1.0, "Model confidence of fraud is very high"))

    # Sort by importance weight descending; deduplicate; take top 5
    reasons.sort(key=lambda x: x[0], reverse=True)
    seen, unique = set(), []
    for _, msg in reasons:
        if msg not in seen:
            seen.add(msg)
            unique.append(msg)

    if not unique:
        unique = ["No strong fraud indicators detected"]

    return unique[:5]


# ── Public inference API ──────────────────────────────────────────────────────

def predict_single(features: dict) -> dict:
    """
    Run inference on a single transaction.

    Args:
        features: dict with keys matching FEATURE_COLUMNS.
                  'type' may be a string (e.g. 'TRANSFER') or int.

    Returns:
        dict with prediction, probability, risk, confidence, reasons.
    """
    model = _load_model()

    # Encode string type → int
    encoded = {**features, "type": encode_type(features.get("type", 0))}

    df = pd.DataFrame([encoded])[FEATURE_COLUMNS]
    prediction = int(model.predict(df)[0])
    proba = float(model.predict_proba(df)[0][1])
    pct = round(proba * 100, 2)

    reasons = _build_explanation(encoded, proba)

    return {
        "prediction": "Fraud" if prediction == 1 else "Legitimate",
        "probability": pct,
        "risk": _risk_level(proba),
        "confidence": _confidence_label(proba),
        "reasons": reasons,
        # Keep raw int for DB storage
        "_prediction_int": prediction,
        "_proba_raw": proba,
    }


def predict_batch(df: pd.DataFrame) -> pd.DataFrame:
    """
    Run inference on a DataFrame of transactions.
    Adds columns: prediction_label, fraud_probability, risk_level, confidence, reasons
    """
    model = _load_model()
    df = df.copy()

    # Encode type column if present as strings
    if "type" in df.columns:
        df["type"] = df["type"].apply(
            lambda v: TYPE_MAP.get(str(v).upper(), v) if isinstance(v, str) else int(v)
        )

    # Fill missing feature columns with 0
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0

    feature_df = df[FEATURE_COLUMNS].fillna(0)
    raw_preds   = model.predict(feature_df).tolist()
    raw_probas  = model.predict_proba(feature_df)[:, 1].tolist()

    df["prediction"]       = raw_preds
    df["fraud_probability"] = [round(p, 4) for p in raw_probas]
    df["probability_pct"]  = [round(p * 100, 2) for p in raw_probas]
    df["risk_level"]       = [_risk_level(p) for p in raw_probas]
    df["confidence"]       = [_confidence_label(p) for p in raw_probas]
    df["label"]            = ["Fraud" if p == 1 else "Legitimate" for p in raw_preds]

    # Build reasons for each row (vectorised would be overkill; row count is manageable)
    df["reasons"] = [
        "; ".join(_build_explanation(row.to_dict(), p))
        for (_, row), p in zip(df[FEATURE_COLUMNS].iterrows(), raw_probas)
    ]

    return df
