import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import User, Invitation, AuditLog
from app.schemas.user import (
    LoginRequest, TokenResponse, UserCreate, UserResponse,
    InviteRequest, AcceptInviteRequest
)
from app.core.security import (
    verify_password, hash_password, create_access_token,
    create_refresh_token, decode_token
)
from app.core.responses import success_response, error_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == request.email.lower(),
        User.deleted_at.is_(None)
    ).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    
    audit = AuditLog(
        actor_id=user.id,
        action="user_login",
        entity_type="user",
        entity_id=user.id,
        new_value=f"Role: {user.role}"
    )
    db.add(audit)
    db.commit()

    return success_response({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department_id": user.department_id,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active
        }
    })

@router.post("/register")
def register(request: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # First user can be super_admin; subsequent default to member
    count = db.query(User).count()
    assigned_role = "super_admin" if count == 0 else request.role

    user = User(
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=assigned_role,
        department_id=request.department_id,
        phone=request.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    return success_response({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    })

@router.post("/refresh")
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token."
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive."
        )
        
    access_token = create_access_token(user.id, user.role)
    new_refresh = create_refresh_token(user.id)
    return success_response({
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer"
    })

@router.get("/me")
def get_profile(current_user: User = Depends(get_current_user)):
    return success_response({
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "department_id": current_user.department_id,
        "phone": current_user.phone,
        "avatar_url": current_user.avatar_url,
        "is_active": current_user.is_active
    })

@router.post("/invite", dependencies=[Depends(require_permission("user:create"))])
def invite_user(
    request: InviteRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    token = str(uuid.uuid4()).replace("-", "")
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    
    invitation = Invitation(
        email=request.email.lower(),
        role=request.role,
        department_id=request.department_id,
        event_id=request.event_id,
        token_hash=token,
        expires_at=expires,
        invited_by=current_user.id
    )
    db.add(invitation)
    db.commit()
    
    return success_response({
        "invitation_id": invitation.id,
        "email": invitation.email,
        "invite_token": token,
        "invite_url": f"/accept-invite?token={token}",
        "expires_at": expires.isoformat()
    })

@router.post("/accept-invite")
def accept_invite(request: AcceptInviteRequest, db: Session = Depends(get_db)):
    invitation = db.query(Invitation).filter(
        Invitation.token_hash == request.token,
        Invitation.accepted_at.is_(None)
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired invitation token."
        )
        
    existing = db.query(User).filter(User.email == invitation.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered."
        )
        
    user = User(
        email=invitation.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=invitation.role,
        department_id=invitation.department_id
    )
    db.add(user)
    invitation.accepted_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)
    return success_response({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    })

