import asyncio
import pytest
from app.ai.providers.mock_provider import MockLLMProvider
from app.ai.schemas import CopilotResponse, SmartTaskBuilderResponse, CommitmentExtractionResponse
from app.integrations.whatsapp_adapter import WhatsAppAdapter

def test_mock_llm_copilot_schema():
    async def _run():
        provider = MockLLMProvider()
        res = await provider.generate_json("What is blocking the sound system?", CopilotResponse)
        validated = CopilotResponse.model_validate(res)
        assert validated.confidence_score > 0.8
        assert len(validated.cited_tasks) > 0
        assert "Sound" in validated.cited_tasks[0].title or "Venue" in validated.cited_tasks[0].title
    asyncio.run(_run())

def test_mock_llm_task_builder_schema():
    async def _run():
        provider = MockLLMProvider()
        res = await provider.generate_json("College Symposium", SmartTaskBuilderResponse)
        validated = SmartTaskBuilderResponse.model_validate(res)
        assert len(validated.tasks) >= 4
        assert validated.confidence_score >= 0.9
    asyncio.run(_run())

def test_whatsapp_opt_in_enforcement():
    async def _run():
        adapter = WhatsAppAdapter()
        
        # Attempt sending to non-opted-in recipient
        res_no_opt = await adapter.send({
            "to": "+919800000000",
            "body": "Test message",
            "is_opted_in": False
        })
        assert res_no_opt.success is False
        assert "opted in" in res_no_opt.error

        # Attempt sending to opted-in recipient
        res_opt = await adapter.send({
            "to": "+919800000000",
            "body": "Test message",
            "is_opted_in": True
        })
        assert res_opt.success is True
        assert res_opt.mock_mode is True
    asyncio.run(_run())
