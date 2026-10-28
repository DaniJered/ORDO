from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Department, User, Task
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", dependencies=[Depends(require_permission("department:read"))])
def list_departments(db: Session = Depends(get_db)):
    departments = db.query(Department).all()
    data = []
    for d in departments:
        member_count = db.query(User).filter(User.department_id == d.id, User.deleted_at.is_(None)).count()
        task_count = db.query(Task).filter(Task.department_id == d.id, Task.deleted_at.is_(None)).count()
        data.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "color_tag": d.color_tag,
            "head_id": d.head_id,
            "member_count": member_count,
            "task_count": task_count
        })
    return success_response(data)

@router.post("", dependencies=[Depends(require_permission("department:manage"))])
def create_department(request: DepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(Department).filter(Department.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name already exists.")
    dept = Department(
        name=request.name,
        description=request.description,
        color_tag=request.color_tag,
        head_id=request.head_id
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return success_response({
        "id": dept.id,
        "name": dept.name,
        "color_tag": dept.color_tag
    })

@router.get("/{dept_id}", dependencies=[Depends(require_permission("department:read"))])
def get_department(dept_id: str, db: Session = Depends(get_db)):
    d = db.query(Department).filter(Department.id == dept_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Department not found.")
    members = db.query(User).filter(User.department_id == d.id, User.deleted_at.is_(None)).all()
    return success_response({
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "color_tag": d.color_tag,
        "head_id": d.head_id,
        "members": [{"id": m.id, "full_name": m.full_name, "email": m.email, "role": m.role} for m in members]
    })

@router.patch("/{dept_id}", dependencies=[Depends(require_permission("department:manage"))])
def update_department(dept_id: str, request: DepartmentUpdate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")
    for field, val in request.model_dump(exclude_unset=True).items():
        setattr(dept, field, val)
    db.commit()
    db.refresh(dept)
    return success_response({"id": dept.id, "name": dept.name})

