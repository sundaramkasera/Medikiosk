# Phase 6: Enterprise Document Intelligence Upgrade (Cloud Vision)

## Domain
Transition the local edge-OCR pipeline to an enterprise-grade cloud architecture to handle complex cursive handwriting and tabular lab reports for deployment readiness.

## Canonical Refs
- [.planning/ROADMAP.md](../../ROADMAP.md)

## Decisions

### Error Handling & Fallbacks
- **Decision:** Attempt Google Cloud Vision first. If an exception or timeout occurs, log a warning and fall back gracefully to the existing local EasyOCR pipeline so the live demo never fails.

### Data Privacy / Compliance
- **Decision:** Rely on Google Cloud's standard zero-training enterprise data agreements for prototype scope; do not add pre-OCR PII blurring.

### Key Management in Production
- **Decision:** Stick to the local `backend/gcp-vision-key.json` referenced by `GOOGLE_APPLICATION_CREDENTIALS` in `backend/.env`. Mention Secret Manager as a future production enhancement.
