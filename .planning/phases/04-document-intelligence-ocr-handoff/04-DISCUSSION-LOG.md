# Phase 4 Discussion Log

## 1. QR Handoff & Authentication
**Options presented:**
- Just a URL with a random session UUID (easiest UX)
- URL with Session UUID + a short 4-digit PIN displayed on the kiosk (more secure)
- Other

**User selected:**
- Just a URL with a random session UUID (easiest UX)

## 2. OCR Processing Pipeline
**Options presented:**
- Synchronous: The phone waits for extraction to finish before showing a success screen.
- Asynchronous: The phone uploads and immediately shows success; kiosk updates dynamically as processing completes.
- Other

**User selected:**
- Asynchronous: The phone uploads and immediately shows success; kiosk updates dynamically as processing completes.

## 3. Image Formats
**Options presented:**
- Camera images only (JPEG/PNG) — easier UX and simpler processing.
- Images AND PDFs — allows users to upload digital lab reports directly.
- Other

**User selected:**
- Multiple camera images at once (Batch JPEG/PNG uploads) — allows users to capture multi-page prescriptions or front-and-back IDs without the backend complexity of PDF processing.

## 4. LLM Extraction Failures
**Options presented:**
- Human-in-the-loop: Send the raw image to the Doctor Dashboard and let the doctor manually review it.
- Prompt retry: Notify the kiosk/phone that extraction failed and ask them to retake the photo.
- Silent fail: Ignore it and rely only on the conversation.
- Other

**User selected:**
- Human-in-the-loop: Send the raw image to the Doctor Dashboard and let the doctor manually review it.
