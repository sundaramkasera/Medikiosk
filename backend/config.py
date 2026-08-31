import os
from typing import List

class Settings:
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "medikiosk")
    CORS_ORIGINS: List[str] = ["*"]

settings = Settings()
