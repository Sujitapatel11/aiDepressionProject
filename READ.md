# Project Overview

This is a journaling-based reflection system.
Users write private journals.  
The system generates non-medical, analytical reflections based on patterns.

This is NOT a mental health diagnostic tool.

---

## Current Status

- Backend: Django (stable)
- Journaling: Implemented
- Signal extraction: Basic (rule-based)
- Reflections: Rule-based + AI-assisted
- Frontend: Django templates (temporary)

---

## Core Principles

- Journals must always save (AI failure must not block core features)
- No medical advice
- Reflections are observational, not prescriptive
- Privacy-first by default

---

## Tech Stack

- Django 5.x
- SQLite (dev)
- OpenAI (optional, replaceable)
- Python 3.14