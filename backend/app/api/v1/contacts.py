from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Contact, ContactChannel
from app.schemas.contact import ContactCreate, ContactUpdate, ContactResponse
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/contacts", tags=["Contacts"])

@router.get("", dependencies=[Depends(require_permission("user:read"))])
def list_contacts(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Contact).filter(Contact.deleted_at.is_(None))
    if search:
        query = query.filter(
            (Contact.name.ilike(f"%{search}%")) | (Contact.organization.ilike(f"%{search}%"))
        )
    contacts = query.all()
    
    data = []
    for c in contacts:
        channels = [
            {
                "id": ch.id,
                "channel": ch.channel,
                "is_opted_in": ch.is_opted_in,
                "opted_in_at": ch.opted_in_at.isoformat() if ch.opted_in_at else None,
                "source": ch.source
            }
            for ch in c.channels
        ]
        data.append({
            "id": c.id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "organization": c.organization,
            "notes": c.notes,
            "tags": c.tags,
            "channels": channels
        })
    return success_response(data)

@router.post("", dependencies=[Depends(require_permission("event:update"))])
def create_contact(request: ContactCreate, db: Session = Depends(get_db)):
    contact = Contact(
        name=request.name,
        email=request.email,
        phone=request.phone,
        organization=request.organization,
        notes=request.notes,
        tags=request.tags
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)

    # Automatically create opt-in records for email and whatsapp
    email_channel = ContactChannel(
        contact_id=contact.id,
        channel="email",
        is_opted_in=True,
        opted_in_at=datetime.now(timezone.utc),
        source="contact_creation"
    )
    db.add(email_channel)

    whatsapp_channel = ContactChannel(
        contact_id=contact.id,
        channel="whatsapp",
        is_opted_in=request.whatsapp_opt_in,
        opted_in_at=datetime.now(timezone.utc) if request.whatsapp_opt_in else None,
        source="explicit_user_checkbox" if request.whatsapp_opt_in else None
    )
    db.add(whatsapp_channel)
    db.commit()

    return success_response({
        "id": contact.id,
        "name": contact.name,
        "whatsapp_opted_in": request.whatsapp_opt_in
    })

@router.post("/{contact_id}/channels/{channel}/opt-in", dependencies=[Depends(require_permission("event:update"))])
def toggle_channel_opt_in(contact_id: str, channel: str, opt_in: bool, db: Session = Depends(get_db)):
    ch = db.query(ContactChannel).filter(
        ContactChannel.contact_id == contact_id,
        ContactChannel.channel == channel
    ).first()
    
    if not ch:
        ch = ContactChannel(contact_id=contact_id, channel=channel)
        db.add(ch)

    ch.is_opted_in = opt_in
    if opt_in:
        ch.opted_in_at = datetime.now(timezone.utc)
        ch.revoked_at = None
        ch.source = "manual_coordinator_opt_in"
    else:
        ch.revoked_at = datetime.now(timezone.utc)

    db.commit()
    return success_response({
        "contact_id": contact_id,
        "channel": channel,
        "is_opted_in": ch.is_opted_in
    })

