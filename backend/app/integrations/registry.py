from typing import Dict, List, Any
from app.integrations.base import IntegrationAdapter
from app.integrations.smtp_adapter import SMTPAdapter
from app.integrations.whatsapp_adapter import WhatsAppAdapter
from app.integrations.gmail_adapter import GmailAdapter

ACTIVE_ADAPTERS: Dict[str, Any] = {
    "smtp": SMTPAdapter(),
    "whatsapp_cloud": WhatsAppAdapter(),
    "gmail": GmailAdapter()
}

COMING_SOON_INTEGRATIONS: List[Dict[str, Any]] = [
    {
        "key": "google_calendar",
        "name": "Google Calendar",
        "category": "calendar",
        "description": "Bi-directional task and deadline synchronization with Google Calendar.",
        "status": "coming_soon"
    },
    {
        "key": "slack",
        "name": "Slack",
        "category": "chat",
        "description": "Post task reminders, escalations, and readiness alerts to dedicated Slack channels.",
        "status": "coming_soon"
    },
    {
        "key": "telegram",
        "name": "Telegram Bot",
        "category": "messaging",
        "description": "Send event updates and allow quick approvals via Telegram bot chats.",
        "status": "coming_soon"
    },
    {
        "key": "microsoft_teams",
        "name": "Microsoft Teams",
        "category": "chat",
        "description": "Deliver actionable approval cards directly into Microsoft Teams tabs.",
        "status": "coming_soon"
    },
    {
        "key": "s3_storage",
        "name": "AWS S3 / GCS Storage",
        "category": "storage",
        "description": "Scalable cloud object storage for verification documents and media files.",
        "status": "coming_soon"
    }
]

def get_adapter(key: str) -> IntegrationAdapter:
    return ACTIVE_ADAPTERS.get(key)

def list_all_integrations() -> List[Dict[str, Any]]:
    items = []
    for key, adapter in ACTIVE_ADAPTERS.items():
        items.append({
            "key": adapter.key,
            "name": adapter.name,
            "category": adapter.category,
            "description": adapter.description,
            "mock_mode": getattr(adapter, "mock_mode", False),
            "status": "active"
        })
    items.extend(COMING_SOON_INTEGRATIONS)
    return items

