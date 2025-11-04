import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.app.api.v1 import api_v1_router
from backend.app.core.config import ai_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

def create_app() -> FastAPI:
    app = FastAPI(
        title="Knowledge Bank API",
        description="Modular RAG & Agentic Chatbot API",
        version="2.0.0"
    )

    # CORS Setup
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Roots
    @app.get("/", tags=["health"])
    async def root():
        return {
            "status": "online",
            "message": "Knowledge Bank API is running",
            "version": "2.0.0"
        }

    # Include modular routes
    app.include_router(api_v1_router)

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app", 
        host="0.0.0.0", 
        port=ai_settings.BACKEND_PORT,
        reload=True
    )
