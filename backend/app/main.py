from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base, SessionLocal
from app.api.v1.router import api_router
from app.services.seed_data import seed_database
from app.models import * # Import all models so metadata knows them

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    
    # Run automatic database seeding for Phase 1 demo
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="ORDO - AI-Powered Workflow Dependency and Evidence Verification System",
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/api/v1/openapi.json"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ORDO Backend API",
        "version": "1.0.0",
        "mock_integrations": settings.MOCK_INTEGRATIONS,
        "ai_provider": settings.AI_PROVIDER
    }

