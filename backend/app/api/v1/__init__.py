from backend.app.api.v1 import chat, documents, workspaces, settings, tools, search

api_v1_router = APIRouter()

api_v1_router.include_router(chat.router)
api_v1_router.include_router(documents.router)
api_v1_router.include_router(workspaces.router)
api_v1_router.include_router(settings.router)
api_v1_router.include_router(tools.router)
api_v1_router.include_router(search.router)
