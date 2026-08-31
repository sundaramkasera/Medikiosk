from fastapi import APIRouter, Request, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from typing import List
import os
import uuid
from backend.ai_engine.ocr_pipeline import process_documents

router = APIRouter()
templates = Jinja2Templates(directory="backend/templates")

@router.get("/mobile/{session_id}", response_class=HTMLResponse)
async def get_mobile_upload_page(request: Request, session_id: str):
    return templates.TemplateResponse(
        "mobile_upload.html",
        {"request": request, "session_id": session_id}
    )

@router.post("/api/mobile/{session_id}/upload")
async def upload_documents(
    session_id: str,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...)
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")
    
    # Save files to a temporary directory to be processed asynchronously
    upload_dir = f"uploads/{session_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_paths = []
    for file in files:
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}_{file.filename}")
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        file_paths.append(file_path)
    
    # Spawn background task
    background_tasks.add_task(process_documents, session_id, file_paths)
    
    return {"message": "Files uploaded successfully and processing started."}
