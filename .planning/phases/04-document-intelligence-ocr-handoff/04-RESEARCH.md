# Phase 4 Research: Document Intelligence & OCR Handoff

## 1. Technical Stack & Location
- **Backend Framework**: FastAPI (Python) located in `backend/`
- **OCR Engine**: `easyocr` (already in `requirements.txt`)
- **LLM Engine**: `langchain` & `openai` (already in `requirements.txt`)
- **Mobile UI**: To keep it lightweight and separate from the Kiosk's React bundle, the mobile UI should be served directly by FastAPI using `backend/templates/mobile_upload.html`.
- **Routes**: `backend/routes/mobile_routes.py`
- **AI Logic**: `backend/ai_engine/ocr_pipeline.py`

## 2. Architecture & Data Flow
1. **QR Generation (Kiosk)**: The kiosk generates a QR code pointing to `/mobile/{session_id}`.
2. **Mobile View**: User scans the QR code. FastAPI serves `mobile_upload.html` (pure HTML/JS/CSS) which provides a UI for taking photos or selecting images.
3. **Upload**: User submits photos. The form does a `POST /api/mobile/{session_id}/upload` containing batch JPEG/PNG files.
4. **Async Processing**: 
   - The route acknowledges the upload immediately (200 OK) so the mobile user sees a success screen.
   - A background task is spawned to process the images via `ocr_pipeline.py`.
5. **OCR Pipeline**:
   - `easyocr` extracts raw text from the images.
   - `langchain` + LLM parses the raw text into structured JSON timelines (classifying prescriptions vs lab reports).
6. **Data Storage & Notification**:
   - The structured data is saved to MongoDB.
   - The backend uses `python-socketio` to emit an event (e.g., `document_processed`) to the kiosk session, prompting the kiosk to refresh and display the extracted data.
   - If LLM extraction fails or is low confidence, the pipeline flags the document for "Human-in-the-loop" review (Doctor Dashboard).

## 3. Potential Landmines
- **Image Size**: Mobile phone cameras produce huge images. The frontend (HTML5 canvas) or backend should resize/compress images before running EasyOCR to prevent memory spikes.
- **EasyOCR Performance**: EasyOCR on CPU can be slow. Asynchronous processing is absolutely required so we don't block the API thread.
- **Multipart Form Data**: FastAPI needs `python-multipart` to parse the file uploads (which is already in `requirements.txt`).
- **Batch Processing**: Ensure `ocr_pipeline.py` can handle multiple images for a single session_id and stitch the text together before sending it to the LLM.
