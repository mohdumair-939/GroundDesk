"""Application settings, read from environment variables or backend/.env."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    app_name: str = "Smart Help Desk API"
    database_url: str = ""
    cors_origins: str = "http://localhost:5173"

    # LLM: "gemini", "groq" or "mock". If the primary provider fails and the other key is set,
    # llm_client falls back to it. "mock" builds answers from the retrieved text, no API needed.
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    groq_api_key: str = ""
    gemini_llm_model: str = "gemini-3.8-flash"
    groq_llm_model: str = "openai/gpt-oss-120b"

    # Embeddings: "gemini" or "mock". The KB must be re-ingested after changing this.
    embedding_provider: str = "gemini"
    gemini_embedding_model: str = "gemini-embedding-001"

    # Retrieval
    kb_dir: Path = BACKEND_DIR.parent / "kb"
    retrieval_top_k: int = 4
    # Best cosine similarity below this means "no reliable solution" (insufficient-context guard).
    similarity_threshold: float = 0.70
    # Confidence: High at threshold + 0.06 or more, Medium at + 0.03, otherwise Low.
    confidence_high_margin: float = 0.06
    confidence_medium_margin: float = 0.03

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlalchemy_database_url(self) -> str:
        """Neon/Supabase give 'postgresql://' URLs; SQLAlchemy needs the psycopg driver name."""
        url = self.database_url.strip()
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url


settings = Settings()
