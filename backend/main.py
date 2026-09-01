from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
from contextlib import asynccontextmanager
import logging

from backend.config import settings
from backend.core.websocket_hub import sio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import os
from fastapi.staticfiles import StaticFiles

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGO_URI)
    app.state.mongodb_client = client
    app.state.mongodb_name = settings.DATABASE_NAME
    
    from backend.database.db import init_db
    init_db(client, settings.DATABASE_NAME)
    
    logger.info("Connected to MongoDB.")
    yield
    # Shutdown
    logger.info("Closing MongoDB connection...")
    app.state.mongodb_client.close()
    logger.info("MongoDB connection closed.")

app = FastAPI(title="MediKiosk API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import FileResponse

# Safely create the uploads directory if it doesn't exist yet
os.makedirs("uploads", exist_ok=True)

# Now mount it
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
async def root():
    return {"message": "MediKiosk API is running"}

@app.get("/test")
async def serve_test_client():
    return FileResponse("backend/test_client.html")

from backend.routes.mobile_routes import router as mobile_router
from backend.routes.encounter_routes import router as encounter_router
app.include_router(mobile_router)
app.include_router(encounter_router)
app = socketio.ASGIApp(sio, other_asgi_app=app)
