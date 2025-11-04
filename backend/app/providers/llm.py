from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.chat_models import ChatOllama
from backend.app.core.config import ai_settings
from backend.app.core.settings_manager import settings_manager

def get_llm():
    """Factory to get the configured LLM provider."""
    settings = settings_manager.get_settings()
    provider = settings.llm_provider.lower()
    model = settings.llm_model
    
    if provider == "openai":
        return ChatOpenAI(
            model=model,
            api_key=ai_settings.OPENAI_API_KEY,
            streaming=True
        )
    elif provider == "anthropic":
        return ChatAnthropic(
            model=model,
            api_key=ai_settings.ANTHROPIC_API_KEY,
            streaming=True
        )
    elif provider == "ollama":
        return ChatOllama(
            model=model,
            base_url=ai_settings.OLLAMA_BASE_URL
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
