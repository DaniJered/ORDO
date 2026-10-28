.PHONY: help up seed test test-backend dev-backend dev-frontend

help:
	@echo "Available commands:"
	@echo "  make up          - Start backend & frontend services"
	@echo "  make seed        - Populate Phase 1 seed database"
	@echo "  make test        - Run backend test suite"
	@echo "  make dev-backend - Launch FastAPI dev server"
	@echo "  make dev-frontend- Launch Next.js dev server"

up:
	docker compose -f infra/docker-compose.yml up --build

seed:
	python -c "import sys; sys.path.insert(0, './backend'); from app.db.session import engine, Base, SessionLocal; from app.services.seed_data import seed_database; Base.metadata.create_all(bind=engine); db = SessionLocal(); seed_database(db); db.close(); print('Seed complete.')"

test:
	python -m pytest backend/tests -v

dev-backend:
	python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend

dev-frontend:
	cd frontend && npm run dev

