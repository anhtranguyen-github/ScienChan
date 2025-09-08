from langchain_openai import OpenAIEmbeddings
from langchain_voyageai import VoyageAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from backend.app.core.config import ai_settings

def get_embeddings():
    """Factory to get the configured Embedding provider."""
    provider = ai_settings.EMBEDDING_PROVIDER.lower()
    
    if provider == "openai":
        return OpenAIEmbeddings(
            model=ai_settings.EMBEDDING_MODEL,
            api_key=ai_settings.OPENAI_API_KEY
        )
    elif provider == "voyage":
        return VoyageAIEmbeddings(
            model=ai_settings.EMBEDDING_MODEL,
            voyage_api_key=ai_settings.VOYAGE_API_KEY
        )
    elif provider == "local":
        return HuggingFaceEmbeddings(
            model_name=ai_settings.LOCAL_EMBEDDING_MODEL
        )
    else:
        raise ValueError(f"Unsupported Embedding provider: {provider}")
