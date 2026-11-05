# MOFC-benbridge

Shared-screen English/Spanish translation for benefits applications, so neighbors and navigators can see what's said and entered. Prototype, made-up data only.

Built by Claude Corps fellows (Christian Serrato, Kian Najaf) with Mid-Ohio Food Collective. Project docs (PRD, discovery notes, problem statement) are in the shared Google Drive folder **Mid-Ohio Food Collective**.

## The idea in one line

A neighbor and a benefits navigator sit at one screen. The left pane is the neighbor's language and the right pane is English. They talk through the app (typed or spoken), fill in the application together, and the neighbor confirms every field in their own language before anything can be submitted. Either side can flag a translation that looks wrong. The phone interpreter becomes the backup, not the default.

## Run it

```bash
npm install
cp .env.example .env.local   # then paste your ANTHROPIC_API_KEY
npm run dev                   # http://localhost:3000 (use Chrome for voice)
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm test` | Unit tests (no API calls) |
| `npm run eval` | Live translation checks against Claude, e.g. gross vs net income. Costs a few cents. |
| `npm run lint` / `npm run typecheck` | Lint / types |
| `npm run build` | Production build |

## How it's put together

```
app/
  page.tsx                    one screen, two panes
  api/translate/              POST: translate one conversation line (Claude)
  api/translate-form/         POST: translate missing form labels (cached in memory)
components/
  NeighborPane, NavigatorPane the two sides
  Transcript                  conversation; each line has Flag + Play
  Composer                    text box + mic
  FormView                    the application; editable for the navigator, confirm-only for the neighbor
  FlagsPanel                  list + export flags for staff review
lib/
  languages.ts                supported languages
  glossary/es.json            staff-approved benefit terms (always used by the translator)
  translate/                  prompt, schema, server-side Claude call, browser client
  forms/                      form schema, sample SNAP-style form, fictional neighbors
  session/                    in-memory session state (reducer + React context)
  speech/                     swappable voice layer (browser speech or text-only)
  i18n/ui.ts                  button/heading text per language
tests/                        Vitest unit tests + live eval script
```

**Flow:** someone types or speaks in a pane → `SessionContext.sendMessage` → `/api/translate` → `lib/translate/claude.ts` calls Claude with the glossary in the system prompt and gets structured JSON back (`translation`, `uncertain`, `uncertainty_note`) → both panes update.

### Design decisions worth knowing

- **Neighbor data never goes to Claude through the form.** Form values (names, addresses, income) are shown as typed. Only conversation lines and form *labels* are translated.
- **Confirm before submit.** The navigator fills fields, the neighbor confirms each one in their language, and any edit clears that field's confirmation. Submit stays disabled until everything required is filled and confirmed. Submit is a mock: nothing is sent anywhere.
- **Glossary wins.** Terms in `lib/glossary/es.json` must be used as written. Hand-written Spanish labels in the form also beat machine translation. Machine-translated labels show an "AI" tag.
- **Uncertainty is surfaced.** When Claude isn't sure (ambiguous wording, possible mishearing), the line gets an amber outline, and the navigator sees an English note explaining why.
- **Flags → glossary.** Flags export as JSON. Staff review them and add good corrections to the glossary. Add a case to `tests/translate.eval.ts` for each real mistake.
- **No storage.** Session state lives in browser memory and is gone on reload. The server never logs message text.
- **Voice is swappable.** It's still an open decision, so everything goes through `lib/speech/types.ts`. The current default is browser speech; note that Chrome sends audio to Google. `NEXT_PUBLIC_SPEECH_PROVIDER=none` gives text-only mode.
- **Model.** Defaults to `claude-opus-5-5` at low effort, with server-side refusal fallback. Set `ANTHROPIC_MODEL=claude-haiku-5-5` to try lower latency/cost, then compare with `npm run eval`.

## Common tasks

- **Add a glossary term:** add `{ "en": "...", "es": "...", "note": "..." }` to `lib/glossary/es.json`.
- **Add a language:** follow the comment at the top of `lib/languages.ts`.
- **Add or change form fields:** edit `lib/forms/snap-sample.ts`, or add a new form with the same `FormSchema` shape.
- **Try a different speech provider:** implement `SpeechProvider` in `lib/speech/` and register it in `lib/speech/index.ts`.

## Ground rules

- **Made-up data only** until MOFC confirms what neighbor data may be sent to an AI service (PRD §4).
- Never commit `.env.local` or API keys.
- Work on branches and open PRs into `main`.

## Open questions (from the PRD)

- What neighbors consented to, and whether that covers sending data to an AI service. Ask Mark / MOFC IT.
- Voice approach: browser speech vs. a dedicated speech service vs. text only for the prototype.
- Success measures: minutes per form, 0 wrong eligibility fields, number of flags per session.
