from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class AISettings(BaseSettings):
    # LLM Configuration
    LLM_PROVIDER: str = "openai"  # openai, anthropic, ollama
    LLM_MODEL: str = "gpt-4o"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    BACKEND_PORT: int = 8000
    
    # Embedding Configuration
    EMBEDDING_PROVIDER: str = "openai"  # openai, voyage, local
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    VOYAGE_API_KEY: Optional[str] = None
    LOCAL_EMBEDDING_MODEL: str = "BAAI/bge-large-en-v1.5"
    
    # RAG Configuration
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    HYBRID_SEARCH_ALPHA: float = 0.5  # Balance between vector and keyword
    
    # MongoDB Configuration
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "ai_architect"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="allow"
    )

ai_settings = AISettings()
