import os
import time
import json
import hashlib
from typing import Any, Type, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.entities import AIRun
from app.ai.providers.mock_provider import MockLLMProvider
from app.ai.providers.gemini_provider import GeminiLLMProvider
from app.ai.schemas import CopilotResponse, SmartTaskBuilderResponse, CommitmentExtractionResponse

class AIService:
    def __init__(self):
        provider_name = settings.AI_PROVIDER.lower()
        if provider_name == "gemini":
            self.provider = GeminiLLMProvider()
        else:
            self.provider = MockLLMProvider()

    def _load_prompt(self, template_name: str) -> str:
        prompt_path = os.path.join(
            os.path.dirname(__file__), "prompts", template_name
        )
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as f:
                return f.read()
        return ""

    async def execute_structured_prompt(
        self,
        db: Session,
        purpose: str,
        template_name: str,
        user_input: str,
        schema_cls: Type[Any],
        model: str = "default"
    ) -> Any:
        system_prompt = self._load_prompt(template_name)
        combined_prompt = f"{system_prompt}\n\nUSER INPUT:\n{user_input}"
        input_hash = hashlib.sha256(combined_prompt.encode("utf-8")).hexdigest()

        start_time = time.time()
        status = "success"
        error_msg = None
        parsed_result = None
        raw_json_str = ""

        try:
            raw_dict = await self.provider.generate_json(combined_prompt, schema_cls)
            raw_json_str = json.dumps(raw_dict)
            parsed_result = schema_cls.model_validate(raw_dict)
        except Exception as e:
            # 1 repair retry (§5.0)
            try:
                repair_prompt = f"Fix this broken JSON to conform to schema:\n{raw_json_str}\nError was: {str(e)}"
                raw_dict = await self.provider.generate_json(repair_prompt, schema_cls)
                raw_json_str = json.dumps(raw_dict)
                parsed_result = schema_cls.model_validate(raw_dict)
            except Exception as e2:
                status = "failure"
                error_msg = f"Failed validation after repair retry: {str(e2)}"
                # Fallback to schema default
                parsed_result = schema_cls()

        latency_ms = int((time.time() - start_time) * 1000)
        tokens_est = len(combined_prompt) // 4 + len(raw_json_str) // 4
        cost_est = (tokens_est / 1000) * 0.0005 if self.provider.name != "mock" else 0.0

        # Log to ai_runs table
        try:
            ai_run = AIRun(
                purpose=purpose,
                provider=self.provider.name,
                model=model,
                prompt_version="v1",
                input_hash=input_hash,
                input_prompt=combined_prompt[:2000],
                output_json=raw_json_str[:5000],
                tokens_used=tokens_est,
                latency_ms=latency_ms,
                cost_estimate=cost_est,
                status=status,
                error_message=error_msg
            )
            db.add(ai_run)
            db.commit()
        except Exception:
            db.rollback()

        return parsed_result

ai_service = AIService()

