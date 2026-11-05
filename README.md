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
| `npm run eval` | Live checks against Claude (costs a few cents): translation eval, then voice eval (`eval:translate`, `eval:voice` to run one). Prints PASS/FAIL. |
| `npm run lint` / `npm run typecheck` | Lint / types |
| `npm run build` | Production build |

## How it's put together

```
app/
  page.tsx                    one screen, two panes
  api/translate/              POST: translate one conversation line (Claude)
  api/translate-form/         POST: translate missing form labels (cached in memory)
  api/draft/                  POST: draft form values from one conversation line (Claude)
components/
  NeighborPane, NavigatorPane the two sides
  Transcript                  conversation; each line has Flag + Play
  Composer                    tap-to-speak → editable transcript review, plus typed fallback
  Highlighted                 marks numbers, how-often and gross/net words
  FormView                    the application: navigator types and Confirms; neighbor answers Sí/No
  FlagsPanel                  list + export flags for staff review
lib/
  languages.ts                supported languages
  glossary/es.json            staff-approved benefit terms (always used by the translator)
  translate/                  prompt, schema, server-side Claude call, browser client
  draft/                      drafting prompt, schema, normalize (unit conversion in code), Claude call
  highlight.ts                finds numbers / frequency / gross-net words in en and es
  forms/                      form schema, sample SNAP-style form, fictional neighbors
  session/                    in-memory session state (reducer + React context)
  speech/                     swappable voice layer (browser speech or text-only)
  i18n/ui.ts                  button/heading text per language
tests/                        Vitest unit tests + live evals (translate.eval.ts, voice.eval.ts)
```

**Flow:**
1. **Speak or type.** Each side has its own mic: navigator `en-US`, neighbor `es-US`. The button tells the app who is speaking; there's no language auto-detection.
2. **Check the transcript.** It shows up editable, with numbers, how-often words and gross/net words highlighted. **Re-record**, **Translate** or **Cancel**. Nothing is translated until the speaker taps Translate.
3. **Translate.** `SessionContext.sendMessage` → `/api/translate` → Claude with the approved terms → both panes update.
4. **Draft.** The same line goes to `/api/draft`. Claude reports only values that were actually said: amounts *as stated*, with how often and gross/net. `lib/draft/normalize.ts` converts to monthly in code. If how often or gross/net wasn't said, the draft is marked **unclear** with the question the navigator should ask.
5. **Neighbor Sí/No.** Each drafted (or navigator-typed) value shows on the neighbor side, highlighted, with Sí / No.
6. **Navigator Confirm.** Only the navigator can confirm, and only after a Sí on a draft that isn't unclear. Submit (mock) needs every required field confirmed and nothing pending.

### Design decisions worth knowing

- **What goes to Claude.** Conversation lines (for translation and drafting) and form *labels*. Form values the navigator types are never sent. Choices show as their translated option labels.
- **Two keys to every value.** The neighbor answers Sí/No, and only the navigator confirms. Any new value clears the neighbor's answer. Submit is a mock: nothing is sent anywhere.
- **Math in code, not in the model.** Claude never converts weekly to monthly; `normalize.ts` does, so the arithmetic is testable.
- **Glossary wins.** Terms in `lib/glossary/es.json` must be used as written. Hand-written Spanish labels in the form also beat machine translation. Machine-translated labels show an "AI" tag.
- **Uncertainty is surfaced.** When Claude isn't sure (ambiguous wording, possible mishearing), the line gets an amber outline, and the navigator sees an English note explaining why.
- **Flags → glossary.** Flags export as JSON. Staff review them and add good corrections to the glossary. Add a case to `tests/translate.eval.ts` for each real mistake.
- **No storage.** Session state lives in browser memory and is gone on reload. The server never logs message text.
- **Voice.** It uses the browser's speech recognition through `lib/speech/types.ts`, so the provider can be swapped. Use desktop **Chrome** (Edge also works). Firefox has no speech recognition, so it shows a message and falls back to typing. In Chrome, audio is processed by Google's speech service; the app never stores audio, and transcripts live only in the in-memory session. `NEXT_PUBLIC_SPEECH_PROVIDER=none` gives text-only mode.
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
