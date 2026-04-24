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

    ADMIN_EMAIL: str = "admin@smarteval.com"
    ADMIN_PASSWORD: str = "Admin@123"
    ADMIN_FULL_NAME: str = "System Admin"
    ADMIN_ID_NUMBER: str = "ADMIN001"

    class Config:
        env_file = ".env"


settings = Settings()
