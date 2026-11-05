@AGENTS.md

# BenefitBridge (repo: MOFC-benbridge): rules for Claude Code sessions

Prototype for Mid-Ohio Food Collective: shared-screen English/Spanish translation for benefits applications. Read README.md for the architecture. Product context (PRD, discovery notes) lives in the shared Google Drive folder "Mid-Ohio Food Collective"; ask the user before assuming product decisions.

## Must hold

- **Sample data only.** Never add real neighbor data, real names, or real case details. Fictional profiles go in `lib/forms/sample-neighbors.ts`.
- **No PII in logs.** Never `console.log` message text, translations, or form values (server or client). Log error types/status codes only.
- **Form values never go to Claude.** Only conversation lines (translate + draft) and form labels.
- **Never auto-submit.** Submit requires every required field confirmed and nothing pending (`submitReadiness` in `lib/session/reducer.ts`).
- **Only the navigator confirms.** The neighbor's only form action is Sí/No on a pending value. Navigator Confirm needs a Sí and a draft that isn't unclear (`canConfirm`). A new value clears the neighbor's answer. Keep the unit tests for this passing.
- **Drafts never guess.** Claude drafts only values actually said; unit conversion happens in `lib/draft/normalize.ts`, not in the model. Unclear period or gross/net means `unclear` plus a question for the navigator.
- **Voice:** the speaker always reviews the transcript before translation. Never auto-translate speech, never store audio or transcripts beyond the in-memory session.
- **Translator stays a translator.** The prompt in `lib/translate/prompt.ts` forbids advice and eligibility judgments. Don't loosen that.
- **Glossary is authoritative.** Approved terms in `lib/glossary/<lang>.json` must be used. Keep the system prompt independent of the message so it stays cacheable.
- **Speech stays behind `SpeechProvider`.** No component should call browser speech APIs directly. The app must work in text-only mode.
- **Claude calls only on the server** (`lib/translate/claude.ts`, imported only by `app/api/**` and `tests/*.eval.ts`).

## Conventions

- TypeScript strict, Next.js App Router, Tailwind. Colors come from CSS variables in `app/globals.css` (light + dark).
- Validate API input with zod (`lib/translate/schema.ts`). Return `ApiError` shapes with proper status codes.
- Before finishing a change, run `npm run lint && npm run typecheck && npm test`. Run `npm run build` for anything that touches routing or config.
- When a translation mistake is found, add a case to `tests/translate.eval.ts`; for a drafting/voice mistake, `tests/voice.eval.ts`.
