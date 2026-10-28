import asyncio
import pytest
from datetime import datetime, timezone, timedelta
from app.db.session import SessionLocal, Base, engine
from app.models.entities import Event, Task, ExtractedCommitment, CommunicationDraft, FeatureFlag, Contact, ContactChannel
from app.services.document_parser import extract_text_from_file
from app.ai.providers.mock_provider import MockLLMProvider
from app.ai.schemas import EvidenceClassificationResponse, CommunicationDraftResponse
from app.api.v1.communications import dispatch_communication

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

def test_document_text_extractor(db):
    text_content = b"Tech Fest Minutes: Stage lighting quotation accepted at INR 45,000."
    extracted, pages, sha = extract_text_from_file(text_content, "Minutes.txt", db)
    assert "Stage lighting" in extracted
    assert pages == 1
    assert len(sha) == 64

def test_evidence_classification():
    async def _run():
        provider = MockLLMProvider()
        res = await provider.generate_json("Classify principal letter", EvidenceClassificationResponse)
        validated = EvidenceClassificationResponse.model_validate(res)
        assert validated.likely_match is True
        assert validated.confidence_score > 0.9
        assert validated.recommended_action == "verify"
    asyncio.run(_run())

def test_communication_tone_adjustment():
    async def _run():
        provider = MockLLMProvider()
        
        # Test firmer tone
        firmer_res = await provider.generate_json("Rewrite with firmer tone", CommunicationDraftResponse)
        firmer = CommunicationDraftResponse.model_validate(firmer_res)
        assert firmer.tone == "firmer"
        assert "URGENT" in firmer.subject

        # Test shorter tone
        shorter_res = await provider.generate_json("Rewrite with shorter tone", CommunicationDraftResponse)
        shorter = CommunicationDraftResponse.model_validate(shorter_res)
        assert shorter.tone == "shorter"
    asyncio.run(_run())

def test_dispatch_requires_approval(db):
    async def _run():
        now = datetime.now(timezone.utc)
        event = Event(name="Dispatch Event", start_datetime=now, end_datetime=now + timedelta(days=1))
        db.add(event)
        db.commit()

        draft = CommunicationDraft(
            event_id=event.id,
            recipient_email="member@college.edu",
            channel="email",
            subject="Notice",
            body="Action needed",
            approval_status="draft" # NOT approved
        )
        db.add(draft)
        db.commit()

        # Attempting to dispatch unapproved draft must raise 400
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            class DummyUser:
                email = "admin@college.edu"
            await dispatch_communication(draft.id, DummyUser(), db)
        assert exc.value.status_code == 400
        assert "approved before dispatch" in exc.value.detail
    asyncio.run(_run())

