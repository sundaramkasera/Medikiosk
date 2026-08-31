import os
import httpx
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Ensure environment variables are loaded
load_dotenv(dotenv_path="backend/.env")

async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Sends audio bytes to Groq's Whisper API for transcription in Hindi.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY is not set.")
        return "Transcription error: API key missing."
        
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    
    # httpx expects files in the format (filename, file_object, content_type)
    files = {
        "file": ("audio.wav", audio_bytes, "audio/wav")
    }
    
    data = {
        "model": "whisper-large-v3",
        "language": "hi"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, data=data, files=files)
            response.raise_for_status()
            result = response.json()
            return result.get("text", "")
    except Exception as e:
        logger.error(f"Failed to transcribe audio via Groq: {e}")
        return "Transcription failed."
