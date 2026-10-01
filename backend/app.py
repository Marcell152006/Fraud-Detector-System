"""
Fraud Detection System — FastAPI application entry point.

Routes:
  POST   /api/predict        — single transaction prediction
  POST   /api/upload         — CSV batch prediction
  GET    /api/upload/download/{batch_id}
  GET    /api/dashboard      — dashboard stats + chart data
  GET    /api/history        — paginated prediction history
  DELETE /api/history/{id}   — delete a record
  GET    /api/analytics      — deep analytics datasets
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db import engine, Base
from routes import prediction, upload, dashboard, history, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all DB tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="Fraud Detection System",
    description="ML-powered fraud detection for financial transactions",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route registration ────────────────────────────────────────────────────────
app.include_router(prediction.router, prefix="/api/predict",   tags=["Prediction"])
app.include_router(upload.router,     prefix="/api/upload",    tags=["Batch Upload"])
app.include_router(dashboard.router,  prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(history.router,    prefix="/api/history",   tags=["History"])
app.include_router(analytics.router,  prefix="/api/analytics", tags=["Analytics"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "Fraud Detection API v2.0 is running"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
