# Phase 4: Document Intelligence (OCR & Handoff)

## Domain
Handle the QR-code-based mobile handoff for uploading legacy medical records.

## Canonical Refs
- [.planning/ROADMAP.md](../../ROADMAP.md)

## Decisions

### QR Handoff & Authentication
- **Decision:** Just a URL with a random session UUID (easiest UX).

### OCR Processing Pipeline
- **Decision:** Asynchronous: The phone uploads and immediately shows success; kiosk updates dynamically as processing completes.

### Image Formats
- **Decision:** Multiple camera images at once (Batch JPEG/PNG uploads) — allows users to capture multi-page prescriptions or front-and-back IDs without the backend complexity of PDF processing.

### LLM Extraction Failures
- **Decision:** Human-in-the-loop: Send the raw image to the Doctor Dashboard and let the doctor manually review it.
