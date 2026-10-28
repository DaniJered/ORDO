import os

class Settings:
    PROJECT_NAME: str = "ORDO - Workflow & Evidence Verification System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ordo-dev-secret-key-32-characters-minimum-for-security-entropy!")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ordo.db")
    
    # Integrations
    MOCK_INTEGRATIONS: bool = os.getenv("MOCK_INTEGRATIONS", "true").lower() == "true"
    KILL_SWITCH_ACTIVE: bool = os.getenv("KILL_SWITCH_ACTIVE", "false").lower() == "true"
    
    # SMTP
    SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "no-reply@ordo.college")
    
    # WhatsApp
    WHATSAPP_MOCK_MODE: bool = os.getenv("WHATSAPP_MOCK_MODE", "true").lower() == "true"
    WHATSAPP_API_TOKEN: str = os.getenv("WHATSAPP_API_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    
    # AI Provider
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "mock")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")

settings = Settings()
