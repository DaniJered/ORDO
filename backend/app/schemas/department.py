from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None
    color_tag: Optional[str] = "blue"
    head_id: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color_tag: Optional[str] = None
    head_id: Optional[str] = None

class DepartmentResponse(DepartmentBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

