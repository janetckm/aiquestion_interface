# Implementation — Children Question Study

Last updated: 2026-11-09.

---

## 1. Study design at a glance

| Item | Detail |
| --- | --- |
| Design | Between-subjects, two conditions, run on the same 22-item quiz |
| Condition A | **Without AI** (`noai.html`) — control |
| Condition B | **With AI** (`withai.html`) — child may consult an AI chat helper |
| Task | 22 factual quiz questions (4 Easy, 6 Moderate, 12 Hard) |
| Stated time limit | "You have 10 minutes" (instructional framing only — see §9) |
| Stated scoring rule | +1 correct, 0 for "I don't know", −1 wrong (presented to the child; not computed by the app — see §11) |
| Additional per-item measure | Confidence rating 0–100 (both conditions) |
| Data capture | In-browser, downloaded by the researcher as `.xlsx` / `.csv` / `.json`, **and** every submission POSTed to a Redis hash via `api/save.js` (§12.2) |

---

## 2. Architecture

Static front-end plus two stateless Vercel functions. No server-side session state, and no database
in the request path — the only copy that leaves the browser is the submitted session written to a
Redis hash (§12.2).

```
index.html          landing page, links to the two conditions
noai.html           Without-AI page  -> assets/noai.js
withai.html         With-AI page     -> assets/ai.js
assets/app.js       shared logic: renders every step, validation, storage, export (window.App)
assets/noai.js      Without-AI flow controller
assets/ai.js        With-AI flow controller + AI chat
assets/styles.css   all styling
api/chat.js         Vercel serverless function; proxies to SiliconFlow (holds the API key)
api/save.js         Vercel serverless function; stores each submitted session in Redis, and exports them
tools/merge-sessions.html  offline page: JSON export(s) -> one Excel workbook (.xlsx or .zip)
Questions.xlsx      offline master copy of the 22 items
```

- The static pages are served from GitHub Pages (observed request origin `https://janetckm.github.io`).
- `api/chat.js` runs on Vercel at `https://aiquestioninterface.vercel.app/api/chat`, referenced from
  `assets/ai.js:12`.
- The API key never reaches the browser: the page calls the Vercel function, which adds
  `Authorization: Bearer <SILICONFLOW_API_KEY>` server-side (`api/chat.js:51-66`).
- `api/save.js` runs at `https://aiquestioninterface.vercel.app/api/save`, referenced from
  `assets/app.js:56`. It holds the Redis token server-side; the browser only ever sees the function
  URL (§12.2).
- SheetJS is loaded from a CDN in both study pages for `.xlsx` export; if unavailable the app falls
  back to CSV (`assets/app.js:893-899`). The merge tool loads SheetJS the same way, so it too needs an
  internet connection.

---

## 3. Participant procedure

Step model, identical in both conditions (`assets/app.js:51`):

```
STEPS = ['demographics', 'survey', 'questions', 'posttask']
```

The header shows "Step X of 4". All steps are rendered up-front and revealed one at a time; the
child can move Back and forward with Continue.

### 3.1 Common steps

| Step | Heading | Content | Gate to proceed |
| --- | --- | --- | --- |
| 1 | "Tell us about you" | Demographics form | All required fields valid |
| 2 | "A few questions about you" | Pre-task survey | Every survey item answered (`highlightMissingSurvey`) |
| 3 | "Our game" | Intro + 22 question cards (+ chat in the AI condition) | Every question has an answer **and** a confidence rating |
| 4 | "Section 2: Post-task" | Condition-specific post-task questions | Every post-task question answered |

### 3.2 Condition A — Without AI (`noai.html`)

- Steps 1 → 2 → 3 → 4, then **Finish & submit**.
- No AI panel, no "Ask AI" buttons.
- Header shows a live counter "N of 22 answered".

### 3.3 Condition B — With AI (`withai.html`)

- Same four steps, but step 3 is a two-column layout: question list on the left, an **AI Helper**
  chat panel on the right (`withai.html:59-87`).
- Every question card additionally has an **Ask AI** button.
- Pressing **Ask AI** does **not** send anything to the model. It scrolls the chat panel into view,
  briefly highlights it, and puts the cursor in the chat text box so the child can type their own
  question (`assets/ai.js:211-217`). Nothing about the click is recorded in the data.
- The chat is a free-form conversation; the child types and sends their own messages.

