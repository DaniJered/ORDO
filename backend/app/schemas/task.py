from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class DependencyCreate(BaseModel):
    depends_on_task_id: str
    dependency_type: str = "finish_to_start"

class EvidenceReqCreate(BaseModel):
    name: str
    description: Optional[str] = None
    file_types_allowed: str = "pdf,png,jpg,docx"
    mandatory: bool = True

class TaskBase(BaseModel):
    event_id: str
    title: str
    description: Optional[str] = None
    department_id: Optional[str] = None
    owner_id: Optional[str] = None
    deadline: datetime
    priority: str = "medium"
    status: str = "not_started"
    evidence_required: bool = False

class TaskCreate(TaskBase):
    dependencies: Optional[List[str]] = [] # list of depends_on_task_ids
    evidence_requirements: Optional[List[EvidenceReqCreate]] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[str] = None
    owner_id: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    progress_percentage: Optional[int] = None
    blocked_reason: Optional[str] = None

class DependencyResponse(BaseModel):
    id: str
    task_id: str
    depends_on_task_id: str
    dependency_type: str
    is_satisfied: bool
    
    class Config:
        from_attributes = True

class EvidenceReqResponse(BaseModel):
    id: str
    task_id: str
    name: str
    description: Optional[str] = None
    file_types_allowed: str
    mandatory: bool
    verification_status: str
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class TaskResponse(TaskBase):
    id: str
    progress_percentage: int
    blocked_reason: Optional[str] = None
    created_at: datetime
    evidence_requirements: List[EvidenceReqResponse] = []
    
    class Config:
        from_attributes = True

