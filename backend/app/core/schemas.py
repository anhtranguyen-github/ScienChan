from pydantic import BaseModel, Field
from typing import Optional, Literal

class AppSettings(BaseModel):
    # LLM Settings
    llm_provider: str = Field(default="openai", description="LLM Provider (openai, anthropic, ollama)")
    llm_model: str = Field(default="gpt-4o", description="Model name")
    
    # Embedding Settings
    embedding_provider: str = Field(default="openai", description="Embedding Provider (openai, voyage, local)")
    embedding_model: str = Field(default="text-embedding-3-small", description="Embedding model name")
    
    # Retrieval Settings
    retrieval_mode: Literal["hybrid", "vector", "keyword"] = Field(default="hybrid", description="Search strategy")
    search_limit: int = Field(default=5, ge=1, le=20, description="Top-K results")
    hybrid_alpha: float = Field(default=0.5, ge=0.0, le=1.0, description="Weight between vector and keyword")
    
    # RAG Config (Fixed at workspace creation for consistency)
    chunk_size: int = Field(default=800, ge=100, le=2000)
    chunk_overlap: int = Field(default=150, ge=0, le=500)
    embedding_dim: int = Field(default=1536, description="Fixed dimension for vector consistency")
    
    # UI/System Settings
    theme: str = Field(default="dark", description="App theme")
    show_reasoning: bool = Field(default=True, description="Toggle reasoning steps visibility")

class DocumentMetadata(BaseModel):
    id: str
    workspace_id: str
    filename: str
    extension: str
    minio_path: str
    status: Literal["uploaded", "indexing", "indexed", "failed"] = "uploaded"
    current_version: int = 1
    content_hash: str
    chunks: int = 0
    size_bytes: int = 0
    created_at: str
    updated_at: str
    shared_with: list[str] = []
