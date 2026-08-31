from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class PatientDemographics(BaseModel):
    age_group: Optional[str] = None
    gender: Optional[str] = None
    language: Optional[str] = "hi"

class SocratesData(BaseModel):
    site: Optional[str] = None
    onset: Optional[str] = None
    character: Optional[str] = None
    radiation: Optional[str] = None
    associations: Optional[str] = None
    timing: Optional[str] = None
    exacerbating_factors: Optional[str] = None
    severity: Optional[int] = Field(None, ge=1, le=10)

class ClinicalInterview(BaseModel):
    chief_complaint: Optional[str] = None
    socrates_data: Optional[SocratesData] = None
    raw_transcript: List[dict] = []

class Medication(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None

class Investigation(BaseModel):
    test: str
    value: str
    unit: Optional[str] = None
    is_abnormal: bool = False

class ExtractedEntities(BaseModel):
    diagnoses: List[str] = []
    medications: List[Medication] = []
    investigations: List[Investigation] = []

class DocumentIntelligence(BaseModel):
    document_id: str
    document_type: str
    date: Optional[str] = None
    extracted_entities: ExtractedEntities
    requires_manual_review: bool = False
    raw_text: Optional[str] = None
    image_urls: List[str] = []


class AyushSummary(BaseModel):
    prakriti: Optional[str] = None
    vikriti: Optional[str] = None
    agni: Optional[str] = None
    koshtha: Optional[str] = None
    ahara_vihara: Optional[str] = None

class SynthesizedSummaries(BaseModel):
    allopathic_summary: Optional[str] = None
    ayush_summary: Optional[AyushSummary] = None

class PhysicianReview(BaseModel):
    is_verified: bool = False
    doctor_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None

class PatientEncounter(BaseModel):
    session_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    triage_status: str = "NORMAL"
    patient_demographics: PatientDemographics = PatientDemographics()
    clinical_interview: ClinicalInterview = ClinicalInterview()
    document_intelligence: List[DocumentIntelligence] = []
    synthesized_summaries: SynthesizedSummaries = SynthesizedSummaries()
    physician_review: PhysicianReview = PhysicianReview()
