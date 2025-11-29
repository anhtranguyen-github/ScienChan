import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.core.schemas import AppSettings
from backend.app.core.config import ai_settings
from backend.app.core.mongodb import mongodb_manager

logger = logging.getLogger(__name__)

class SettingsManager:
    def __init__(self, config_path: str = "backend/data/settings.json"):
        self.config_path = Path(config_path)
        self._global_settings: AppSettings = self._load_initial_settings()
        # Ensure fallback file exists
        if not self.config_path.exists():
            self._save_global_settings()

    def _save_global_settings(self):
        """Save global settings to disk."""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w") as f:
                json.dump(self._global_settings.model_dump(), f, indent=4)
        except Exception as e:
            logger.error(f"Error saving global settings: {e}")

    def _load_initial_settings(self) -> AppSettings:
        """Load global settings from JSON, falling back to environment variables."""
        if self.config_path.exists():
            try:
                with open(self.config_path, "r") as f:
                    data = json.load(f)
                    return AppSettings(**data)
            except Exception as e:
                logger.error(f"Error loading settings.json: {e}")
        
        return AppSettings(
            llm_provider=ai_settings.LLM_PROVIDER,
            llm_model=ai_settings.LLM_MODEL,
            embedding_provider=ai_settings.EMBEDDING_PROVIDER,
            embedding_model=ai_settings.EMBEDDING_MODEL,
        )

    def get_global_settings(self) -> AppSettings:
        return self._global_settings

    async def get_settings(self, workspace_id: Optional[str] = None) -> AppSettings:
        """Get settings for a specific workspace, falling back to global settings."""
        if not workspace_id or workspace_id == "default":
            return self._global_settings

        try:
            db = mongodb_manager.get_async_database()
            # We store workspace settings in a separate collection or inside the workspace doc
            # Let's use a 'workspace_settings' collection for better isolation
            ws_settings_doc = await db["workspace_settings"].find_one({"workspace_id": workspace_id})
            
            if not ws_settings_doc:
                return self._global_settings

            # Merge workspace settings over global ones
            merged_data = self._global_settings.model_dump()
            # Remove mongo _id and workspace_id from doc before merging
            override_data = {k: v for k, v in ws_settings_doc.items() if k not in ["_id", "workspace_id"]}
            merged_data.update(override_data)
            
            return AppSettings(**merged_data)
        except Exception as e:
            logger.error(f"Error fetching settings for workspace {workspace_id}: {e}")
            return self._global_settings

    async def update_settings(self, updates: Dict[str, Any], workspace_id: Optional[str] = None) -> AppSettings:
        """Update settings for a workspace or global."""
        if not workspace_id or workspace_id == "default":
            current_data = self._global_settings.model_dump()
            current_data.update(updates)
            self._global_settings = AppSettings(**current_data)
            
            # Save to disk
            self._save_global_settings()
            return self._global_settings
        else:
            # Update in MongoDB
            db = mongodb_manager.get_async_database()
            await db["workspace_settings"].update_one(
                {"workspace_id": workspace_id},
                {"$set": updates},
                upsert=True
            )
            return await self.get_settings(workspace_id)

# Global singleton
settings_manager = SettingsManager()
