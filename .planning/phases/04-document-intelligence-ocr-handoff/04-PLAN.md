---
description: "Handle the QR-code-based mobile handoff for uploading legacy medical records."
labels: ["backend", "ai"]
---
## Goal
Implement the mobile handoff HTML UI and async OCR pipeline for Document Intelligence.

## Tasks
- `[ ]` **TK-05-A**: Implement `backend/templates/mobile_upload.html` with an HTML5 form for multiple image uploads (capture/upload). Include JS to resize images before upload to save bandwidth and memory. Add a simple UI for progress.
- `[ ]` **TK-05-B**: Implement `backend/routes/mobile_routes.py` to serve the template (`GET /mobile/{session_id}`) and handle the batch image upload (`POST /api/mobile/{session_id}/upload`). Add the router to `main.py` if not already added.
- `[ ]` **TK-06-A**: Implement `backend/ai_engine/ocr_pipeline.py`. Given images, extract text using `easyocr` and pass it to a `langchain` LLM prompt to parse into a structured JSON timeline (prescriptions, lab reports).
- `[ ]` **TK-06-B**: Connect the `POST` upload route to spawn `ocr_pipeline.py` processing asynchronously using FastAPI `BackgroundTasks`. On completion, save results to MongoDB `sessions` collection.
- `[ ]` **TK-06-C**: Add `socket.io` event emission (`document_processed`) to notify the kiosk session when the background task finishes or fails.

## Dependencies
None

## Verification
1. Open `/mobile/test-session-123` in a mobile browser.
2. Select and upload 2 sample medical documents.
3. Check the FastAPI console to verify `ocr_pipeline` processes them in the background without blocking the response.
4. Verify MongoDB gets the updated session with structured timelines.
5. Verify the Socket.IO event is emitted to the kiosk.
