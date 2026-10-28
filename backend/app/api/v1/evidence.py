import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response, FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import EvidenceRequirement, EvidenceFile, EvidenceReview, Task, User, AuditLog
from app.services.storage import storage_service
from app.rules.orchestrator import RulesOrchestrator
from app.core.responses import success_response
from app.api.deps import get_current_user, require_permission

router = APIRouter(prefix="/evidence", tags=["Evidence & Verification"])

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 # 25MB

@router.post("/upload", dependencies=[Depends(require_permission("evidence:upload"))])
async def upload_evidence(
    requirement_id: str = Form(...),
    task_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(EvidenceRequirement).filter(EvidenceRequirement.id == requirement_id).first()
    task = db.query(Task).filter(Task.id == task_id).first()
    if not req or not task:
        raise HTTPException(status_code=404, detail="Requirement or Task not found.")

    # Validate file extension
    ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
    allowed = [t.strip().lower() for t in req.file_types_allowed.split(",")]
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '.{ext}' is not permitted. Allowed types: {req.file_types_allowed}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds maximum 25MB limit.")

    file_path, file_hash, file_size = storage_service.save_file(content, file.filename)

    evidence_file = EvidenceFile(
        requirement_id=requirement_id,
        task_id=task_id,
        uploaded_by=current_user.id,
        file_name=file.filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        file_hash=file_hash
    )
    db.add(evidence_file)
    db.commit()
    db.refresh(evidence_file)

    # Trigger automatic status transition (§8 Rule 5)
    RulesOrchestrator.on_evidence_uploaded(db, task.id, req.id, current_user.id)

    return success_response({
        "id": evidence_file.id,
        "file_name": evidence_file.file_name,
        "file_hash": evidence_file.file_hash,
        "file_size": evidence_file.file_size,
        "task_status": task.status,
        "message": "Evidence uploaded successfully. Task status transitioned to Completed Pending Evidence."
    })

@router.get("/{requirement_id}/files", dependencies=[Depends(require_permission("task:read"))])
def list_evidence_files(requirement_id: str, db: Session = Depends(get_db)):
    files = db.query(EvidenceFile).filter(EvidenceFile.requirement_id == requirement_id).all()
    data = [
        {
            "id": f.id,
            "file_name": f.file_name,
            "file_size": f.file_size,
            "mime_type": f.mime_type,
            "file_hash": f.file_hash,
            "uploaded_at": f.uploaded_at.isoformat()
        }
        for f in files
    ]
    return success_response(data)

@router.post("/reviews", dependencies=[Depends(require_permission("evidence:review"))])
def review_evidence(
    requirement_id: str = Form(...),
    action: str = Form(...), # "verify" or "reject"
    comment: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_approved = (action == "verify")
    if not is_approved and (not comment or not comment.strip()):
        raise HTTPException(
            status_code=400,
            detail="Rejection requires a mandatory explanation comment (§8 Rule 6)."
        )

    success, message = RulesOrchestrator.on_evidence_verified(
        db=db,
        requirement_id=requirement_id,
        reviewer_id=current_user.id,
        is_approved=is_approved,
        comment=comment
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return success_response({"message": message})

@router.get("/download/{file_id}", dependencies=[Depends(require_permission("task:read"))])
def download_evidence(file_id: str, db: Session = Depends(get_db)):
    ev_file = db.query(EvidenceFile).filter(EvidenceFile.id == file_id).first()
    if not ev_file or not os.path.exists(ev_file.file_path):
        raise HTTPException(status_code=404, detail="File not found.")
        
    return FileResponse(
        path=ev_file.file_path,
        filename=ev_file.file_name,
        media_type=ev_file.mime_type or "application/octet-stream"
    )

