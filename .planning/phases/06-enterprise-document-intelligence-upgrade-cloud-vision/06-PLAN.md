---
phase: 06
slug: enterprise-document-intelligence-upgrade-cloud-vision
status: planned
created: 2026-09-10
---

# Phase 06 — Enterprise Document Intelligence Upgrade (Cloud Vision)

## Overview
Transition the local edge-OCR pipeline to an enterprise-grade cloud architecture to handle complex cursive handwriting and tabular lab reports for deployment readiness. 

**Note on Current State:** The codebase already contains the implementation for `run_google_vision()` and the fallback logic to EasyOCR in `backend/ai_engine/ocr_pipeline.py`, as well as the `.env` entries and `requirements.txt`. This plan reflects the formalization and verification of these already implemented requirements.

## Tasks

### Wave 1: Verification of Cloud Vision Pipeline
- **06-01-01** `[backend]` Verify GCP Configuration (TK-12). Ensure `backend/gcp-vision-key.json` exists and is loaded properly via the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
- **06-01-02** `[backend]` Verify Dependency & Environment Update (TK-13). Ensure `google-cloud-vision` is installed.
- **06-01-03** `[backend]` Refactor & Verify `ocr_pipeline.py` (TK-14). Confirm that the Google Cloud Vision function works correctly and that, per `06-CONTEXT.md`, it falls back gracefully to `run_easyocr` upon failure.
