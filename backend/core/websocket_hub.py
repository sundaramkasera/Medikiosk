import socketio
import datetime
import logging

logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:8000",   # Let the FastAPI server talk to itself
    "http://127.0.0.1:8000",
    "http://localhost:3000",   
    "http://127.0.0.1:3000",
    "http://localhost:5173",   # For the upcoming React dashboard
    "http://127.0.0.1:5173"
]

# 2. Configure the AsyncServer strictly
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,          # Enables debug logs to see exactly what is failing
    engineio_logger=True  # Enables deep Engine.IO transport logs
)

def create_envelope(event_type: str, session_id: str, payload: dict) -> dict:
    return {
        "event_type": event_type,
        "session_id": session_id,
        "payload": payload,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.on('join_room_event')
async def handle_join(sid, data):
    """
    Dedicated handler for joining rooms to ensure Socket.IO 
    registers the native room connection correctly.
    """
    room_id = data.get('room_id')
    role = data.get('role', 'unknown')
    
    if room_id:
        sio.enter_room(sid, room_id)
        logger.info(f"Socket {sid} ({role}) officially entered Socket.IO room: {room_id}")
        await sio.emit('system_alert', {'message': f'Joined room {room_id}'}, to=sid)

@sio.on('*')
async def catch_all(event, sid, data):
    """
    Universal event catcher using Global Broadcast.
    Bypasses room filters to guarantee delivery to all dashboards.
    """
    if event == 'join_room_event':
        return
        
    if event == 'PATIENT_WAKEUP':
        from backend.database.models import PatientEncounter
        from backend.database.db import save_encounter
        import base64
        
        room_id = data.get('room_id')
        
        # --- FOOLPROOF ROOM JOIN ---
        if room_id:
            sio.enter_room(sid, room_id)
            logger.info(f"✅ Forced client {sid} into room {room_id} during WAKEUP")
        # ---------------------------
        session_id = data.get('session_id', room_id.replace('session_', '') if room_id else '')
        if session_id:
            encounter = PatientEncounter(session_id=session_id)
            await save_encounter(encounter)
            logger.info(f"Created new PatientEncounter for {session_id}")
            
            # Proactive Greeting
            greeting_text = "नमस्ते! आप कैसे महसूस कर रहे हैं?"
            
            envelope = create_envelope('AI_SPEECH_RESPONSE', session_id, {
                'text': greeting_text
            })
            
            # Create wakeup envelope
            wakeup_envelope = create_envelope('PATIENT_WAKEUP', session_id, encounter.model_dump(mode='json'))
            
            if room_id:
                await sio.emit('AI_SPEECH_RESPONSE', envelope, to=sid)
                await sio.emit('AI_SPEECH_RESPONSE', envelope, room='doctor_dashboard')
                await sio.emit('PATIENT_WAKEUP', wakeup_envelope, room='doctor_dashboard')
                logger.info(f"Emitted proactive greeting and PATIENT_WAKEUP to doctor_dashboard")

    if event == 'PATIENT_SPEECH_AUDIO':
        from backend.ai_engine.speech_client import transcribe_audio
        from backend.ai.interview_agent import interview_graph
        from backend.database.db import update_encounter_socrates, append_to_transcript
        import base64
        
        room_id = data.get('room_id')
        session_id = data.get('session_id') or (room_id.replace('session_', '') if room_id else '')
        payload = data.get('payload', {})
        audio_b64 = payload.get('audio_b64', '')
        
        if audio_b64 and room_id:
            audio_bytes = base64.b64decode(audio_b64)
            # STT
            transcript = await transcribe_audio(audio_bytes)
            
            # Save patient transcript to db
            await append_to_transcript(session_id, "user", transcript)
            
            # LangGraph
            initial_state = {
                "session_id": session_id,
                "patient_language": "hi",
                "dialogue_history": [],
                "triage_level": "NORMAL",
                "current_input": transcript
            }
            result = await interview_graph.ainvoke(initial_state)
            
            # Persist incrementally
            await update_encounter_socrates(session_id, result)
            
            # Save AI response to db
            ai_text = result.get("next_question_translated", "")
            if ai_text:
                await append_to_transcript(session_id, "assistant", ai_text)
            
            # Omit audio_b64 to trigger frontend native window.speechSynthesis
            envelope = create_envelope('AI_SPEECH_RESPONSE', session_id, {
                'patient_transcript': transcript,
                'text': ai_text,
                'triage_level': result.get("triage_level")
            })
            await sio.emit('AI_SPEECH_RESPONSE', envelope, to=sid)
            await sio.emit('AI_SPEECH_RESPONSE', envelope, room='doctor_dashboard')
            logger.info(f"Emitted AI response to {room_id} and doctor_dashboard")
            
            # Emit triage_update if EMERGENCY
            if result.get("triage_level") == "EMERGENCY":
                triage_env = create_envelope('triage_update', session_id, {'triage_level': 'EMERGENCY'})
                await sio.emit('triage_update', triage_env, room='doctor_dashboard')
                logger.info(f"Emitted triage_update to doctor_dashboard")
                
                # Trigger the background summarizer 
                from backend.ai.interview_agent import run_emergency_summarizer
                import asyncio
                asyncio.create_task(run_emergency_summarizer(session_id))

    if isinstance(data, dict):
        room_id = data.get('room_id')
        session_id = data.get('session_id') or (room_id.replace('session_', '') if room_id else '')
        payload = data.get('payload', data)
        
        # We need to ensure that global events are emitted to doctor_dashboard room
        envelope = create_envelope(event, session_id, payload)
        
        # Emit to doctor_dashboard
        if event in ['PATIENT_WAKEUP', 'AI_SPEECH_RESPONSE', 'document_processed']:
            await sio.emit(event, envelope, room='doctor_dashboard')
            logger.info(f"Emitted {event} to doctor_dashboard room")
            
        # Prevent rebroadcasting the ones we handled exclusively for the specific kiosk room
        if room_id and event not in ['PATIENT_WAKEUP', 'PATIENT_SPEECH_AUDIO']:
            logger.info(f"Global Broadcast of '{event}'")
            await sio.emit(event, envelope)