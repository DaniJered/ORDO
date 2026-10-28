from typing import List, Optional
from pydantic import BaseModel, Field

class CitedTask(BaseModel):
    id: str
    title: str
    status: str

class CitedEvidence(BaseModel):
    id: str
    name: str

class CopilotResponse(BaseModel):
    answer: str
    cited_tasks: List[CitedTask] = []
    cited_evidence: List[CitedEvidence] = []
    confidence_score: float = 0.95
    suggested_actions: List[str] = []

class SuggestedTask(BaseModel):
    title: str
    description: str
    department: str
    priority: str = "medium"
    days_before_event: int = 3
    evidence_name: Optional[str] = None
    depends_on_titles: List[str] = []

class SmartTaskBuilderResponse(BaseModel):
    tasks: List[SuggestedTask] = []
    rationale: str
    confidence_score: float = 0.90

class ExtractedCommitmentItem(BaseModel):
    commitment_text: str
    task_title: str
    task_description: str
    responsible_department: Optional[str] = None
    responsible_person: Optional[str] = None
    deadline: Optional[str] = None
    priority: str = "medium"
    evidence_required: Optional[str] = None
    dependencies: Optional[str] = None
    confidence_score: float = 0.85
    source_document_reference: Optional[str] = None
    extraction_rationale: Optional[str] = None

class CommitmentExtractionResponse(BaseModel):
    commitments: List[ExtractedCommitmentItem] = []

class EvidenceClassificationResponse(BaseModel):
    document_type: str = "permission_letter"
    likely_match: bool = True
    confidence_score: float = 0.92
    missing_information: Optional[str] = None
    recommended_action: str = "verify"
    explanation: str = "Document matches expected evidence criteria."

class CommunicationDraftResponse(BaseModel):
    subject: str
    body: str
    tone: str = "default"
    channel: str = "email"
    confidence_score: float = 0.95

class DuplicateCheckItem(BaseModel):
    is_duplicate: bool = False
    similarity_score: float = 0.0
    conflicting_task_title: Optional[str] = None
    conflict_reason: Optional[str] = None

class DuplicateCheckResponse(BaseModel):
    findings: List[DuplicateCheckItem] = []
    has_conflicts: bool = False
