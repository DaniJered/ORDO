from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import User, Task, AuditLog
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.core.security import hash_password
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", dependencies=[Depends(require_permission("user:read"))])
def list_users(
    department_id: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.deleted_at.is_(None))
    
    if department_id:
        query = query.filter(User.department_id == department_id)
    if role:
        query = query.filter(User.role == role)
    if search:
        query = query.filter(
            (User.full_name.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )
        
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    
    data = [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "department_id": u.department_id,
            "department_name": u.department.name if u.department else None,
            "phone": u.phone,
            "avatar_url": u.avatar_url,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]
    return success_response(data, meta={"page": page, "page_size": page_size, "total": total})

@router.post("", dependencies=[Depends(require_permission("user:create"))])
def create_user(
    request: UserCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )
    user = User(
        email=request.email.lower(),
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role=request.role,
        department_id=request.department_id,
        phone=request.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return success_response({
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    })

@router.get("/{user_id}", dependencies=[Depends(require_permission("user:read"))])
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return success_response({
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "department_id": user.department_id,
        "department_name": user.department.name if user.department else None,
        "phone": user.phone,
        "is_active": user.is_active
    })

@router.patch("/{user_id}", dependencies=[Depends(require_permission("user:update"))])
def update_user(
    user_id: str, 
    request: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # Check open tasks if deactivating (§6.2)
    if request.is_active is False and user.is_active:
        open_tasks = db.query(Task).filter(
            Task.owner_id == user_id,
            Task.status.notin_(["verified_complete", "cancelled"]),
            Task.deleted_at.is_(None)
        ).all()
        if open_tasks:
            task_titles = [t.title for t in open_tasks[:3]]
            raise HTTPException(
                status_code=400,
                detail=f"Cannot deactivate user: user owns {len(open_tasks)} open task(s) ({', '.join(task_titles)}). Reassign tasks first."
            )
            
    for field, val in request.model_dump(exclude_unset=True).items():
        setattr(user, field, val)
        
    db.commit()
    db.refresh(user)
    return success_response({"id": user.id, "full_name": user.full_name, "is_active": user.is_active})

@router.delete("/{user_id}", dependencies=[Depends(require_permission("user:delete"))])
def delete_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    open_tasks = db.query(Task).filter(
        Task.owner_id == user_id,
        Task.status.notin_(["verified_complete", "cancelled"]),
        Task.deleted_at.is_(None)
    ).count()
    if open_tasks > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete user: user owns {open_tasks} active tasks. Reassign tasks first."
        )
        
    user.deleted_at = datetime.now(timezone.utc)
    user.is_active = False
    db.commit()
    return success_response({"message": "User soft-deleted successfully."})

