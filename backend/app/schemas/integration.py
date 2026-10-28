from typing import Optional, Dict, Any
from pydantic import BaseModel

class IntegrationCard(BaseModel):
    key: str
    name: str
    category: str
    description: str
    mock_mode: bool
    status: str

class TestIntegrationRequest(BaseModel):
    config: Optional[Dict[str, Any]] = None

class SendTestMessageRequest(BaseModel):
    channel: str # email, whatsapp
    to: str
    subject: Optional[str] = "ORDO Integration Test Message"
    body: Optional[str] = "This is a test notification from ORDO Workflow Engine."

