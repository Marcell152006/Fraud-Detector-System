Place your trained Random Forest model file here:

    backend/models/fraud_detection_model.pkl

The model must expose:

    model.predict(X)        → array of [0, 1]
    model.predict_proba(X)  → array of [p_legit, p_fraud]

Expected feature columns (in this order):

    step, type, amount, oldbalanceOrg, newbalanceOrig,
    oldbalanceDest, newbalanceDest, isFlaggedFraud
