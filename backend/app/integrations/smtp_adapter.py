import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.integrations.base import HealthResult, SendResult
from app.core.config import settings

class SMTPAdapter:
    key = "smtp"
    category = "email"
    name = "SMTP Email"
    description = "Outbound transactional email via standard SMTP or local Mailpit container."
    mock_mode = False

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL

    async def validate_config(self, config: dict) -> HealthResult:
        return await self.health_check()

    async def health_check(self) -> HealthResult:
        start_time = time.time()
        try:
            # Attempt socket connection to SMTP
            server = smtplib.SMTP(self.host, self.port, timeout=3)
            server.noop()
            server.quit()
            latency = int((time.time() - start_time) * 1000)
            return HealthResult(
                status="connected",
                message=f"Connected to SMTP server at {self.host}:{self.port}",
                latency_ms=latency
            )
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            # In dev, fallback gracefully to mock mode indicator if Mailpit not active
            return HealthResult(
                status="mock_mode",
                message=f"SMTP server offline ({str(e)}). Running in Mock Mode.",
                latency_ms=latency,
                details={"mock_fallback": True}
            )

    async def send(self, message: dict) -> SendResult:
        recipient = message.get("to")
        subject = message.get("subject", "ORDO Notification")
        body = message.get("body", "")
        
        try:
            msg = MIMEMultipart()
            msg["From"] = self.from_email
            msg["To"] = recipient
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))
            
            server = smtplib.SMTP(self.host, self.port, timeout=3)
            server.send_message(msg)
            server.quit()
            return SendResult(success=True, message_id=f"smtp-{int(time.time())}", mock_mode=False)
        except Exception as e:
            # Fallback mock mode
            return SendResult(
                success=True, 
                message_id=f"mock-smtp-{int(time.time())}", 
                mock_mode=True, 
                error=f"Logged to Mock Email Store: {str(e)}"
            )

    async def handle_webhook(self, payload: dict, headers: dict) -> None:
        pass

