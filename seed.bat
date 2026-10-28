@echo off
set PYTHONPATH=%~dp0backend
echo Initializing database schema and populating Phase 1 seed dataset...
python -c "from app.db.session import engine, Base, SessionLocal; from app.services.seed_data import seed_database; Base.metadata.create_all(bind=engine); db = SessionLocal(); seed_database(db); db.close(); print('Seed completed successfully.')"