### 3.4 Game intro text shown to the child

Identical wording in both conditions except for the AI sentence, which appears only in
`withai.html:48`:

> In this game, you'll answer some questions. Some are easy and some are very tricky, even for grown-ups!
> On each question, you can ask an AI helper for its answer by pressing the "Ask AI" button. It's up to you whether you want to ask.
> ✅ +1 point if your answer is right
> ➖ 0 points (your score stays the same) if you don't know the answer, please write "I don't know"
> ❌ −1 point if your answer is wrong
> There are 22 questions in total. You have 10 minutes.

---

## 4. Materials — the 22 quiz items

Source of truth: `Questions.xlsx`; mirrored in code as `QUESTIONS` (`assets/app.js:6-30`). The two are
currently identical (verified row-by-row). The Excel file is **not** read at runtime — editing an
item requires changing `assets/app.js` as well.

| Item | Level | Question | Correct answer |
| --- | --- | --- | --- |
| E1 | Easy | How many legs does a spider have? | 8 |
| E2 | Easy | How many sides does a pentagon have? | 5 |
| E3 | Easy | What colour do you get if you mix blue and yellow paint? | Green |
| E4 | Easy | What do pandas mostly eat? | Bamboo |
| M1 | Moderate | What is the biggest ocean in the world? | Pacific |
| M2 | Moderate | What is the biggest planet in our solar system? | Jupiter |
| M3 | Moderate | How many hearts does an octopus have? | 3 |
| M4 | Moderate | Which mammal is the only one that can really fly? | Bat |
| M5 | Moderate | What is a baby kangaroo called? | Joey |
| M6 | Moderate | How many legs does a scorpion have? | 8 |
| H1 | Hard | What is the capital city of Australia? | Canberra |
| H2 | Hard | What is the hottest planet in our solar system? | Venus |
| H3 | Hard | What colour is a polar bear's skin? | Black |
| H4 | Hard | How many eyes does a bee have? | 5 |
| H5 | Hard | How many moons does Mars have? | 2 |
| H6 | Hard | What is the capital city of New Zealand? | Wellington |
| H7 | Hard | Which metal is a liquid at room temperature? | Mercury |
| H8 | Hard | What is the biggest organ of the human body? | Skin |
| H9 | Hard | What are diamonds made of? | Carbon |
| H10 | Hard | How many legs does a lobster have? | 10 |
| H11 | Hard | What is the national animal of Scotland? | Unicorn |
| H12 | Hard | What is the fastest bird in the world? | Falcon |

