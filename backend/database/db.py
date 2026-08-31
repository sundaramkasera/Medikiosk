from motor.motor_asyncio import AsyncIOMotorClient
from .models import PatientEncounter, DocumentIntelligence
import logging

logger = logging.getLogger(__name__)

# Global reference for Socket.IO handlers
_db = None

def init_db(client: AsyncIOMotorClient, db_name: str):
    global _db
    _db = client[db_name]

async def save_encounter(encounter: PatientEncounter):
    if _db is None:
        logger.error("Database not initialized")
        return
    encounter_dict = encounter.model_dump(mode='json')
    try:
        await _db.encounters.insert_one(encounter_dict)
        logger.info(f"Saved encounter {encounter.session_id} to MongoDB.")
    except Exception as e:
        logger.error(f"Error saving encounter to MongoDB: {e}")

async def update_encounter_socrates(session_id: str, socrates_data: dict):
    if _db is None:
        logger.error("Database not initialized")
        return
    
    update_fields = {}
    for key in ['socrates_site', 'socrates_onset', 'socrates_character', 
                'socrates_radiation', 'socrates_associations', 'socrates_time_course', 
                'socrates_exacerbating', 'socrates_severity', 'triage_level', 'patient_language']:
        if key in socrates_data and socrates_data[key]:
            update_fields[key] = socrates_data[key]
            
    if update_fields:
        try:
            await _db.encounters.update_one(
                {"session_id": session_id},
                {"$set": update_fields}
            )
            logger.info(f"Updated encounter {session_id} with SOCRATES data.")
        except Exception as e:
            logger.error(f"Error updating encounter {session_id}: {e}")

async def add_document_intelligence(session_id: str, doc_intelligence: DocumentIntelligence):
    if _db is None:
        logger.error("Database not initialized")
        return
    try:
        await _db.encounters.update_one(
            {"session_id": session_id},
            {"$push": {"document_intelligence": doc_intelligence.model_dump(mode='json')}},
            upsert=True
        )
        logger.info(f"Added document intelligence for session {session_id}")
    except Exception as e:
        logger.error(f"Error adding document intelligence: {e}")

async def get_encounters():
    if _db is None:
        logger.error("Database not initialized")
        return []
    try:
        # Sort by creation time descending (we can also sort by triage level later if needed)
        cursor = _db.encounters.find({}, {"_id": 0}).sort("created_at", -1)
        return await cursor.to_list(length=100)
    except Exception as e:
        logger.error(f"Error fetching encounters: {e}")
        return []

async def get_encounter(session_id: str):
    if _db is None:
        logger.error("Database not initialized")
        return None
    try:
        return await _db.encounters.find_one({"session_id": session_id}, {"_id": 0})
    except Exception as e:
        logger.error(f"Error fetching encounter {session_id}: {e}")
        return None

async def finalize_encounter(session_id: str, summary_text: str):
    if _db is None:
        logger.error("Database not initialized")
        return False
    try:
        await _db.encounters.update_one(
            {"session_id": session_id},
            {"$set": {"final_summary": summary_text, "status": "FINALIZED"}}
        )
        logger.info(f"Finalized encounter {session_id}")
        return True
    except Exception as e:
        logger.error(f"Error finalizing encounter {session_id}: {e}")
        return False

async def append_to_transcript(session_id: str, role: str, text: str):
    if _db is None:
        logger.error("Database not initialized")
        return
    try:
        await _db.encounters.update_one(
            {"session_id": session_id},
            {"$push": {"clinical_interview.raw_transcript": {"role": role, "content": text}}}
        )
        logger.info(f"Appended {role} message to transcript for {session_id}")
    except Exception as e:
        logger.error(f"Error appending to transcript for {session_id}: {e}")
