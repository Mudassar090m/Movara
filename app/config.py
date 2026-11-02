from pydantic_settings import BaseSettings, SettingsConfigDict
import os


_PLACEHOLDER = "change-me-generate-a-random-secret"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = (
        "postgresql+psycopg://studymate_user:studymate_pass@localhost:5432/studymate"
    )

    # JWT / auth.
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Ollama (local LLM) settings.
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_request_timeout: int = 300

    # File uploads.
    upload_dir: str = ""  # resolved to absolute path in __init__
    max_upload_bytes: int = 10485760  # 10 MB

    def __init__(self, **data):
        super().__init__(**data)
        # Reject placeholder / short keys so JWTs can't be forged in production.
        if self.secret_key == _PLACEHOLDER or len(self.secret_key) < 32:
            raise ValueError(
                "SECRET_KEY is insecure. Generate one with: "
                "python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        # Make upload_dir absolute so it doesn't depend on cwd.
        if not self.upload_dir:
            self.upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
        if not os.path.isabs(self.upload_dir):
            self.upload_dir = os.path.abspath(self.upload_dir)


settings = Settings()
