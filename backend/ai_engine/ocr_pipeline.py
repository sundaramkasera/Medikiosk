import asyncio
import logging
import uuid
import os
import easyocr
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

from backend.database.models import DocumentIntelligence, ExtractedEntities, Medication, Investigation
from backend.database.db import add_document_intelligence
from backend.core.websocket_hub import sio

logger = logging.getLogger(__name__)

# Load reader globally or lazily? Lazily is safer for startup time, but global is faster for repeated requests.
# To prevent blocking the main thread on startup, we'll initialize it lazily in a thread.
_reader = None

def get_reader():
    global _reader
    if _reader is None:
        logger.info("Initializing EasyOCR reader...")
        _reader = easyocr.Reader(['en'])
        logger.info("EasyOCR initialized.")
    return _reader

def run_easyocr(file_paths: List[str]) -> str:
    """Runs EasyOCR synchronously. Should be called via asyncio.to_thread."""
    reader = get_reader()
    full_text = ""
    for path in file_paths:
        try:
            results = reader.readtext(path, detail=0)
            page_text = " ".join(results)
            if full_text:
                full_text += "\n--- NEW IMAGE BLOCK ---\n"
            full_text += page_text
        except Exception as e:
            logger.error(f"Error OCRing {path}: {e}")
    return full_text

# Define a strict output schema for Langchain
class OCRLLMOutput(BaseModel):
    document_type: str = Field(description="Type of document, e.g., 'prescription', 'lab_report', 'discharge_summary', 'unknown'")
    date: str = Field(description="Date found on document, or null", default=None)
    diagnoses: List[str] = Field(description="List of extracted diagnoses", default_factory=list)
    medications: List[dict] = Field(description="List of medications with name, dosage, frequency", default_factory=list)
    investigations: List[dict] = Field(description="List of lab investigations with test, value, unit", default_factory=list)
    requires_manual_review: bool = Field(description="Set to true if text is illegible, confidence is low, or it looks like garbled text. False otherwise.")

async def process_documents(session_id: str, file_paths: List[str]):
    try:
        logger.info(f"[{session_id}] Starting background OCR process for {len(file_paths)} images.")
        
        # 1. OCR Extraction (CPU bound, run in thread pool to not block asyncio loop)
        raw_text = await asyncio.to_thread(run_easyocr, file_paths)
        logger.info(f"[{session_id}] OCR complete. Extracted {len(raw_text)} chars.")
        
        if not raw_text.strip():
            logger.warning(f"[{session_id}] No text extracted from images.")
            raw_text = "NO TEXT DETECTED."

        # 2. LLM Parsing
        import os
        from dotenv import load_dotenv
        from langchain_openai import ChatOpenAI
        
        # Force Python to read the .env file located in the backend folder
        load_dotenv(dotenv_path="backend/.env")
        
        llm = ChatOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
            model="openai/gpt-oss-120b",
            temperature=0
        )
        parser = JsonOutputParser(pydantic_object=OCRLLMOutput)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a medical document extraction AI. Extract structured data from the OCR text. If the text is mostly garbage, low confidence, or missing key information, set requires_manual_review to true. Ensure strict JSON output following the schema.\n{format_instructions}"),
            ("user", "OCR Text:\n{text}")
        ])
        
        chain = prompt | llm | parser
        
        logger.info(f"[{session_id}] Sending text to LLM for structuring...")
        result = await chain.ainvoke({
            "text": raw_text,
            "format_instructions": parser.get_format_instructions()
        })
        
        # 3. Build Model
        meds = [Medication(**m) for m in result.get('medications', [])]
        invs = [Investigation(**i) for i in result.get('investigations', [])]
        
        # Create public image URLs for the frontend by normalizing slashes and prepending /
        image_urls = ["/" + path.replace("\\", "/") for path in file_paths]

        doc_intel = DocumentIntelligence(
            document_id=str(uuid.uuid4()),
            document_type=result.get('document_type', 'unknown'),
            date=result.get('date'),
            extracted_entities=ExtractedEntities(
                diagnoses=result.get('diagnoses', []),
                medications=meds,
                investigations=invs
            ),
            requires_manual_review=result.get('requires_manual_review', False),
            raw_text=raw_text,
            image_urls=image_urls
        )
        
        # 4. Save to DB
        await add_document_intelligence(session_id, doc_intel)
        
        # 5. Emit Socket.IO Event (async emit works because we are in an async def in the main loop)
        logger.info(f"[{session_id}] Emitting document_processed event.")
        await sio.emit('document_processed', {
            "session_id": session_id,
            "document": doc_intel.model_dump(mode='json')
        }, to=session_id)
        
        await sio.emit('document_processed', {
            "session_id": session_id,
            "document": doc_intel.model_dump(mode='json')
        }, room='doctor_dashboard')
        
    except Exception as e:
        logger.error(f"[{session_id}] Error in process_documents: {e}")
        # Emit error
        await sio.emit('document_processed', {
            "session_id": session_id,
            "error": str(e)
        }, to=session_id)
        await sio.emit('document_processed', {
            "session_id": session_id,
            "error": str(e)
        }, room='doctor_dashboard')
    finally:
        pass
        # Kept files on disk for dashboard viewing

