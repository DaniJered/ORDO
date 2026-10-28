from typing import Protocol, Dict, Any

class LLMProvider(Protocol):
    name: str
    
    async def generate_json(self, prompt: str, schema_cls: Any) -> Dict[str, Any]:
        """Generates a structured JSON response conforming to schema_cls."""
        ...

