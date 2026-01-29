from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_community.chat_models import ChatOllama
from backend.app.core.config import ai_settings

def get_llm():
    """Factory to get the configured LLM provider."""
    provider = ai_settings.LLM_PROVIDER.lower()
    
    if provider == "openai":
        return ChatOpenAI(
            model=ai_settings.LLM_MODEL,
            api_key=ai_settings.OPENAI_API_KEY,
            streaming=True
        )
    elif provider == "anthropic":
        return ChatAnthropic(
            model=ai_settings.LLM_MODEL,
            api_key=ai_settings.ANTHROPIC_API_KEY,
            streaming=True
        )
    elif provider == "ollama":
        return ChatOllama(
            model=ai_settings.LLM_MODEL,
            base_url=ai_settings.OLLAMA_BASE_URL
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
