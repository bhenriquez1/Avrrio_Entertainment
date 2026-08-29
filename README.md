# Purpose Pen — Archived

> **Status: Retired / Archived — August 2026**
> This project has been superseded by **Avrrio Entertainment**, an AI-powered serialized animation production studio.
> The repository and its full commit history are preserved here as a reference.

---

Purpose Pen was an application management platform for dental, medical, and graduate applicants, featuring:

- **Personal Statement & Essay Studio** — 7-step guided wizard with AI drafting, outlining, and refinement
- **Letter of Recommendation Builder** — Evidence-based letter drafting with personality profiling, strength calibration, and export
- **Application Management Center** — Recommender tracking, deadlines, and committee packet builder
- **Reapplicant Archive** — Cycle history, feedback, and lessons-learned tracking

### Architecture
- Next.js 16 App Router · TypeScript · Tailwind CSS v4
- Firebase Auth + Firestore · Firebase Admin SDK
- Anthropic Claude API (letter drafting, essay generation, continuity review)
- Edge middleware with HTTP Basic Auth + session cookie protection

### Final state
The last production release is tagged `v1.0-archive` and reflects all work through PR #12 (Guest Mode).
Authentication code, AI prompts, and the full writing workflow are preserved in their entirety.

---

*Succeeded by [Avrrio Entertainment](https://github.com/bhenriquez1/avrrio-entertainment) — serialized animation production OS.*
