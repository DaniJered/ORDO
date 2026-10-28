from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr

class ContactChannelResponse(BaseModel):
    id: str
    channel: str
    is_opted_in: bool
    opted_in_at: Optional[datetime] = None
    source: Optional[str] = None
    
    class Config:
        from_attributes = True

class ContactBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None

class ContactCreate(ContactBase):
    whatsapp_opt_in: bool = False

class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None

class ContactResponse(ContactBase):
    id: str
    created_at: datetime
    channels: List[ContactChannelResponse] = []
    
    class Config:
        from_attributes = True

