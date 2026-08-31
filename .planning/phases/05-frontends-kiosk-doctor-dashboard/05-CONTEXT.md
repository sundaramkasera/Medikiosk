# Phase 5: Frontends (Kiosk & Doctor Dashboard)

## Domain
Assemble the UI for patients and physicians, specifically focusing on the Doctor Dashboard (Triage Queue, Clinical Summary workspace, and Document Intelligence timeline).

## Canonical Refs
- [.planning/ROADMAP.md](../../ROADMAP.md)

## Decisions

### Triage Queue Notifications
- **Decision:** Emergencies should just sort to the top with a red badge (non-interruptive), rather than flashing and interrupting the doctor with a modal/sound.

### Clinical Summary Auto-save
- **Decision:** Editing the Markdown summary requires an explicit "Finalize Encounter" button to save/commit, rather than auto-saving continuously.

### AYUSH Toggle Behavior
- **Decision:** Toggling to AYUSH just appends specific AYUSH sections (e.g., Prakriti, Vikriti) to the standard summary, without changing the entire core structure.

### Abnormal Document Alerts
- **Decision:** Flagged documents just show a prominent warning badge (e.g., a red ! icon) in the timeline, rather than requiring explicit acknowledgment to dismiss.
