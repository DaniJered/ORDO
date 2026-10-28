from app.integrations.base import HealthResult, SendResult

class GmailAdapter:
    key = "gmail"
    category = "email"
    name = "Gmail API (OAuth2)"
    description = "Integration with Google Workspace Gmail API via OAuth2 credentials."
    mock_mode = True

    async def validate_config(self, config: dict) -> HealthResult:
        return await self.health_check()

    async def health_check(self) -> HealthResult:
        return HealthResult(
            status="not_configured",
            message="Gmail OAuth credentials not configured. Configure client ID & secret in Settings.",
            latency_ms=0
        )

    async def send(self, message: dict) -> SendResult:
        return SendResult(
            success=False,
            mock_mode=True,
            error="Gmail integration is not configured. Use SMTP for email delivery."
        )

    async def handle_webhook(self, payload: dict, headers: dict) -> None:
        pass

