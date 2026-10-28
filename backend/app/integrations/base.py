from typing import Protocol, Optional, Any, Dict
from pydantic import BaseModel

class HealthResult(BaseModel):
    status: str # "connected", "mock_mode", "error", "not_configured"
    message: str
    latency_ms: int = 0
    details: Optional[Dict[str, Any]] = None

class SendResult(BaseModel):
    success: bool
    message_id: Optional[str] = None
    mock_mode: bool = False
    error: Optional[str] = None

class IntegrationAdapter(Protocol):
    key: str
    category: str
    name: str
    description: str
    mock_mode: bool = True
    
    async def validate_config(self, config: dict) -> HealthResult:
        ...
        
    async def send(self, message: dict) -> SendResult:
        ...
        
    async def handle_webhook(self, payload: dict, headers: dict) -> None:
        ...
        
    async def health_check(self) -> HealthResult:
        ...

