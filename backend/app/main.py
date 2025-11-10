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
    logger.info("Initializing FastAPI app...")
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
    logger.info("Including API routers...")
    app.include_router(api_v1_router)
    logger.info("API routers included.")

    @app.on_event("startup")
    async def startup_event():
        from backend.app.core.minio import minio_manager
        logger.info("Ensuring MinIO bucket exists...")
        minio_manager.ensure_bucket()
        logger.info("MinIO bucket ready.")

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app", 
        host="0.0.0.0", 
        port=ai_settings.BACKEND_PORT,
        reload=False
    )
