import time
from app.integrations.base import HealthResult, SendResult
from app.core.config import settings

class WhatsAppAdapter:
    key = "whatsapp_cloud"
    category = "messaging"
    name = "WhatsApp Cloud API"
    description = "Direct WhatsApp notification dispatch. Runs in Mock Mode by default."
    mock_mode = True

    def __init__(self):
        self.mock_mode = settings.WHATSAPP_MOCK_MODE
        self.token = settings.WHATSAPP_API_TOKEN
        self.phone_id = settings.WHATSAPP_PHONE_NUMBER_ID

    async def validate_config(self, config: dict) -> HealthResult:
        return await self.health_check()

    async def health_check(self) -> HealthResult:
        if self.mock_mode or not self.token:
            return HealthResult(
                status="mock_mode",
                message="WhatsApp Cloud API running in deterministic Mock Mode. No external charges or messages sent.",
                latency_ms=1
            )
        return HealthResult(
            status="connected",
            message="WhatsApp Cloud API credentials configured.",
            latency_ms=12
        )

    async def send(self, message: dict) -> SendResult:
        recipient = message.get("to")
        text = message.get("body", "")
        is_opted_in = message.get("is_opted_in", False)
        
        # Enforce Section 7 & 11 Opt-in check
        if not is_opted_in:
            return SendResult(
                success=False,
                mock_mode=self.mock_mode,
                error=f"Recipient {recipient} has not opted in to receive WhatsApp notifications. Opt-in record required."
            )

        # Mock send
        return SendResult(
            success=True,
            message_id=f"wamid.HBgL{int(time.time())}MOCK",
            mock_mode=True,
            error=None
        )

    async def handle_webhook(self, payload: dict, headers: dict) -> None:
        pass

