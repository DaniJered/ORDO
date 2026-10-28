import json
from typing import Dict, Any
from app.core.config import settings

class GeminiLLMProvider:
    name = "gemini"

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY

    async def generate_json(self, prompt: str, schema_cls: Any) -> Dict[str, Any]:
        if not self.api_key:
            # Fallback to mock if API key is missing
            from app.ai.providers.mock_provider import MockLLMProvider
            return await MockLLMProvider().generate_json(prompt, schema_cls)
            
        try:
            # Attempt real Google GenAI call
            from google import genai
            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json"
                }
            )
            return json.loads(response.text)
        except Exception:
            # Graceful fallback on network/error
            from app.ai.providers.mock_provider import MockLLMProvider
            return await MockLLMProvider().generate_json(prompt, schema_cls)

