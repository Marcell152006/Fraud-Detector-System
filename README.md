# FraudShield — Fraud Detection System v2.0

A production-ready, full-stack ML-powered web application for detecting fraudulent financial transactions using a **Random Forest** model.

---

## ✨ Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Dashboard** | KPI cards · Pie · Bar · Line · Area · Monthly Trend · Recent Predictions |
| 2 | **Single Transaction Analysis** | 8-field form → prediction + animated probability bar + risk + confidence |
| 3 | **Risk Levels** | 0–30% Low (Green) · 31–70% Medium (Orange) · 71–100% High (Red) |
| 4 | **Explain Prediction** | Feature-importance-weighted reasons: amount, type, balance patterns |
| 5 | **Batch CSV Upload** | Drag-and-drop CSV → predict all rows → download enriched CSV |
| 6 | **Prediction History** | Full SQLite store · search · filter (type/risk/source) · delete · pagination |
| 7 | **Analytics Page** | Fraud by Type · Risk Distribution · 30-day History · Fraud % · Top 10 Risk |
| 8 | **Dark Mode** | Persistent toggle in top bar — class-based Tailwind dark mode |
| 9 | **Responsive** | Desktop · Tablet · Mobile with sidebar + top nav |

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11 · FastAPI · Uvicorn · Pydantic v2 |
| ML | Scikit-Learn · Joblib (Random Forest) |
| Database | SQLite · SQLAlchemy (async) · aiosqlite |
| Frontend | React 18 · Vite · Tailwind CSS v3 (dark mode) |
| Charts | Recharts (Area · Bar · Line · Pie) |
| Animation | Framer Motion |
| HTTP | Axios |
| Routing | React Router v6 |
| DevOps | Docker · Docker Compose |

---

## 📁 Project Structure

```
FraudDetectionSystem/
├── backend/
│   ├── app.py                      # FastAPI app entry point
│   ├── database.py                 # Async SQLAlchemy engine + session
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── database/models.py          # PredictionRecord ORM model
│   ├── models/
│   │   └── fraud_detection_model.pkl   ← Your model goes here
│   ├── routes/
│   │   ├── prediction.py           # POST /api/predict
│   │   ├── upload.py               # POST /api/upload + GET download
│   │   ├── dashboard.py            # GET  /api/dashboard
│   │   ├── history.py              # GET/DELETE /api/history
│   │   └── analytics.py            # GET  /api/analytics
│   ├── schemas/transaction.py      # Pydantic request/response models
│   └── services/
│       ├── predictor.py            # Model loading · inference · explanation engine
│       └── csv_service.py          # CSV parse · batch persist
└── frontend/
    ├── src/
    │   ├── App.jsx  main.jsx  index.css
    │   ├── contexts/ThemeContext.jsx   # Dark mode provider
    │   ├── layouts/MainLayout.jsx
    │   ├── components/
    │   │   ├── Sidebar.jsx          # 5-item nav
    │   │   ├── TopBar.jsx           # Title + dark mode toggle
    │   │   ├── StatCard.jsx         # Animated KPI tile
    │   │   ├── PredictionResult.jsx # Animated result + probability bar + reasons
    │   │   ├── EmptyState.jsx
    │   │   ├── PageWrapper.jsx      # Framer Motion page fade
    │   │   └── Spinner.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx        # 4 KPIs + 4 charts + recent table
    │   │   ├── SinglePrediction.jsx # Form + quick-fill examples + result
    │   │   ├── BatchUpload.jsx      # Drag-drop + batch results + download
    │   │   ├── History.jsx          # Search + filter + paginated table
    │   │   └── Analytics.jsx        # 4 deep-dive charts + top-10 table
    │   ├── services/api.js          # Axios API client
    │   ├── hooks/useAsync.js        # Reusable async state hook
    │   └── utils/format.js          # Formatters + badge helpers
    ├── package.json  vite.config.js  tailwind.config.js
    └── Dockerfile                   # Multi-stage: build → nginx
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- `fraud_detection_model.pkl` (trained Random Forest)

### 1. Place your model
```
backend/models/fraud_detection_model.pkl
```
The model must expose:
- `model.predict(X)` → `[0, 1]`  
- `model.predict_proba(X)` → `[[p_legit, p_fraud], ...]`
- `model.feature_importances_` → array of 8 floats

### 2. Run the Backend

```bash
cd FraudDetectionSystem/backend

python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

📖 Swagger UI → http://localhost:8000/docs

### 3. Run the Frontend

```bash
cd FraudDetectionSystem/frontend
npm install
npm run dev
```

🌐 App → http://localhost:5173

---

## 🐳 Docker (All-in-one)

```bash
cd FraudDetectionSystem
docker-compose up --build
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:80 |
| Backend  | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predict` | Single transaction prediction |
| `POST` | `/api/upload` | Batch CSV upload |
| `GET`  | `/api/upload/download/{batch_id}` | Download enriched CSV |
| `GET`  | `/api/dashboard` | Dashboard stats + all chart data |
| `GET`  | `/api/history?page=1&search=...&prediction=Fraud&risk=High` | Paginated history |
| `DELETE` | `/api/history/{id}` | Delete a record |
| `GET`  | `/api/analytics` | Deep analytics datasets |

### Example Request
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "step": 250,
    "type": "TRANSFER",
    "amount": 500000,
    "oldbalanceOrg": 1000000,
    "newbalanceOrig": 500000,
    "oldbalanceDest": 100000,
    "newbalanceDest": 600000
  }'
```

### Example Response
```json
{
  "id": 1,
  "prediction": "Fraud",
  "probability": 97.4,
  "risk": "High",
  "confidence": "Very High",
  "reasons": [
    "Very high transaction amount",
    "TRANSFER transaction type is high-risk",
    "Sender balance reduced by more than 80%"
  ],
  "created_at": "2024-01-15T10:30:00"
}
```

---

## 🎨 Risk Level Specification

| Level | Probability Range | Colour |
|-------|-------------------|--------|
| 🟢 Low | 0% – 30% | Green |
| 🟡 Medium | 31% – 70% | Orange |
| 🔴 High | 71% – 100% | Red |

---

## 📋 CSV Format

```csv
step,type,amount,oldbalanceOrg,newbalanceOrig,oldbalanceDest,newbalanceDest,isFlaggedFraud
250,TRANSFER,500000,1000000,500000,100000,600000,0
10,PAYMENT,250,5000,4750,10000,10250,0
```

Missing columns are automatically filled with `0`.

---

## 🌙 Dark Mode

Click the **moon/sun icon** in the top-right corner to toggle dark mode. The preference is saved to `localStorage`.

---

## License

MIT
