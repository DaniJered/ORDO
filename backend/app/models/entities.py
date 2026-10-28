import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    head_id = Column(String(36), nullable=True)
    color_tag = Column(String(20), default="blue")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    users = relationship("User", back_populates="department")
    tasks = relationship("Task", back_populates="department")

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(50), nullable=False, default="member", index=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    phone = Column(String(30), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    quiet_hours_start = Column(String(10), nullable=True)
    quiet_hours_end = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    deleted_at = Column(DateTime, nullable=True)
    
    department = relationship("Department", back_populates="users")
    tasks = relationship("Task", back_populates="owner", foreign_keys="Task.owner_id")

class Event(Base):
    __tablename__ = "events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    type = Column(String(50), default="Symposium")
    start_datetime = Column(DateTime, nullable=False)
    end_datetime = Column(DateTime, nullable=False)
    venue = Column(String(150), nullable=True)
    expected_attendance = Column(Integer, default=0)
    budget_estimate = Column(Float, default=0.0)
    status = Column(String(30), default="planning", index=True) # draft, planning, active, completed, archived
    cover_image = Column(String(255), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    template_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    deleted_at = Column(DateTime, nullable=True)
    
    tasks = relationship("Task", back_populates="event", cascade="all, delete-orphan")
    participants = relationship("EventParticipant", back_populates="event", cascade="all, delete-orphan")

class EventParticipant(Base):
    __tablename__ = "event_participants"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    role_in_event = Column(String(50), default="coordinator")
    created_at = Column(DateTime, default=utc_now)
    
    event = relationship("Event", back_populates="participants")
    user = relationship("User")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True, index=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    deadline = Column(DateTime, nullable=False, index=True)
    priority = Column(String(20), default="medium", index=True) # low, medium, high, critical
    status = Column(String(30), default="not_started", index=True) # not_started, in_progress, blocked, completed_pending_evidence, verified_complete, cancelled
    progress_percentage = Column(Integer, default=0)
    evidence_required = Column(Boolean, default=False)
    blocked_reason = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    deleted_at = Column(DateTime, nullable=True)
    
    event = relationship("Event", back_populates="tasks")
    department = relationship("Department", back_populates="tasks")
    owner = relationship("User", foreign_keys=[owner_id], back_populates="tasks")
    evidence_requirements = relationship("EvidenceRequirement", back_populates="task", cascade="all, delete-orphan")
    outgoing_dependencies = relationship("TaskDependency", foreign_keys="TaskDependency.task_id", back_populates="task", cascade="all, delete-orphan")
    incoming_dependencies = relationship("TaskDependency", foreign_keys="TaskDependency.depends_on_task_id", back_populates="depends_on_task")

class TaskAssignment(Base):
    __tablename__ = "task_assignments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    assigned_at = Column(DateTime, default=utc_now)

class TaskDependency(Base):
    __tablename__ = "task_dependencies"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False, index=True)
    depends_on_task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False, index=True)
    dependency_type = Column(String(30), default="finish_to_start") # finish_to_start, approval_required, evidence_required
    is_satisfied = Column(Boolean, default=False)
    checked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    task = relationship("Task", foreign_keys=[task_id], back_populates="outgoing_dependencies")
    depends_on_task = relationship("Task", foreign_keys=[depends_on_task_id], back_populates="incoming_dependencies")

class EvidenceRequirement(Base):
    __tablename__ = "evidence_requirements"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    file_types_allowed = Column(String(100), default="pdf,png,jpg,docx")
    mandatory = Column(Boolean, default=True)
    verification_status = Column(String(30), default="pending", index=True) # pending, verified, rejected
    verified_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    task = relationship("Task", back_populates="evidence_requirements")
    files = relationship("EvidenceFile", back_populates="requirement", cascade="all, delete-orphan")

class EvidenceFile(Base):
    __tablename__ = "evidence_files"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    requirement_id = Column(String(36), ForeignKey("evidence_requirements.id"), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=False, index=True)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    mime_type = Column(String(100), nullable=True)
    file_hash = Column(String(64), nullable=True)
    uploaded_at = Column(DateTime, default=utc_now)
    
    requirement = relationship("EvidenceRequirement", back_populates="files")

class EvidenceReview(Base):
    __tablename__ = "evidence_reviews"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    evidence_id = Column(String(36), ForeignKey("evidence_files.id"), nullable=False, index=True)
    reviewer_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(30), default="verified") # verified, rejected
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, default=utc_now)

class Commitment(Base):
    __tablename__ = "commitments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    source_doc = Column(String(255), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    deadline = Column(DateTime, nullable=True)
    priority = Column(String(20), default="medium")
    status = Column(String(30), default="pending")
    created_at = Column(DateTime, default=utc_now)

class ExtractedCommitment(Base):
    __tablename__ = "extracted_commitments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    source_doc_ref = Column(String(255), nullable=True)
    commitment_text = Column(Text, nullable=False)
    task_title = Column(String(200), nullable=False)
    task_description = Column(Text, nullable=True)
    responsible_department = Column(String(100), nullable=True)
    responsible_person = Column(String(100), nullable=True)
    deadline = Column(DateTime, nullable=True)
    priority = Column(String(20), default="medium")
    evidence_required = Column(String(200), nullable=True)
    dependencies = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.85)
    extraction_rationale = Column(Text, nullable=True)
    review_status = Column(String(30), default="pending", index=True) # pending, accepted, rejected, edited
    converted_task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

