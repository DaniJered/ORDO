from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.departments import router as departments_router
from app.api.v1.events import router as events_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.contacts import router as contacts_router
from app.api.v1.integrations import router as integrations_router
from app.api.v1.settings import router as settings_router
from app.api.v1.ai import router as ai_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.audit import router as audit_router
from app.api.v1.communications import router as communications_router
from app.api.v1.automation import router as automation_router
from app.api.v1.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(departments_router)
api_router.include_router(events_router)
api_router.include_router(tasks_router)
api_router.include_router(contacts_router)
api_router.include_router(integrations_router)
api_router.include_router(settings_router)
api_router.include_router(ai_router)
api_router.include_router(dashboard_router)
api_router.include_router(evidence_router)
api_router.include_router(approvals_router)
api_router.include_router(audit_router)
api_router.include_router(communications_router)
api_router.include_router(automation_router)
api_router.include_router(reports_router)

