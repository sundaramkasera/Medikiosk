from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.database.db import get_encounters, get_encounter, finalize_encounter
from pydantic import BaseModel

router = APIRouter()

class FinalizePayload(BaseModel):
    summary_text: str

@router.get("/api/encounters")
async def list_encounters():
    encounters = await get_encounters()
    # Sort EMERGENCY to the top
    def sort_key(e):
        triage = e.get("triage_level", "NORMAL").upper()
        return 0 if triage == "EMERGENCY" else 1
        
    encounters.sort(key=sort_key)
    return encounters

@router.get("/api/encounters/{session_id}")
async def get_encounter_details(session_id: str):
    encounter = await get_encounter(session_id)
    if not encounter:
        raise HTTPException(status_code=404, detail="Encounter not found")
    return encounter

@router.put("/api/encounters/{session_id}/finalize")
async def commit_encounter_summary(session_id: str, payload: FinalizePayload):
    success = await finalize_encounter(session_id, payload.summary_text)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to finalize encounter")
    return {"message": "Encounter finalized successfully"}
