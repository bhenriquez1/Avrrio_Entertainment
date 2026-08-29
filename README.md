# Avrrio Entertainment

AI-powered serialized animation production studio. Built to produce **Castillo** and future series at ~25 minutes per episode.

## v0.1 — Production Foundation

- **Productions** — Create and manage production projects
- **Canon Database** — Versioned, approved canonical facts (characters, locations, magic systems, world rules, etc.)
- **Dual-AI Review** — OpenAI extracts canon proposals from story documents; Claude independently reviews for continuity contradictions
- **Approval Workflow** — Every canon fact must be explicitly approved before it locks into the system
- **Season/Episode Structure** — AI-generated structure grounded in approved canon
- **AI Studio** — Provider status dashboard (OpenAI, Claude active; Runway, ElevenLabs, Blender — v0.3)

## AI Hierarchy

| Level | Entity | Role |
|---|---|---|
| 0 | Brian | Final authority |
| 1 | Approved Canon | Source of truth |
| 2 | OpenAI | Creative reasoning |
| 2 | Claude | Production & continuity |
| 3 | Specialized agents | Script / shot / asset / QA |
| 4 | Providers | Runway / ElevenLabs / Blender |

No model outranks approved canon. Neither OpenAI nor Claude modifies canon automatically.

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in API keys in .env.local
npm run dev
```

Required environment variables:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Roadmap

- **v0.1** — Foundation: canon, auth, dual-AI review, approval workflow (current)
- **v0.2** — Pre-production: screenplay editor, storyboard, shot lists, continuity engine
- **v0.3** — Virtual production: ElevenLabs, Runway, Blender, asset registry, cost tracking
- **v0.4** — Production intelligence: automated QA, lip-sync QA, selective regeneration
- **v1.0** — Studio: canon to screenplay to storyboard to voices to shots to renders to QA to final package

## Security

API keys are server-side only (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`). Never expose them to the browser. Guest mode (`NEXT_PUBLIC_GUEST_MODE=true`) gives browser-local access for testing without Firebase.

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
