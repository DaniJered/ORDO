from typing import Optional
from pydantic import BaseModel

class SystemSettings(BaseModel):
    kill_switch_active: bool
    mock_integrations: bool
    ai_provider: str
    environment: str

class KillSwitchToggle(BaseModel):
    active: bool
    reason: Optional[str] = None

class FeatureFlagUpdate(BaseModel):
    is_enabled: bool

