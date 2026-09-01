import logging
import asyncio
import os
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

async def run_emergency_summarizer(session_id: str):
    """
    Background task to summarize partial transcript into SOCRATES data when emergency halts interview.
    Instructs the LLM to read the bilingual raw_transcript and output the final structured Markdown summary in English for the Doctor Dashboard.
    """
    from backend.database.db import get_encounter, update_encounter_socrates
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    from pydantic import BaseModel, Field
    
    logger.info(f"Starting background SOCRATES summarization for EMERGENCY session {session_id}")
    
    encounter = await get_encounter(session_id)
    if not encounter:
        logger.error(f"Cannot summarize, encounter {session_id} not found")
        return
        
    transcript = encounter.get("clinical_interview", {}).get("raw_transcript", [])
    if not transcript:
        logger.warning(f"No raw transcript found to summarize for {session_id}")
        return
        
    full_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in transcript if isinstance(msg, dict)])
    
    load_dotenv(dotenv_path="backend/.env")
    
    class SocratesOutput(BaseModel):
        socrates_site: str = Field(description="The identified site of pain in English, or 'Unknown'", default="Unknown")
        socrates_onset: str = Field(description="The identified onset of pain in English, or 'Unknown'", default="Unknown")
        socrates_character: str = Field(description="The identified character of pain in English, or 'Unknown'", default="Unknown")
        socrates_severity: str = Field(description="The identified severity of pain in English, or 'Unknown'", default="Unknown")

    llm = ChatOpenAI(
        api_key=os.environ.get("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
        model="openai/gpt-oss-120b",
        temperature=0
    )
    
    parser = JsonOutputParser(pydantic_object=SocratesOutput)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a clinical summarizer. Read the following bilingual (Hindi/English) transcript and extract the SOCRATES parameters in English. Ensure your output is strict JSON.\n{format_instructions}"),
        ("user", "Transcript:\n{text}")
    ])
    
    chain = prompt | llm | parser
    
    try:
        result = await chain.ainvoke({
            "text": full_text,
            "format_instructions": parser.get_format_instructions()
        })
        await update_encounter_socrates(session_id, result)
        logger.info(f"Completed emergency SOCRATES summarization for {session_id}")
    except Exception as e:
        logger.error(f"Failed to summarize emergency for {session_id}: {e}")

from typing import TypedDict, Annotated, Optional
import operator
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

class InterviewState(TypedDict, total=False):
    session_id: str
    patient_language: str
    dialogue_history: list
    triage_level: str
    current_input: str
    socrates_site: Optional[str]
    socrates_onset: Optional[str]
    socrates_character: Optional[str]
    socrates_severity: Optional[str]
    next_question_translated: str
    is_complete: bool

async def interview_node(state: InterviewState):
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    from pydantic import BaseModel, Field

    load_dotenv(dotenv_path="backend/.env")

    class NextQuestionOutput(BaseModel):
        next_question_translated: str = Field(description="The next question to ask the patient, in clear empathetic Hindi. If all SOCRATES data is collected, say a brief thank you and indicate completion.")
        triage_level: str = Field(description="Either 'NORMAL' or 'EMERGENCY'")
        socrates_site: str = Field(description="The identified site of pain in English, or null")
        socrates_onset: str = Field(description="The identified onset of pain in English, or null")
        socrates_character: str = Field(description="The identified character of pain in English, or null")
        socrates_severity: str = Field(description="The identified severity of pain (e.g. 9/10) in English, or null")
        is_complete: bool = Field(description="Set to true ONLY if site, onset, character, and severity are all known.")

    llm = ChatOpenAI(
        api_key=os.environ.get("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
        model="openai/gpt-oss-120b",
        temperature=0.3
    )
    
    parser = JsonOutputParser(pydantic_object=NextQuestionOutput)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a clinical intake assistant. The patient is speaking Hindi. Evaluate their symptoms against the SOCRATES framework. Based on the missing data, ask the next logical follow-up question in clear, empathetic Hindi. If emergency red flags appear (e.g., severe chest pain), output triage_level: EMERGENCY.\n{format_instructions}\nCurrent state:\nTriage: {triage_level}\nSite: {socrates_site}\nOnset: {socrates_onset}\nCharacter: {socrates_character}\nSeverity: {socrates_severity}\nIf all 4 SOCRATES elements are gathered, set is_complete to true."),
        ("user", "Patient said: {current_input}\nDialogue History:\n{dialogue_history}")
    ])

    chain = prompt | llm | parser

    logger.info("Executing Groq LLM Node for Question Generation (Native Hindi)")
    
    try:
        result = await chain.ainvoke({
            "format_instructions": parser.get_format_instructions(),
            "triage_level": state.get("triage_level", "NORMAL"),
            "socrates_site": state.get("socrates_site"),
            "socrates_onset": state.get("socrates_onset"),
            "socrates_character": state.get("socrates_character"),
            "socrates_severity": state.get("socrates_severity"),
            "current_input": state.get("current_input", ""),
            "dialogue_history": "\n".join(state.get("dialogue_history", []))
        })
        
        # Accumulate state updates
        update_state = {}
        update_state["triage_level"] = result.get("triage_level", "NORMAL")
        
        # Only update if the LLM extracted something new
        if result.get("socrates_site"): update_state["socrates_site"] = result.get("socrates_site")
        if result.get("socrates_onset"): update_state["socrates_onset"] = result.get("socrates_onset")
        if result.get("socrates_character"): update_state["socrates_character"] = result.get("socrates_character")
        if result.get("socrates_severity"): update_state["socrates_severity"] = result.get("socrates_severity")
        
        translated_q = result.get("next_question_translated", "क्षमा करें, क्या आप फिर से कह सकते हैं?")
        update_state["next_question_translated"] = translated_q
        
        if update_state["triage_level"] == "EMERGENCY":
            logger.warning(f"🚨 EMERGENCY TRIAGE TRIGGERED for session {state.get('session_id')}")
        
        update_state["dialogue_history"] = state.get("dialogue_history", []) + [
            f"Patient: {state.get('current_input', '')}", 
            f"AI: {translated_q}"
        ]
        
        update_state["is_complete"] = result.get("is_complete", False)

        return update_state
        
    except Exception as e:
        logger.error(f"Error in LLM invocation: {e}")
        return {
            "next_question_translated": "मुझे क्षमा करें, कुछ तकनीकी समस्या आ रही है।",
            "dialogue_history": state.get("dialogue_history", []) + [
                f"Patient: {state.get('current_input', '')}", 
                f"AI: मुझे क्षमा करें, कुछ तकनीकी समस्या आ रही है।"
            ],
            "is_complete": False
        }

def should_continue(state: InterviewState):
    if state.get("is_complete") or state.get("triage_level") == "EMERGENCY":
        return END
    return END

workflow = StateGraph(InterviewState)
workflow.add_node("interview", interview_node)
workflow.set_entry_point("interview")
workflow.add_conditional_edges("interview", should_continue)

memory = MemorySaver()
interview_graph = workflow.compile(checkpointer=memory)
