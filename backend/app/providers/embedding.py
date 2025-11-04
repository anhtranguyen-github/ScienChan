from langchain_openai import OpenAIEmbeddings
from langchain_voyageai import VoyageAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from backend.app.core.config import ai_settings
from backend.app.core.settings_manager import settings_manager

def get_embeddings():
    """Factory to get the configured Embedding provider."""
    settings = settings_manager.get_settings()
    provider = settings.embedding_provider.lower()
    model = settings.embedding_model
    
    if provider == "openai":
        return OpenAIEmbeddings(
            model=model,
            api_key=ai_settings.OPENAI_API_KEY
        )
    elif provider == "voyage":
        return VoyageAIEmbeddings(
            model=model,
            voyage_api_key=ai_settings.VOYAGE_API_KEY
        )
    elif provider == "local":
        return HuggingFaceEmbeddings(
            model_name=model
        )
    else:
        raise ValueError(f"Unsupported Embedding provider: {provider}")
