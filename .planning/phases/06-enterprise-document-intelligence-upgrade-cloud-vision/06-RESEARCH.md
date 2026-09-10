# Phase 6 Research: Enterprise Document Intelligence Upgrade (Cloud Vision)

## Domain Analysis
- **Current State:** The backend uses `easyocr` (version 1.7.1 in `requirements.txt`). It has a function `run_easyocr()` in `ocr_pipeline.py`.
- **Target State:** The backend must use Google Cloud Vision API for enterprise-grade OCR.
- **Constraints & Context:** `06-CONTEXT.md` explicitly overrides the ROADMAP.md TK-14 instruction to "Rip out" EasyOCR. Instead, the context dictates that we must "attempt Google Cloud Vision first. If an exception or timeout occurs, log a warning and fall back gracefully to the existing local EasyOCR pipeline so the live demo never fails."

## Codebase Findings
- `ocr_pipeline.py` currently has `run_google_vision()` and fallback logic to `run_easyocr()` *already implemented*. 
- `backend/.env` already contains `GOOGLE_APPLICATION_CREDENTIALS="backend/gcp-vision-key.json"`.
- `backend/gcp-vision-key.json` exists in the filesystem.

## What's Left to Plan?
The codebase appears to already have the code changes specified in TK-12, TK-13, and TK-14. However, we still need to formalize the plan. Since the code is already present, the plan will reflect that the implementation consists of validating and ensuring these components are functioning correctly as per the context requirements.

## Validation Architecture
- Verify `google-cloud-vision` is correctly installed.
- Verify fallback behavior when Cloud Vision fails.
- Verify `GOOGLE_APPLICATION_CREDENTIALS` is loaded correctly.
