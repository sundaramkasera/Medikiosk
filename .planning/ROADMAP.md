# MediKiosk Roadmap

## Phase 1: Foundation, Real-Time Communications & Persistence
Establish the core backbone of the application. Everything relies on the WebSocket hub for bi-directional messaging, and data persistence guarantees session tracking.
- **TK-01**: Initialize FastAPI project with Socket.IO, CORS, and the ConnectionManager. Provide basic test client.
- **TK-10**: Implement MongoDB connection in the FastAPI backend based on the schema in Section 2.3. Ensure that when a session is completed, the final structured JSON is written to the database.

## Phase 2: Kiosk Presence & Gestures (Vision)
Implement the webcam-based perceptual logic for the zero-touch kiosk.
- **TK-02**: OpenCV face detection for patient wake-up tracking.
- **TK-03**: MediaPipe touchless body mapping for mute/non-verbal interaction.

## Phase 3: Conversational Intelligence (Audio/NLP)
Build the "brain" of the kiosk's adaptive questioning.
- **TK-04**: Multi-turn adaptive clinical interview (LangChain/LLM) based on the SOCRATES framework and red-flag emergency routing.

## Phase 4: Document Intelligence (OCR & Handoff)
Handle the QR-code-based mobile handoff for uploading legacy medical records.
- **TK-05**: Mobile HTML5 upload route (`/mobile/{session_id}`).
- **TK-06**: EasyOCR and LLM extraction pipeline to parse prescriptions and lab reports into structured JSON timelines.

## Phase 5: Frontends (Kiosk & Doctor Dashboard)
Assemble the UI for patients and physicians.
- **TK-07**: Doctor Dashboard: Triage Queue column (WebSocket-connected, priority ordering).
- **TK-08**: Doctor Dashboard: Clinical Summary workspace (Markdown editable, Allopathic vs AYUSH toggles).
- **TK-09**: Doctor Dashboard: Document Intelligence timeline column (chronological OCR results, abnormal badges).
- **TK-11**: Patient-Facing Kiosk UI in React according to the 5 states defined in Section 4.2. Listens to WebSocket events to transition between Idle, Adaptive Interview, and QR Handoff states.
