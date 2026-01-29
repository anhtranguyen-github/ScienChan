import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.core.schemas import AppSettings
from backend.app.core.config import ai_settings

logger = logging.getLogger(__name__)

class SettingsManager:
    def __init__(self, config_path: str = "backend/data/settings.json"):
        self.config_path = Path(config_path)
        self._settings: AppSettings = self._load_initial_settings()

    def _load_initial_settings(self) -> AppSettings:
        """Load settings from JSON, falling back to environment variables."""
        if self.config_path.exists():
            try:
                with open(self.config_path, "r") as f:
                    data = json.load(f)
                    return AppSettings(**data)
            except Exception as e:
                logger.error(f"Error loading settings.json: {e}")
        
        # Fallback to env vars from AISettings
        return AppSettings(
            llm_provider=ai_settings.LLM_PROVIDER,
            llm_model=ai_settings.LLM_MODEL,
            embedding_provider=ai_settings.EMBEDDING_PROVIDER,
            embedding_model=ai_settings.EMBEDDING_MODEL,
        )

    def get_settings(self) -> AppSettings:
        return self._settings

    def update_settings(self, updates: Dict[str, Any]) -> AppSettings:
        """Update settings and persist to disk."""
        current_data = self._settings.model_dump()
        current_data.update(updates)
        
        # Validate with Pydantic
        self._settings = AppSettings(**current_data)
        
        # Save to disk
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_path, "w") as f:
            json.dump(self._settings.model_dump(), f, indent=4)
            
        logger.info(f"Settings updated: {updates.keys()}")
        return self._settings

# Global singleton
settings_manager = SettingsManager()
