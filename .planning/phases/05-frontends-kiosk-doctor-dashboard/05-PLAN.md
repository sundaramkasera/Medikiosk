---
status: EXECUTED
---
# Phase 05 Plan: Frontends - Kiosk & Doctor Dashboard

## 1. Backend REST Endpoints
- Create `backend/routes/encounter_routes.py` with endpoints:
  - `GET /api/encounters`: Fetch all active encounters.
  - `GET /api/encounters/{session_id}`: Fetch details for a specific encounter.
  - `PUT /api/encounters/{session_id}/finalize`: Endpoint to commit summary edits.
- Update `backend/main.py` to include the router.
- Update `backend/database/db.py` with `get_encounters()`, `get_encounter(session_id)`, and `finalize_encounter(session_id, summary_text)` using `$set` operator.

## 2. WebSocket Hub Optimization
- Modify `backend/core/websocket_hub.py` to emit `PATIENT_WAKEUP`, `AI_SPEECH_RESPONSE`, and `document_processed` to a specific `doctor_dashboard` room so the React dashboard can listen passively.
- Modify `backend/ai_engine/ocr_pipeline.py` to emit `document_processed` to `doctor_dashboard`.

## 3. Doctor Dashboard Frontend
- Scaffold React + Tailwind application in `doctor_dashboard`.
- Create `App.jsx` as a 3-panel layout.
- Create `TriageQueue.jsx` (left sidebar): Lists patients, highlights EMERGENCY.
- Create `ClinicalSummary.jsx` (center): Editable Markdown textarea, AYUSH toggle, Finalize button.
- Create `DocumentTimeline.jsx` (right sidebar): Chronological list of OCR documents, red badges for `requires_manual_review`.
