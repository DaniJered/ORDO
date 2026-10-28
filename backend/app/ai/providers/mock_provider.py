import json
from typing import Dict, Any
from app.ai.schemas import (
    CopilotResponse,
    SmartTaskBuilderResponse,
    CommitmentExtractionResponse,
    EvidenceClassificationResponse,
    CommunicationDraftResponse,
    DuplicateCheckResponse
)

class MockLLMProvider:
    name = "mock"

    async def generate_json(self, prompt: str, schema_cls: Any) -> Dict[str, Any]:
        prompt_lower = prompt.lower()

        # Copilot response
        if schema_cls == CopilotResponse:
            if "sound" in prompt_lower or "audio" in prompt_lower:
                return {
                    "answer": "The Sound System Setup is currently blocked by 'Venue Booking Confirmation' from Logistics. Venue booking requires Principal signed approval evidence before keys and power are issued.",
                    "cited_tasks": [
                        {"id": "task-sound-01", "title": "Main Stage Sound & Light Rigging", "status": "blocked"},
                        {"id": "task-venue-01", "title": "Auditorium Booking & Electrical Clearance", "status": "in_progress"}
                    ],
                    "cited_evidence": [
                        {"id": "ev-venue-01", "name": "Principal Approval Letter"}
                    ],
                    "confidence_score": 0.96,
                    "suggested_actions": [
                        "Ping Logistics coordinator for Venue Approval upload",
                        "View Sound Rigging dependency chain"
                    ]
                }
            elif "overdue" in prompt_lower:
                return {
                    "answer": "There are 2 overdue tasks: 'Sponsor Brochure Printing' (overdue by 2 days, Marketing) and 'Budget Advance Requisition' (overdue by 1 day, Finance). Both are on the critical event delivery path.",
                    "cited_tasks": [
                        {"id": "task-mkt-01", "title": "Sponsor Brochure Printing & Distribution", "status": "in_progress"},
                        {"id": "task-fin-01", "title": "Budget Advance Requisition", "status": "in_progress"}
                    ],
                    "cited_evidence": [],
                    "confidence_score": 0.94,
                    "suggested_actions": [
                        "Draft escalation email to Marketing Lead",
                        "Check Finance disbursement status"
                    ]
                }
            else:
                return {
                    "answer": "ORDO Event Analysis: Tech Fest 2026 is currently at 68% readiness. Key risks: 2 blocked tasks in Logistics and Technical, and 2 overdue deliverables in Marketing. All dependencies are mapped and tracked.",
                    "cited_tasks": [
                        {"id": "task-sound-01", "title": "Main Stage Sound & Light Rigging", "status": "blocked"},
                        {"id": "task-mkt-01", "title": "Sponsor Brochure Printing & Distribution", "status": "in_progress"}
                    ],
                    "cited_evidence": [
                        {"id": "ev-mkt-01", "name": "Sponsorship Tier Matrix"}
                    ],
                    "confidence_score": 0.92,
                    "suggested_actions": [
                        "Review dependency map",
                        "Inspect unverified evidence queue"
                    ]
                }

        # Smart task builder
        if schema_cls == SmartTaskBuilderResponse:
            return {
                "tasks": [
                    {
                        "title": "Secure Chief Guest Confirmation",
                        "description": "Send formal invitation and follow up with office for schedule confirmation.",
                        "department": "Technical",
                        "priority": "critical",
                        "days_before_event": 14,
                        "evidence_name": "Chief Guest Acceptance Email",
                        "depends_on_titles": []
                    },
                    {
                        "title": "Finalize Stage Backdrop and Banners",
                        "description": "Design approval and printing of main hall vinyl backdrop (20x10ft).",
                        "department": "Marketing",
                        "priority": "high",
                        "days_before_event": 7,
                        "evidence_name": "Backdrop Proof & Vendor Invoice",
                        "depends_on_titles": ["Secure Chief Guest Confirmation"]
                    },
                    {
                        "title": "Sound and AV Equipment Dry Run",
                        "description": "Check microphones, projectors, livestream gear, and backup power generator.",
                        "department": "Technical",
                        "priority": "critical",
                        "days_before_event": 2,
                        "evidence_name": "AV Checklist Sign-off",
                        "depends_on_titles": ["Finalize Stage Backdrop and Banners"]
                    },
                    {
                        "title": "Catering & Participant Refreshment Setup",
                        "description": "Coordinate vendor arrival and lunch coupon distribution.",
                        "department": "Logistics",
                        "priority": "medium",
                        "days_before_event": 1,
                        "evidence_name": "Catering Delivery Slip",
                        "depends_on_titles": []
                    }
                ],
                "rationale": "Generated a 4-phase sequence establishing VIP presence first, branding collateral second, technical rehearsals third, and logistics support day-of.",
                "confidence_score": 0.93
            }

        # Commitment extraction
        if schema_cls == CommitmentExtractionResponse:
            return {
                "commitments": [
                    {
                        "commitment_text": "Prof. Sharma will submit the final symposium budget to Finance by Friday afternoon.",
                        "task_title": "Submit Final Symposium Budget",
                        "task_description": "Deliver itemized expense forecast to Finance Department.",
                        "responsible_department": "Finance",
                        "responsible_person": "Prof. Sharma",
                        "deadline": "2026-11-05T17:00:00Z",
                        "priority": "high",
                        "evidence_required": "Signed Budget Estimate Sheet",
                        "dependencies": "Auditorium quotation approval",
                        "confidence_score": 0.95,
                        "source_document_reference": "Minutes Section 2.1",
                        "extraction_rationale": "Explicit verbal commitment recorded with accountable owner and strict timeline."
                    },
                    {
                        "commitment_text": "Marketing team must print 500 promotional flyers once the poster design is vetted.",
                        "task_title": "Print 500 Promotional Flyers",
                        "task_description": "Coordinate with campus print shop for flyer production and distribution.",
                        "responsible_department": "Marketing",
                        "responsible_person": "Priya Nair",
                        "deadline": "2026-11-08T12:00:00Z",
                        "priority": "medium",
                        "evidence_required": "Vendor Receipt and Sample Flyer Photo",
                        "dependencies": "Poster design sign-off",
                        "confidence_score": 0.90,
                        "source_document_reference": "Minutes Section 4.3",
                        "extraction_rationale": "Clear quantity and conditional dependency on design sign-off."
                    }
                ]
            }

        # Evidence classification
        if schema_cls == EvidenceClassificationResponse:
            return {
                "document_type": "signed_approval_letter",
                "likely_match": True,
                "confidence_score": 0.94,
                "missing_information": None,
                "recommended_action": "verify",
                "explanation": "Document contains college header, principal signature, official seal, and explicit venue approval for Tech Fest dates."
            }

        # Communication draft
        if schema_cls == CommunicationDraftResponse:
            tone = "default"
            if "firmer" in prompt_lower:
                tone = "firmer"
                return {
                    "subject": "URGENT ACTION REQUIRED: Overdue Event Deliverable",
                    "body": "Dear Coordinator,\n\nYour deliverable is past deadline and currently blocking downstream stages. Please provide the required evidence immediately to prevent schedule escalation.\n\nRegards,\nORDO Workflow Engine",
                    "tone": "firmer",
                    "channel": "email",
                    "confidence_score": 0.96
                }
            elif "shorter" in prompt_lower:
                tone = "shorter"
                return {
                    "subject": "Reminder: Pending Task Evidence",
                    "body": "Hi, Please upload the required sign-off today. Need this to unblock stage rigging. Thanks!",
                    "tone": "shorter",
                    "channel": "email",
                    "confidence_score": 0.95
                }
            elif "friendlier" in prompt_lower:
                tone = "friendlier"
                return {
                    "subject": "Friendly Check-in: Tech Fest Deliverables",
                    "body": "Hello team!\n\nHope preparations are going smoothly. Whenever you have a moment today, please upload the venue clearance letter so we can proceed with rigging.\n\nWarm regards,\nTech Fest Team",
                    "tone": "friendlier",
                    "channel": "email",
                    "confidence_score": 0.94
                }
            else:
                return {
                    "subject": "Action Notice: Pending Task Verification",
                    "body": "Dear Colleague,\n\nThis is a notification regarding your assigned event task. Please review the attached requirements and upload verification evidence at your earliest convenience.\n\nBest regards,\nEvent Coordination Team",
                    "tone": "default",
                    "channel": "email",
                    "confidence_score": 0.92
                }

        # Duplicate check
        if schema_cls == DuplicateCheckResponse:
            return {
                "findings": [
                    {
                        "is_duplicate": False,
                        "similarity_score": 0.25,
                        "conflicting_task_title": None,
                        "conflict_reason": "No duplicate tasks identified in department."
                    }
                ],
                "has_conflicts": False
            }

        return {}