**Presentation order is randomised per participant** by a Fisher–Yates shuffle (`assets/app.js:36-45`).
The resulting order is stored in the participant's saved session, so a page reload does not reshuffle.
Each answer row records both `trial` (1–22, position in that child's order) and `id` (e.g. `H1`), so
item-position effects can be modelled.

---

## 5. Pre-task measures

### 5.1 Demographics (step 1) — `assets/app.js:174-179`

| Field | Type | Rules |
| --- | --- | --- |
| Participant ID | text | required — entered by whoever sets up the device |
| Age | number | required, 3–18 |
| Grade | text | required |
| Gender | select | required — Female / Male / Prefer not to say |

No name, or any other direct identifier, is collected. The app does **not** generate an ID: the field
starts empty under the placeholder `e.g. P01` and must be filled in before the child can continue
(`validateDemographics`). Whatever is typed becomes the session's `participant_id`, is repeated inside
`demographics` (§10.2), and is the Redis field name — so a code used twice overwrites the earlier
child's record (§13.11).

### 5.2 Self-efficacy items (step 2, block "Questions") — `assets/app.js:104-126`

Four single-choice statements, each with the same four options
(`Not true` / `A little true` / `Mostly true` / `Very true`):

1. `facts_good` — I am good at answering quiz questions about facts, like animals, space and countries.
2. `hard_questions` — I can answer quiz questions that even grown-ups find hard.
3. `work_out_hard` — I can work out hard questions if I try hard enough.
4. `think_carefully` — I can answer most quiz questions if I think carefully.

### 5.3 Intolerance-of-uncertainty statements (step 2, block "How much is this like you?")

Twelve statements (`ius_1` … `ius_12`, `assets/app.js:127-140`), each answered on a shared 5-point
scale (`assets/app.js:119-125`): 1 = "Not at all like me", 2 = "A little like me",
3 = "Somewhat like me", 4 = "Mostly like me", 5 = "Entirely like me".

Surprise events upset me greatly · It frustrates me to not have all the information I need · Not
knowing what could happen keeps me from enjoying life · One should always think ahead to avoid
surprises · Plans can be ruined by things you did not think would happen · When it is time to do
things, not knowing what could happen keeps me from acting · When I am not sure of something, I
cannot work very well · I always want to know what will happen to me in the future · I do not like
being taken by surprise · The smallest doubt can stop me from doing things · I should be able to
prepare for everything in advance · Being unclear about things means I am not confident.

### 5.4 AI-experience items (step 2, block "About AI") — **with-AI condition only**

`assets/app.js:143-157`, rendered only when `condition === 'ai'` (`assets/app.js:441-451`):

| id | Question | Options |
| --- | --- | --- |
| `ai_heard` | Have you ever heard of Artificial Intelligence (AI)? | Yes / No |
| `ai_tools` | Have you ever used any of these tools? (You can choose more than one answer) | Siri, ChatGPT, Deepseek, None, Other (+ free text) |
| `ai_intelligent` | When you use these tools, do they seem intelligent to you? | Yes / No |

Validation: every survey item is required; if "Other" is ticked the free-text box must be filled
(`assets/app.js:525-550`).

---

## 6. Task measures (step 3)

One row per item per participant. Fields (`assets/app.js:717-737`, session shape in §10):

| Field | Meaning |
| --- | --- |
| `trial` | 1–22, position in this child's randomised order |
| `id`, `level`, `question`, `correct_answer` | item metadata carried into the export |
| `answer` | the child's free-text answer, trimmed |
| `answered` | `true` when the text box is non-empty |
| `confidence` | 0–100 slider value, or `""` when not asked/not rated |

### 6.1 Confidence rating

- A slider labelled **"How sure are you? (0–100)"** appears inside a question card **only after the
  child types an answer** (`assets/app.js:673-708`).
- Range 0–100, step 5. The handle starts at 50 but the numeric readout shows `—` until the child
  actually moves it, so an untouched slider is distinguishable from a deliberate rating.
- The rating is **required**: a question with a real answer but no rating counts as unfinished and
  blocks leaving step 3, and is flagged again at submit (`assets/app.js:767-778`).
- **Exempt:** if the typed answer is a "don't know" phrase, the slider is hidden, no rating is
  required, and any previously stored rating for that item is discarded.
- "Don't know" detection normalises case and strips non-letters, then matches `idontknow` or
  `dontknow` (`assets/app.js:588-592`). So all of these are treated as don't-know:
  `I don't know`, `i dont know`, `dont know`, `Don't know!`, `I DONT KNOW`.
  `dunno` and `idk` are **not** matched.

### 6.2 Answer validation

- A blank answer is flagged and counted.
- On step 3 → step 4 the child is blocked with a toast if anything is unfinished.
- At submit, any remaining unfinished items trigger a `confirm()` dialog ("N questions are still
  unfinished. Submit anyway?"), which the researcher can accept to avoid losing a session.

---

## 7. Post-task measures (step 4)

Rendered by `renderPostTask` (`assets/app.js:554-567`); item sets at `assets/app.js:55-102`.

**With AI (`POST_AI`, 6 items)** — order as shown:

| id | Question | Options |
| --- | --- | --- |
| `pt_ai_right` | Do you think the AI's answers were right? | Never / Sometimes / Always |
| `pt_difficulty` | How hard were the questions? | Easy / Medium / Hard |
| `pt_idk_ok` | Is it OK to say "I don't know" in this game? | Not OK / A bit OK / Totally OK |
| `pt_ai_use` | In your everyday life, how often do you use an AI that answers questions, like DeepSeek, Siri or ChatGPT? | Never / Once or twice / Sometimes / Often |
| `pt_ai_trust` | How often do you think an AI's answer is right? | Never / Sometimes / Often / Always |
| `pt_believe_ai` | If you didn't know the answer to a question and an AI told you one, would you believe it? | No / Maybe / Probably / Yes |

**Without AI (`POST_NOAI`, 5 items)** — the same five items as above minus `pt_ai_right`.

All post-task items are required before submit.

---

## 8. The AI manipulation ("WrongBot")

The helper is deliberately, confidently wrong — the object of study is whether children detect and
resist it.

- **Persona and rules** are in `CONFIG.systemPrompt` (`assets/ai.js:13-27`): never express
  uncertainty, every answer factually wrong, never self-correct even when challenged, smug cartoon
  tone, invented fake authorities, 1–3 short sentences, child-appropriate and never cruel.
- **Correct answers are injected as a ban list.** `buildSystemPrompt()` (`assets/ai.js:269-279`)
  appends every `question = correct answer` pair from `App.QUESTIONS` under a "REFERENCE — the real
  answers to this quiz. Only so you know what to avoid" header, and instructs the model never to give
  any of them and never to reveal the list. This makes wrongness near-deterministic.
- **Scope note:** the chat is one continuous conversation with no per-item context, so the ban list
  covers all 22 items at all times rather than just the current question.
- **Streaming:** the reply is rendered token-by-token into the placeholder bubble
  (`assets/ai.js:228-267`, SSE parser at `assets/ai.js:313-353`). A JSON (non-streaming) response from
  an older deployment is still handled (`assets/ai.js:297-302`).
- **Request parameters** (`api/chat.js:58-65`): `model` from `SILICONFLOW_MODEL` or the code default,
  `stream: true`, `temperature: 0.7`, `max_tokens: 120`, `enable_thinking: false`.
- **Model actually used is recorded.** The model id echoed by the API is stored as `usedModel` and
  written into the session as `model` (`assets/ai.js:309`, `assets/ai.js:327`), so each submission
  documents which model answered.
- **Chat log** is stored in full: role, content, timestamp `YYYY-MM-DD HH:MM:SS` (`assets/ai.js:177-182`).
- The chat panel shows a status line, "Connected" vs "Not configured" (`assets/ai.js:75`).

### 8.1 Deployment caveats worth recording in the paper

- The code default model is `deepseek-ai/DeepSeek-V3.2` (`api/chat.js:14`)
- Reasoning models (e.g. an R1-class model) ignore `enable_thinking: false`; if one is configured the
  child waits several seconds with no visible output because the model's `reasoning_content` is not
  rendered. Confirm the model in the exported `model` field for every session.
- `ALLOWED_ORIGIN` on Vercel restricts which page origins may call the function
  (`api/chat.js:16-25`).

---

## 9. Randomisation and timing

- **Item order:** independent Fisher–Yates shuffle per participant, generated once and persisted
  (`assets/ai.js:62-64`, `assets/noai.js:24-26`).
- **Timing captured:** `started_at` (set when the participant first loads the condition page, stored
  in `sessionStorage` as `started_at_ai` / `started_at_noai`) and `submitted_at` (set at submit).
  Duration = `submitted_at − started_at`.
- **Not captured:** per-question time-on-task, per-question order-of-visit, and the 10-minute limit is
  **not enforced** by any timer — it exists only in the instruction text.

---

## 10. Data model

### 10.1 Browser storage

| Key | Storage | Purpose |
| --- | --- | --- |
| `started_at_ai` / `started_at_noai` | sessionStorage | start timestamp |
| `study.ai.state` / `study.noai.state` | localStorage | full in-progress state; survives reload |
| `study.last.ai` / `study.last.noai` | localStorage | copy of the submitted session |

The in-progress state is written on every change and on `beforeunload`, and cleared on submit. The
header **Reset** button wipes all of it and reloads a blank form for the next participant
(`assets/ai.js:139-157`, `assets/noai.js:52-66`).

### 10.2 Submitted session object (`buildSession`, `assets/app.js:948-978`)

```json
{
  "participant_id": "ai-20261109-090000-k3x9",
  "mode": "ai",
  "started_at": "2026-11-09T09:00:00.000Z",
  "submitted_at": "2026-11-09T09:08:41.000Z",
  "demographics": { "participant_id": "ai-20261109-090000-k3x9", "age": "9", "grade": "4", "gender": "Female" },
  "survey":   { "facts_good": "...", "ius_1": 4, "ai_heard": "Yes", "ai_tools": ["Siri"], "ai_tools_other": "" },
  "posttask": { "pt_ai_right": "Sometimes", "pt_difficulty": "Hard" },
  "answers": [
    { "trial": 1, "id": "H1", "level": "Hard", "question": "...", "answer": "Sydney",
      "correct_answer": "Canberra", "answered": true, "confidence": 80 }
  ],
  "summary": { "total_questions": 22, "answered": 22 },
  "model": "deepseek-ai/DeepSeek-V3.2",
  "chat": [ { "role": "user", "content": "...", "time": "2026-11-09 09:02:11" },
            { "role": "assistant", "content": "...", "time": "2026-11-09 09:02:14" } ]
}
```

`mode` is `"ai"` or `"noai"`; `chat` is empty in the Without-AI condition; `confidence` is a number
0–100 or `""`.

`participant_id` is whatever was typed in the demographics step (§5.1), repeated inside
`demographics`; it is the key of the cloud record (§12.2) and the identifier used throughout the
merged workbook (§12.4). The JSON export writes this session object verbatim.

No field in the session carries the child's name or any other direct identifier.

---

## 11. Scoring

The app **does not grade anything**. `correct_answer` is carried alongside each answer so scoring can
be done offline, and the `+1 / 0 / −1` rule shown to children is motivational framing only.

Practical notes for analysis:

- Answers are free text, so exact-match scoring will need a coding scheme (case, spelling, articles,
  e.g. "Green" vs "green", "8" vs "eight legs").
- "Don't know" responses are not tagged in the export. Reapply the same normalisation in §6.1
  (lower-case, strip non-letters, match `idontknow` / `dontknow`) to reproduce the in-app behaviour.
- Nothing records which questions the child consulted the AI about. Pressing **Ask AI** is not
  logged, so AI use can only be inferred from the chat transcript (§8).

---

## 12. Exports and storage

### 12.1 Local downloads (finish screen)

Filenames: `study_<mode>_<participant_id>_<YYYYMMDD_HHMMSS>.<ext>` (`assets/app.js:795-798`).

**XLSX (default)** — sheets (`assets/app.js:893-936`):

| Sheet | Contents |
| --- | --- |
| `Session` | field/value block: demographics, mode, start, submit, api_model |
| `Answers` | one row per question — headers: `Trial, Item, Level, Question, Child answer, Confidence, Status` (`Status` = answered/blank) |
| `Survey` | pre-task survey + post-task answers, with numeric scores where applicable |
| `Chat` | `#, Role, Message, Time` — present only when a chat exists |

**CSV** fallback (`assets/app.js:864-886`) contains the same blocks in one file with a UTF-8 BOM.
**JSON** export is the verbatim session object and is the safest archive format — it is the only
export that preserves the nested `answers`, `survey` and `chat` structures unambiguously.

All of this is generated in the browser and downloaded to the researcher's device. The cloud copy
below is **in addition** — the **Download XLSX** and **Download JSON** buttons on the finish screen are
unchanged, because a local file is the only backup that survives a lost Redis credential.

### 12.2 Cloud backup (`api/save.js`)

Every submission is also POSTed to the study database, so a session is not lost if the researcher
forgets to download it before the next participant.

- **Endpoint:** `https://aiquestioninterface.vercel.app/api/save`, set once in `assets/app.js:56`
  (`SAVE_ENDPOINT`). Setting that constant to `''` switches the cloud copy off and leaves the local
  downloads working.
- **Storage:** a single Redis hash, key `study:sessions` (override with `STUDY_REDIS_KEY`), field =
  `participant_id`, value = the session JSON (§10.2). Re-submitting the same `participant_id`
  overwrites the row rather than adding a second one.
- **Request:** `POST` with `{ "participant_id": "...", "session": { … } }`, sent with
  `Content-Type: application/json` and `keepalive: true` (`assets/app.js:981-993`) so the request
  still lands if the child closes the page right after submitting.
- **Failure does not block the child.** The finish screen reports "Saved to the study database
  (`<id>`)" or turns the line into a warning and reveals a **Try the cloud save again** button; the
  download buttons stay available in either case (`assets/app.js:1015-1039`).
- **Size guard:** the function returns `413` for a session over 200 KB, far above the ~14 KB a
  60-message chat produces. Vercel also caps a request body at ~4.5 MB.
- **Environment variables** (Vercel → Project → Settings → Environment Variables):

| Variable | Required | Purpose |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | yes | Redis REST endpoint, injected by the Upstash integration (alias `KV_REST_API_URL`) |
| `UPSTASH_REDIS_REST_TOKEN` | yes | Redis REST token, injected by the Upstash integration (alias `KV_REST_API_TOKEN`) |
| `STUDY_REDIS_KEY` | no | hash name, default `study:sessions` |
| `EXPORT_TOKEN` | no | set it to enable the GET export below; while unset the export returns `403` |
| `ALLOWED_ORIGIN` | no | comma-separated page origins, same behaviour as `api/chat.js` |

The Redis token never reaches the browser. Upstash is called over its REST pipeline endpoint, so
`api/save.js` needs no Redis client dependency.

### 12.3 Retrieving the stored sessions

```
https://aiquestioninterface.vercel.app/api/save?token=<EXPORT_TOKEN>
```

Returns `study_sessions.json`, a JSON array of every stored session sorted by `submitted_at`, sent
with `Content-Disposition: attachment`. The same request works with an `x-export-token` header for
scripted retrieval. On PowerShell 5 use `curl.exe`, not `curl`, which is an alias for
`Invoke-WebRequest`. Reading is a single `HVALS`, so exporting adds no writes and no meaningful size.

Alternatives: the Upstash console (**Backup & Export**, RDB format), or `redis-cli --tls` with the
endpoint, port and password from the Upstash dashboard (Upstash requires TLS).

### 12.4 Merging into one workbook (`tools/merge-sessions.html`)

A self-contained page that turns the cloud export, any number of per-participant `.json` files, or
both, into Excel. Everything runs in the browser — nothing is uploaded.

- Records are de-duplicated on `participant_id` with the newest `submitted_at` winning, so a whole
  batch can be re-dropped safely.
- Three outputs: **(1)** one combined workbook, **(2)** one chosen participant (a dropdown listing the
  loaded records by `participant_id`, with the condition shown alongside), **(3)** one workbook per
  participant, bundled into a single `.zip` written by the page itself.
- Per-participant files are named `<participant_id>.xlsx`.
- The page loads `../assets/app.js` and reuses `App.surveyRows`, so survey question text and scale
  labels are never duplicated and always match the live instrument.

| Sheet | Shape |
| --- | --- |
| `Participants` | one row per participant — demographics, `duration_min`, answered / total, chat count, and every survey and post-task value: the sheet for descriptive stats and regressions |
| `Session` | a field/value block per participant, the same fields as the app's own `Session` sheet |
| `Answers` | one row per question per participant |
| `Survey` | one row per survey item per participant, with question text and scale labels |
| `Chat` | one row per message, present only when a chat exists |

---

## 13. Known limitations and design decisions

1. **No enforced timer.** The 10-minute limit is instructional only.
2. **No per-question timing**, so response latency per item cannot be analysed.
3. **Confidence is required and self-reported on a 0–100 slider**, collected only for non-don't-know
   answers; it is not collected for items the child declines.
4. **Answer wording is not normalised** in the export — scoring decisions are made post hoc.
5. **The AI's replies are not fixed script.** They are generated by a general-purpose LLM under a
   "be confidently wrong" prompt plus an explicit ban list of the real answers. Wording varies between
   children and between sessions; the specific model is recorded per session.
6. **The ban list covers all 22 items at once**, because the chat has no per-item context.
7. **"Ask AI" is a nudge, not an action**: it focuses the chat and never sends a question for the
   child. Whether a child actually asked the AI is only observable from the chat log.
8. **Shuffled item order** means item position varies between participants; use `trial` and `id`
   together in any position-sensitive analysis.
9. **One in-progress session per condition per device.** Saved state is keyed by condition
   (`study.ai.state`, `study.noai.state`), not by participant. The **Reset** button must be pressed
   between participants; otherwise the next child inherits the previous child's in-progress state.
   (Submitted sessions are copied to `study.last.<mode>` and are not affected by Reset.)
10. **No direct identifier is collected, but the cloud store is not anonymous.** Nobody types a name
    any more (§5.1), and no field of the session object holds one (§10.2). The Redis copy is still
    child data sitting on a third-party host, readable by anyone with the Redis credentials or the
    `EXPORT_TOKEN`, and `age` + `grade` + `gender` together are quasi-identifying. Exports saved
    before the name field was removed still contain the names they collected; those are legacy files
    and cannot be back-filled.
11. **Participant IDs are only as unique as the typing.** The app generates nothing: whatever is typed
    in step 1 becomes the ID (§5.1). Two submissions sharing an ID collapse into one Redis record (the
    second overwrites the first) and one row in the merged workbook, so a repeated code silently loses
    data.
12. **The cloud path depends on free tiers.** Storage is Upstash Redis (free: 256 MB, 500K commands
    per month) called from a Vercel function. Vercel's Hobby plan is licensed for personal,
    non-commercial use only, which is worth confirming before a funded or institutional deployment.
    A study of this size is negligible in storage terms — roughly 1 MB for 100 participants, against
    the 200 KB per-session ceiling (§12.2).
13. **The cloud store is the only place a session can be lost.** Nothing retries in the background:
    if the POST fails and the researcher closes the page, the retry button is gone with it. The
    local `.xlsx` / `.json` download remains the primary record (§12.1).
14. **The merge tool needs an internet connection** because it loads SheetJS from a CDN (§2). It works
    from a local copy of the repo as well as from the published site.

---

## 14. Where to change things

| To change… | Edit |
| --- | --- |
| The 22 quiz items | `assets/app.js:6-30` **and** `Questions.xlsx` |
| Question wording/options for self-efficacy | `assets/app.js:104-126` |
| IUS statements / scale labels | `assets/app.js:127-140` |
| AI-only pre-task items | `assets/app.js:143-157` |
| Post-task items | `assets/app.js:55-102` |
| Demographics fields | `assets/app.js:159-165` |
| WrongBot persona / rules | `assets/ai.js:13-27` |
| The banned-answer list | `assets/ai.js:269-279` |
| Confidence slider range/step/labels | `assets/app.js:673-708` |
| Model, temperature, max tokens, streaming | `api/chat.js:58-65` and the Vercel env vars |
| API endpoint used by the page | `assets/ai.js:12` |
| Switching the cloud backup off | `SAVE_ENDPOINT` in `assets/app.js:56` (set to `''`) |
| Cloud store behaviour, size cap, export route | `api/save.js` |
| Redis key, export token, allowed origins | Vercel env vars: `STUDY_REDIS_KEY`, `EXPORT_TOKEN`, `ALLOWED_ORIGIN` |
| The JSON → Excel merging tool and its sheets | `tools/merge-sessions.html` |
| Step headings and on-screen hints | `withai.html` / `noai.html` |

---

## 15. Change log (this implementation round)

- Removed the "I don't know" answer button; don't-know is now expressed by typing the phrase.
- "Ask AI" no longer relabels itself after a click; it focuses the chat and nothing more.
- The per-question `asked_ai` flag and the derived `ai_requests` count were removed from the saved
  session, the XLSX/CSV export, and the finish screen; the "Asked AI" export column is gone.
- All "Next" buttons relabelled "Continue".
- Without-AI page restructured so its Back / Continue / Finish & submit buttons match the With-AI
  layout exactly, with no fixed bottom bar.
- AI responses switched to streaming; the chat system prompt replaced with the WrongBot persona and
  an appended ban list of the 22 correct answers.
- Pre-task self-efficacy block expanded from 2 questions to 4 (see §5.2).
- Per-question **confidence rating (0–100)** added to both conditions, required for every
  non-don't-know answer; exported as a new `Confidence` column in the Answers sheet.
- **Cloud backup added.** Every submission is also POSTed by the page to the new `api/save.js`, which
  writes the session into an Upstash Redis hash keyed by `participant_id`. The existing `.xlsx` /
  `.json` / `.csv` downloads were left untouched, and a failed save never blocks the child (§12.2).
- **`participant_id`** added to the session object and to the local exports, and used as the Redis
  field name. It was briefly auto-generated in the form `<mode>-<YYYYMMDD>-<HHMMSS>-<xxxx>`; that was
  dropped in favour of the researcher typing an ID (§5.1).
- **The Name field became a Participant ID field.** Demographics now collects no name at all (§5.1).
  The field starts empty and is typed in by whoever sets up the device — the app generates no code —
  the session JSON no longer carries a `name` key, and local filenames are built from
  `participant_id`.
- **`tools/merge-sessions.html` added**: merges the cloud export and/or per-participant JSON files into
  one workbook (Participants / Session / Answers / Survey / Chat), a single participant's workbook, or
  a per-participant `.zip` (§12.4).
- Duplicate-record handling in the merge tool keys on `participant_id`, so two children who submit
  twice are collapsed to the newest record rather than counted twice.
