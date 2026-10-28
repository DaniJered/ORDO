from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class EventBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "Symposium"
    start_datetime: datetime
    end_datetime: datetime
    venue: Optional[str] = None
    expected_attendance: int = 0
    budget_estimate: float = 0.0
    status: str = "planning"
    cover_image: Optional[str] = None

class EventCreate(EventBase):
    template_id: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    venue: Optional[str] = None
    expected_attendance: Optional[int] = None
    budget_estimate: Optional[float] = None
    status: Optional[str] = None

class EventResponse(EventBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class EventTeamMemberAdd(BaseModel):
    user_id: str
    role_in_event: str = "coordinator"

