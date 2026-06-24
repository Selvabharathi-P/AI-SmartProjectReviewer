from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    MISTRAL_API_KEY: str
    MISTRAL_MODEL: str = "open-mistral-7b"

    SERPER_API_KEY: str = ""

    # Zoom Server-to-Server OAuth (free plan: meeting creation + webhooks work;
    # the participant Report API is paid-only and degrades gracefully).
    ZOOM_ACCOUNT_ID: str = ""
    ZOOM_CLIENT_ID: str = ""
    ZOOM_CLIENT_SECRET: str = ""
    ZOOM_WEBHOOK_SECRET_TOKEN: str = ""
    # Host the meeting is created under: "me" (account owner) or a Zoom user id / email.
    ZOOM_HOST_USER: str = "me"

    ADMIN_EMAIL: str = "admin@smarteval.com"
    ADMIN_PASSWORD: str = "Admin@123"
    ADMIN_FULL_NAME: str = "System Admin"
    ADMIN_ID_NUMBER: str = "ADMIN001"

    class Config:
        env_file = ".env"


settings = Settings()
