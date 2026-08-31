# Phase 05 Research: Frontends - Kiosk & Doctor Dashboard

## Overview
This phase implements the Doctor Dashboard and finalizes frontend integrations.

## Architecture & Data Flow
1. **Encounter Retrieval**: 
   - No existing REST endpoint was found for encounters.
   - We must build `GET /api/encounters` and `GET /api/encounters/{session_id}`.
   - We must build `PUT /api/encounters/{session_id}/finalize` to commit summary edits.

2. **Real-time Synchronization (Socket.IO)**:
   - The Kiosk uses rooms (e.g. `session_<uuid>`).
   - The Doctor Dashboard needs to listen to ALL events passively. 
   - A dedicated `doctor_dashboard` room will be created. The backend must emit `PATIENT_WAKEUP`, `AI_SPEECH_RESPONSE`, and `document_processed` to this room.

3. **React Frontend**:
   - Built with Vite, React, and Tailwind CSS.
   - **Triage Queue**: Displays list of patients, highlighting `EMERGENCY`.
   - **Clinical Summary**: Editable Markdown with AYUSH toggles.
   - **Document Timeline**: Lists OCR documents with red badges for `requires_manual_review`.