class Approval(Base):
    __tablename__ = "approvals"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False) # evidence, budget, task, ready
    entity_id = Column(String(36), nullable=False, index=True)
    approver_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    status = Column(String(30), default="pending", index=True) # pending, approved, rejected
    comments = Column(Text, nullable=True)
    requested_at = Column(DateTime, default=utc_now)
    decided_at = Column(DateTime, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info") # info, warning, alert, success
    is_read = Column(Boolean, default=False)
    channel = Column(String(30), default="in_app")
    created_at = Column(DateTime, default=utc_now)

class MessageTemplate(Base):
    __tablename__ = "message_templates"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    name = Column(String(100), nullable=False)
    trigger_event = Column(String(50), nullable=False) # overdue, blocked, reminder
    channel = Column(String(30), default="email")
    subject_template = Column(String(255), nullable=True)
    body_template = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

class CommunicationDraft(Base):
    __tablename__ = "communication_drafts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    task_id = Column(String(36), ForeignKey("tasks.id"), nullable=True, index=True)
    recipient_email = Column(String(255), nullable=True)
    recipient_phone = Column(String(50), nullable=True)
    channel = Column(String(20), default="email") # email, whatsapp
    subject = Column(String(255), nullable=True)
    body = Column(Text, nullable=False)
    approval_status = Column(String(20), default="draft", index=True) # draft, approved, rejected, sent
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class AutomationJob(Base):
    __tablename__ = "automation_jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False, unique=True)
    schedule = Column(String(50), default="daily")
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

class AutomationLog(Base):
    __tablename__ = "automation_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_name = Column(String(100), nullable=False, index=True)
    trigger_time = Column(DateTime, default=utc_now)
    input_data = Column(Text, nullable=True)
    result = Column(Text, nullable=True)
    status = Column(String(20), default="success", index=True) # success, failure
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    actor = Column(String(50), default="system")
    created_at = Column(DateTime, default=utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(36), nullable=False, index=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=utc_now, index=True)

class IntegrationSettings(Base):
    __tablename__ = "integration_settings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    provider = Column(String(50), nullable=False, unique=True)
    config_encrypted = Column(Text, nullable=True)
    is_enabled = Column(Boolean, default=True)
    mock_mode = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    report_type = Column(String(50), default="readiness")
    data_json = Column(Text, nullable=False)
    readiness_score = Column(Float, default=0.0)
    generated_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

# Additional Tables (§4)
class Invitation(Base):
    __tablename__ = "invitations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    email = Column(String(255), nullable=False, index=True)
    role = Column(String(50), default="member")
    department_id = Column(String(36), ForeignKey("departments.id"), nullable=True)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=True)
    token_hash = Column(String(128), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    invited_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    name = Column(String(150), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    organization = Column(String(150), nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    deleted_at = Column(DateTime, nullable=True)
    
    channels = relationship("ContactChannel", back_populates="contact", cascade="all, delete-orphan")

class ContactChannel(Base):
    __tablename__ = "contact_channels"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    contact_id = Column(String(36), ForeignKey("contacts.id"), nullable=False, index=True)
    channel = Column(String(30), nullable=False) # email, whatsapp, sms
    is_opted_in = Column(Boolean, default=False)
    opted_in_at = Column(DateTime, nullable=True)
    source = Column(String(100), nullable=True) # webform, manual, event_registration
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    contact = relationship("Contact", back_populates="channels")

class EventTemplate(Base):
    __tablename__ = "event_templates"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), default="default_org", index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    blueprint_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

class IntegrationConnection(Base):
    __tablename__ = "integration_connections"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider = Column(String(50), nullable=False, index=True)
    scope = Column(String(20), default="global") # global, event
    event_id = Column(String(36), ForeignKey("events.id"), nullable=True)
    status = Column(String(30), default="mock_mode") # not_configured, mock_mode, connected, error
    credentials_ref = Column(String(255), nullable=True)
    last_checked_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider = Column(String(50), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    payload_json = Column(Text, nullable=False)
    signature = Column(String(255), nullable=True)
    status = Column(String(20), default="pending") # pending, processed, failed
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    entity_type = Column(String(50), nullable=False, index=True) # task, evidence
    entity_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_id = Column(String(36), ForeignKey("comments.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    user = relationship("User")

class AttachmentsTextCache(Base):
    __tablename__ = "attachments_text_cache"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    extracted_text = Column(Text, nullable=False)
    page_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=utc_now)

class AIRun(Base):
    __tablename__ = "ai_runs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    purpose = Column(String(100), nullable=False, index=True) # copilot, commitment_extraction, task_builder, etc.
    provider = Column(String(50), default="mock")
    model = Column(String(50), default="mock-v1")
    prompt_version = Column(String(20), default="v1")
    input_hash = Column(String(64), nullable=True)
    input_prompt = Column(Text, nullable=True)
    output_json = Column(Text, nullable=True)
    tokens_used = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    cost_estimate = Column(Float, default=0.0)
    status = Column(String(20), default="success", index=True) # success, failure
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class FeatureFlag(Base):
    __tablename__ = "feature_flags"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_enabled = Column(Boolean, default=False)
    scope = Column(String(20), default="global")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

