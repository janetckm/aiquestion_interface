# Implementation — Children Question Study

Last updated: 2026-11-15.

---

## 1. Study design at a glance

| Item | Detail |
| --- | --- |
| Design | Between-subjects, two conditions, run on the same quiz: Part 1 (12 items), then a post-task, then Part 2 (12 items), then a second post-task |
| Condition A | **Without AI** (`noai.html`) — control |
| Condition B | **With AI** (`withai.html`) — child may consult an AI chat helper |
| Task | 24 factual quiz questions: Part 1 = 12 items (the hard set only), Part 2 = 12 items |
| Stated time limit | "You have 10 minutes" (instructional framing only — see §9) |
| Stated scoring rule | +1 correct, 0 for "I don't know", −1 wrong (presented to the child; not computed by the app — see §11) |
| Additional per-item measure | Confidence rating 0–100 (both conditions, both parts) |
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
Questions.xlsx      offline master copy: 12 Part 1 items (`Items`), 12 Part 2 items (`Items Part 2`),
                    and both post-tasks' items (`Post-task items`)
```

- The static pages are served from GitHub Pages (observed request origin `https://janetckm.github.io`).
- `api/chat.js` runs on Vercel at `https://aiquestioninterface.vercel.app/api/chat`, referenced from
  `assets/ai.js:13`.
- The API key never reaches the browser: the page calls the Vercel function, which adds
  `Authorization: Bearer <SILICONFLOW_API_KEY>` server-side (`api/chat.js:51-66`).
- `api/save.js` runs at `https://aiquestioninterface.vercel.app/api/save`, referenced from
  `assets/app.js:75`. It holds the Redis token server-side; the browser only ever sees the function
  URL (§12.2).
- SheetJS is loaded from a CDN in both study pages for `.xlsx` export; if unavailable the app falls
  back to CSV (`assets/app.js:994-998`). The merge tool loads SheetJS the same way, so it too needs an
  internet connection.

---

## 3. Participant procedure

Step model, identical in both conditions (`assets/app.js:70`):

```
STEPS = ['demographics', 'survey', 'questions', 'posttask', 'part2', 'posttask2']
```

The header shows "Step X of 6". All steps are rendered up-front and revealed one at a time; the
child can move Back and forward with Continue. `questions` is Part 1's item list and `part2` is
Part 2's; `posttask` and `posttask2` are the two post-tasks (§7). The two question lists share every
rendering, validation and export code path (§4).

### 3.1 Common steps

| Step | Heading | Content | Gate to proceed |
| --- | --- | --- | --- |
| 1 | "Tell us about you" | Demographics form | All required fields valid |
| 2 | "A few questions about you" | Pre-task survey | Every survey item answered (`highlightMissingSurvey`) |
| 3 | "Our game" / "Our game Part 1" | Intro + 12 Part 1 question cards (+ chat in the AI condition) | Every question has an answer **and** a confidence rating |
| 4 | "Well done, you’ve finished Part 1!" | Post-task about Part 1 (3 items, identical in both conditions) | Every post-task item answered, including the "Why?" text box |
| 5 | "Our game Part 2" | Intro + 12 Part 2 question cards (+ chat in the AI condition) | Every question has an answer **and** a confidence rating |
| 6 | "Well done! Let's see how you felt!" | Second post-task | Every post-task question answered |

The first post-task sits **between** the two parts, so its "How hard were the questions?" item is
answered with Part 1 in mind only. The second post-task closes the session and refers to the session as
a whole, and it is the only step that asks about the AI. "Finish & submit" is on step 6;
steps 4 and 5 end in a plain Continue. The Part 2 question list is randomised independently of Part 1
(§9).

### 3.2 Condition A — Without AI (`noai.html`)

- Steps 1 → 2 → 3 → 4 → 5 → 6, then **Finish & submit**.
- No AI panel, no "Ask AI" buttons.
- Header shows a live counter — "N of 12 answered" on step 3, "N of 12 answered" on step 5.

### 3.3 Condition B — With AI (`withai.html`)

- Same six steps, but steps 3 and 5 are a two-column layout: question list on the left, an **AI
  Helper** chat panel on the right (`withai.html:59-87`, `withai.html:109-122`).
- Every question card in **both** parts additionally has an **Ask AI** button.
- There is one chat panel for the whole session. The Part 2 section ships an empty
  `.study-col-chat`, and `placeChatPanel()` (`assets/ai.js:94-97`) moves the same node into whichever
  question step is showing — so the conversation, its scroll position and its event listeners carry
  over from Part 1, and the `Chat` sheet is one continuous transcript. The post-task steps have no
  chat column, so the panel simply stays hidden with the Part 2 step.
- Pressing **Ask AI** does **not** send anything to the model. It scrolls the chat panel into view,
  briefly highlights it, and puts the cursor in the chat text box so the child can type their own
  question (`assets/ai.js:257-267`). Nothing about the click is recorded in the data.
- The chat is a free-form conversation; the child types and sends their own messages.

### 3.4 Game intro text shown to the child

Identical wording in both conditions except for the AI sentence and the question count, which appear
only in `withai.html:48` and `withai.html:55` (the control page has an empty paragraph where the
count sits):

> In this game, you'll answer some questions. Some are easy and some are very tricky, even for grown-ups!
> On each question, you can ask an AI helper for its answer by pressing the "Ask AI" button. It's up to you whether you want to ask.
> ✅ +1 point if your answer is right
> ➖ 0 points (your score stays the same) if you don't know the answer, please write "I don't know"
> ❌ −1 point if your answer is wrong
> There are 24 questions in total. You have 10 minutes.

Part 2 opens with its own shorter card, "Our game Part 2" — the scoring rules are not repeated:
"Now it's time for Part 2."

---

## 4. Materials — the 24 quiz items

Source of truth: `Questions.xlsx`, mirrored in code as `QUESTIONS` (`assets/app.js:7-20`) and
`PART2_QUESTIONS` (`assets/app.js:25-38`). The workbook holds the 12 Part 1 items on its `Items`
sheet, the 12 Part 2 items on `Items Part 2`, and both post-tasks' items on `Post-task items`
(§7). Neither item list is read from Excel at runtime — editing an item requires changing
`assets/app.js` as well, but the two must be kept in step.

### 4.1 Part 1 — 12 items (step 3)

The items are the twelve hard items of the original 22-item pool. The four easy and six moderate
items were dropped, so every Part 1 item carries `level: 'Hard'` and Part 1 is no longer a
mixed-difficulty set (see §13.20).

| Item | Level | Question | Correct answer |
| --- | --- | --- | --- |
| H1 | Hard | What colour is a polar bear's skin underneath its fur? | Black |
| H2 | Hard | How many moons does Mars have? | 2 |
| H3 | Hard | Imagine you're facing north. If you turn to your right by a quarter turn, which direction are you facing? | East |
| H4 | Hard | Where on its body does a cricket have its ears? | On its front legs |
| H5 | Hard | What is the national animal of Scotland? | Unicorn |
| H6 | Hard | Imagine a standard six-sided die with two dots on top. How many dots are on the bottom? | 5 |
| H7 | Hard | What kind of bean is usually used to make tofu? | Soybean |
| H8 | Hard | On a piano, the black keys repeat in groups. Some groups have two black keys. How many are in the other groups? | 3 |
| H9 | Hard | What do we call a young frog when it has a tail and hasn't grown legs yet? | Tadpole |
| H10 | Hard | Which part of the carrot plant is the orange part we usually eat? | The root |
| H11 | Hard | At the start of a game of chess, which piece stands in each corner of the board? | Rook |
| H12 | Hard | What is the capital of Canada? | Ottawa |

### 4.2 Part 2 — 12 items (step 5)

Ids are prefixed `P` and `level` is the literal string `Part 2`, so a Part 2 row can never be
confused with a Part 1 row in an export, a pivot table or the merged workbook. No difficulty rating
is claimed for these items.

| Item | Level | Question | Correct answer |
| --- | --- | --- | --- |
| P1 | Part 2 | What do pandas mostly eat? | Bamboo |
| P2 | Part 2 | How many sides does a triangle have? | 3 |
| P3 | Part 2 | What are diamonds made of? | Carbon |
| P4 | Part 2 | How many minutes in one hour? | 60 |
| P5 | Part 2 | What is the biggest planet in our solar system? | Jupiter |
| P6 | Part 2 | How many wings does a butterfly have? | 4 |
| P7 | Part 2 | What is the name of the star closest to Earth? | The Sun |
| P8 | Part 2 | What is the biggest animal in the world? | Blue whale |
| P9 | Part 2 | What is a baby kangaroo called? | Joey |
| P10 | Part 2 | How many days are there in January? | 31 |
| P11 | Part 2 | What is the capital of Brazil? | Brasília |
| P12 | Part 2 | How many legs does a lobster have? | 10 |

**No Part 2 item repeats a Part 1 item any more.** Three of them used to — P1 = E4 (pandas),
P5 = M2 (biggest planet), P9 = M5 (baby kangaroo) — until the easy and moderate Part 1 items were
dropped (§13.15). All 24 items are now answered once each.

**Presentation order is randomised per participant** by a Fisher–Yates shuffle (`assets/app.js:53-64`),
**independently for each part**. The resulting orders are stored in the participant's saved session
(`order` and `order2`), so a page reload does not reshuffle. Each answer row records both `trial`
(position in that child's order **within its part**) and `id` (e.g. `H1`, `P3`), so item-position
effects can be modelled.

---

## 5. Pre-task measures

### 5.1 Demographics (step 1) — `assets/app.js:204-209`

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

### 5.2 Self-efficacy items (step 2, block "Questions") — `assets/app.js:140-162`

Four single-choice statements, each with the same four options
(`Not true` / `A little true` / `Mostly true` / `Very true`):

1. `facts_good` — I am good at answering quiz questions about facts, like animals, space and countries.
2. `hard_questions` — I can answer quiz questions that even grown-ups find hard.
3. `work_out_hard` — I can work out hard questions if I try hard enough.
4. `think_carefully` — I can answer most quiz questions if I think carefully.

### 5.3 Intolerance-of-uncertainty statements (step 2, block "How much is this like you?")

Twelve statements (`ius_1` … `ius_12`, `assets/app.js:172-185`), each answered on a shared 5-point
scale (`assets/app.js:164-170`): 1 = "Not at all like me", 2 = "A little like me",
3 = "Somewhat like me", 4 = "Mostly like me", 5 = "Entirely like me".

Surprise events upset me greatly · It frustrates me to not have all the information I need · Not
knowing what could happen keeps me from enjoying life · One should always think ahead to avoid
surprises · Plans can be ruined by things you did not think would happen · When it is time to do
things, not knowing what could happen keeps me from acting · When I am not sure of something, I
cannot work very well · I always want to know what will happen to me in the future · I do not like
being taken by surprise · The smallest doubt can stop me from doing things · I should be able to
prepare for everything in advance · Being unclear about things means I am not confident.

### 5.4 AI-experience items (step 2, block "About AI") — **with-AI condition only**

`assets/app.js:188-202`, rendered only when `condition === 'ai'` (`assets/app.js:487`):

| id | Question | Options |
| --- | --- | --- |
| `ai_heard` | Have you ever heard of Artificial Intelligence (AI)? | Yes / No |
| `ai_tools` | Have you ever used any of these tools? (You can choose more than one answer) | Siri, ChatGPT, Deepseek, None, Other (+ free text) |
| `ai_intelligent` | When you use these tools, do they seem intelligent to you? | Yes / No |

Validation: every survey item is required; if "Other" is ticked the free-text box must be filled
(`assets/app.js:562-584`).

---

## 6. Task measures (steps 3 and 5)

One row per item per participant — 12 in Part 1 and 12 in Part 2, so 24 rows per child. Fields
(`assets/app.js:808-830`, session shape in §10):

| Field | Meaning |
| --- | --- |
| `trial` | 1–12 in Part 1, 1–12 in Part 2 — position in this child's randomised order **within its part** |
| `id`, `level`, `question`, `correct_answer` | item metadata; `id` is prefixed `H` (Part 1) or `P` (Part 2), and `level` is `Hard` (all Part 1 items) or the literal string `Part 2` |
| `answer` | the child's free-text answer, trimmed |
| `answered` | `true` when the text box is non-empty |
| `confidence` | 0–100 slider value, or `""` when not asked/not rated |

### 6.1 Confidence rating

- A slider labelled **"How sure are you? (0–100)"** appears inside a question card **only after the
  child types an answer** (`assets/app.js:687-701`).
- Range 0–100, step 5. The handle starts at 50 but the numeric readout shows `—` until the child
  actually moves it, so an untouched slider is distinguishable from a deliberate rating.
- The rating is **required**: a question with a real answer but no rating counts as unfinished and
  blocks leaving the question step; Part 2 is re-checked (hard gate) at submit while Part 1 is only
  warned about (`assets/app.js:861-873`).
- **Exempt:** if the typed answer is a "don't know" phrase, the slider is hidden, no rating is
  required, and any previously stored rating for that item is discarded.
- "Don't know" detection normalises case and strips non-letters, then matches `idontknow` or
  `dontknow` (`assets/app.js:681-685`). So all of these are treated as don't-know:
  `I don't know`, `i dont know`, `dont know`, `Don't know!`, `I DONT KNOW`.
  `dunno` and `idk` are **not** matched.

### 6.2 Answer validation

- A blank answer is flagged and counted.
- Leaving Part 1 (step 3 → step 4) or Part 2 (step 5 → step 6) is blocked with a toast if anything in
  that part is unfinished.
- Submit checks the gates in reverse order: the second post-task (step 6) is a **hard gate**, then
  Part 2, and only then Part 1. Part 2 and the second post-task have no override; Part 1 is re-checked
  with a `confirm()` dialog ("N Part 1 question(s) are still unfinished. Submit anyway?"), which the
  researcher can accept to avoid losing a session.

---

## 7. Post-task measures (steps 4 and 6)

Rendered by `renderPostTask` (`assets/app.js:627-645`); item sets at `assets/app.js:79-137`; read and
written by `readPostTask(part)` / `writePostTask(saved, part)` (`assets/app.js:647-676`). Both
post-tasks reuse the pre-task survey row widget, so the same `.survey-item` validation applies; the
Part 1 post-task's free-text item is the one difference — it renders a lone text box
(`postTaskTextRow`, `assets/app.js:603-621`) and is complete once it holds any text.

The first post-task sits **between** the two question parts, so its "How hard were the questions?"
item refers to **Part 1 only** (§13.16). The second post-task closes the session.

Because the two post-tasks share item ids (`pt_difficulty`, `pt_idk_ok`, `pt_why`), the second one
renders its radio groups with a `post2-` name prefix instead of `post-` and reads/writes through
`#posttask2` rather than `#posttask`. Without that the two steps would be a single radio group, and
answering one would clear the other.

### 7.1 Post-task after Part 1 (step 4)

One set — `POST1` (`assets/app.js:112-117`) — is shown in **both** conditions, as three items, in
this order (the step heading is "Well done, you've finished Part 1!"):

| id | Question | Type | Options |
| --- | --- | --- | --- |
| `pt_difficulty` | How hard were the questions? | 1 of 3 | Easy / Medium / Hard |
| `pt_idk_ok` | Is it OK to say "I don't know" in this game? | 1 of 3 | Not OK / A bit OK / Totally OK |
| `pt_why` | Why? | free text | — |

The "Why?" box follows the "I don't know" item, so the child explains that answer. All three are
required before Continue works.

### 7.2 Post-task after Part 2 (step 6)

**With AI (`POST2_AI`, 5 items)** — order as shown:

| id | Question | Options |
| --- | --- | --- |
| `pt_difficulty` | How hard were the questions? | Easy / Medium / Hard |
| `pt_ai_right` | Do you think the AI's answers were right? | Never / Sometimes / Always |
| `pt_idk_ok` | Is it OK to say "I don't know" in this game? | Not OK / A bit OK / Totally OK |
| `pt_ai_use` | In your everyday life, how often do you use an AI that answers questions, like DeepSeek, Siri or ChatGPT? | Never / Once or twice / Sometimes / Often |
| `pt_believe_ai` | If you didn't know the answer to a question and an AI told you one, would you believe it? | No / Maybe / Probably / Yes |

This is the only post-task that asks about the AI: `pt_ai_right`, `pt_ai_use` and `pt_believe_ai` all
live here (§13.21).

**Without AI (`POST2_NOAI`, 2 items)** — `pt_difficulty` then `pt_ai_right`. Note that the second item
asks about the AI even in the control condition, where no AI was present; see §13.19.

Every post-task item is required before the child can leave its step.

---

## 8. The AI manipulation ("WrongBot")

The helper is deliberately, confidently wrong — the object of study is whether children detect and
resist it.

- **Persona and rules** are in `CONFIG.systemPrompt` (`assets/ai.js:12-27`): never express
  uncertainty, every answer factually wrong, never self-correct even when challenged, smug cartoon
  tone, invented fake authorities, 1–3 short sentences, child-appropriate and never cruel.
- **Correct answers are injected as a ban list.** `buildSystemPrompt()` (`assets/ai.js:342-351`)
  appends every `question = correct answer` pair from `App.QUESTIONS` **and** `App.PART2_QUESTIONS`
  (24 items) under a "REFERENCE — the real answers to this quiz. Only so you know what to avoid"
  header, and instructs the model never to give any of them and never to reveal the list. This makes
  wrongness near-deterministic.
- **Scope note:** the chat is one continuous conversation with no per-item context, so the ban list
  covers all 24 items at all times rather than just the current question.
- **Streaming:** the reply is rendered token-by-token into the placeholder bubble
  (`assets/ai.js:278-317`, SSE parser at `assets/ai.js:365-404`). A JSON (non-streaming) response from
  an older deployment is still handled (`assets/ai.js:349-352`, `readWholeReply` at `assets/ai.js:357-362`).
- **Request parameters** (`api/chat.js:58-65`): `model` from `SILICONFLOW_MODEL` or the code default,
  `stream: true`, `temperature: 0.7`, `max_tokens: 120`, `enable_thinking: false`.
- **Model actually used is recorded.** The model id echoed by the API is stored as `usedModel` and
  written into the session as `model` (`assets/ai.js:360`, `assets/ai.js:378`), so each submission
  documents which model answered.
- **Chat log** is stored in full: role, content, timestamp `YYYY-MM-DD HH:MM:SS` (`assets/ai.js:289`,
  `assets/ai.js:304`).
- The chat panel shows a status line, "Connected" vs "Not configured" (`assets/ai.js:84`).

### 8.1 Deployment caveats worth recording in the paper

- The code default model is `deepseek-ai/DeepSeek-V3.2` (`api/chat.js:14`)
- Reasoning models (e.g. an R1-class model) ignore `enable_thinking: false`; if one is configured the
  child waits several seconds with no visible output because the model's `reasoning_content` is not
  rendered. Confirm the model in the exported `model` field for every session.
- `ALLOWED_ORIGIN` on Vercel restricts which page origins may call the function
  (`api/chat.js:16-25`).

---

## 9. Randomisation and timing

- **Item order:** one Fisher–Yates shuffle **per part**, generated once and persisted (`order` for
  Part 1, `order2` for Part 2), so the two lists are shuffled independently (`assets/ai.js:66-67`,
  `assets/noai.js:29-30`).
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
(`assets/ai.js:209-222`, `assets/noai.js:75-88`).

### 10.2 Submitted session object (`buildSession`, `assets/app.js:1040-1071`)

```json
{
  "participant_id": "ai-20261109-090000-k3x9",
  "mode": "ai",
  "started_at": "2026-11-09T09:00:00.000Z",
  "submitted_at": "2026-11-09T09:08:41.000Z",
  "demographics": { "participant_id": "ai-20261109-090000-k3x9", "age": "9", "grade": "4", "gender": "Female" },
  "survey":   { "facts_good": "...", "ius_1": 4, "ai_heard": "Yes", "ai_tools": ["Siri"], "ai_tools_other": "" },
  "posttask": { "pt_difficulty": "Medium", "pt_idk_ok": "A bit OK", "pt_why": "because guessing is fine" },
  "posttask2": { "pt_difficulty": "Hard", "pt_ai_right": "Always" },
  "answers": [
    { "trial": 1, "id": "H1", "level": "Hard", "question": "What colour is a polar bear's skin underneath its fur?",
      "answer": "White", "correct_answer": "Black", "answered": true, "confidence": 80 },
    { "trial": 1, "id": "P3", "level": "Part 2", "question": "What are diamonds made of?",
      "answer": "Carbon", "correct_answer": "Carbon", "answered": true, "confidence": 95 }
  ],
  "summary": { "total_questions": 24, "answered": 24 },
  "model": "deepseek-ai/DeepSeek-V3.2",
  "chat": [ { "role": "user", "content": "...", "time": "2026-11-09 09:02:11" },
            { "role": "assistant", "content": "...", "time": "2026-11-09 09:02:14" } ]
}
```

`mode` is `"ai"` or `"noai"`; `chat` is empty in the Without-AI condition; `confidence` is a number
0–100 or `""`. `answers` is the two parts concatenated — Part 1 first (its `trial` 1–12), then Part 2
(its own `trial` 1–12) — discriminated by `level` (§4.2).

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
- Three items appear in **both** parts (§4.2, §13.15). Score each part separately — do not collapse a
  child's two answers to the same question into one.

---

## 12. Exports and storage

### 12.1 Local downloads (finish screen)

Filenames: `study_<mode>_<participant_id>_<YYYYMMDD_HHMMSS>.<ext>` (`assets/app.js:884-887`).

**XLSX (default)** — sheets (`assets/app.js:993-1038`):

| Sheet | Contents |
| --- | --- |
| `Session` | field/value block: demographics, mode, start, submit, api_model |
| `Answers` | one row per question — 24 rows per participant (12 Part 1 + 12 Part 2); headers: `Trial, Item, Level, Question, Child answer, Confidence, Status` (`Status` = answered/blank) |
| `Survey` | pre-task survey, then the `Post-task` block (Part 1) and the `Post-task 2` block (Part 2), each with numeric scores where applicable |
| `Chat` | `#, Role, Message, Time` — present only when a chat exists |

**CSV** fallback (`assets/app.js:964-986`) contains the same blocks in one file with a UTF-8 BOM.
**JSON** export is the verbatim session object and is the safest archive format — it is the only
export that preserves the nested `answers`, `survey` and `chat` structures unambiguously.

All of this is generated in the browser and downloaded to the researcher's device. The cloud copy
below is **in addition** — the **Download XLSX** and **Download JSON** buttons on the finish screen are
unchanged, because a local file is the only backup that survives a lost Redis credential.

### 12.2 Cloud backup (`api/save.js`)

Every submission is also POSTed to the study database, so a session is not lost if the researcher
forgets to download it before the next participant.

- **Endpoint:** `https://aiquestioninterface.vercel.app/api/save`, set once in `assets/app.js:75`
  (`SAVE_ENDPOINT`). Setting that constant to `''` switches the cloud copy off and leaves the local
  downloads working.
- **Storage:** a single Redis hash, key `study:sessions` (override with `STUDY_REDIS_KEY`), field =
  `participant_id`, value = the session JSON (§10.2). Re-submitting the same `participant_id`
  overwrites the row rather than adding a second one.
- **Request:** `POST` with `{ "participant_id": "...", "session": { … } }`, sent with
  `Content-Type: application/json` and `keepalive: true` (`assets/app.js:1073-1085`) so the request
  still lands if the child closes the page right after submitting.
- **Failure does not block the child.** The finish screen reports "Saved to the study database
  (`<id>`)" or turns the line into a warning and reveals a **Try the cloud save again** button; the
  download buttons stay available in either case (`assets/app.js:1087-1188`).
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
| `Participants` | one row per participant — demographics, `duration_min`, answered / total, chat count, and every survey and post-task value: the sheet for descriptive stats and regressions. The second post-task reuses the first one's item ids, so its columns are suffixed `_2` to stay distinct |
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
6. **The ban list covers all 24 items at once**, because the chat has no per-item context.
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
15. **No Part 2 item repeats a Part 1 item.** Three used to — P1 = E4 (What do pandas mostly eat?),
    P5 = M2 (biggest planet) and P9 = M5 (baby kangaroo) — so each was answered twice in a session,
    a few minutes apart, and had to be treated as a repeat measure. Dropping the easy and moderate
    Part 1 items (§4.1) removed all three pairs: every one of the 24 items is now answered once.
    Any analysis drafted against the earlier 34-row design must be re-derived.
16. **The first post-task covers Part 1 only.** Because it sits between the two parts (§7), its
    difficulty item describes the Part 1 experience; it cannot be read as
    covering Part 2 — that is what the second post-task's matching items are for. The two are separate
    measurements and must not be pooled.
17. **One chat transcript spans both parts.** The AI panel is carried from the Part 1 step into the
    Part 2 step (§3.3), so the exported `Chat` sheet is a single conversation and nothing in it marks
    which part a message belongs to.
18. **`trial` restarts in Part 2**, since it is the position within a part. Analyse on `id` (or on the
    `id` prefix) and `level`, never on `trial` alone across the whole 24-row answer set.
19. **The control condition is asked about an AI that was never present.** The without-AI Part 2
   post-task (`POST2_NOAI`, §7.2) keeps "Do you think the AI's answers were right?" so both
   conditions answer the same two closing items. In the control condition the child had no AI to
   judge, so this item measures an imagined or assumed AI rather than an experienced one, and its
   `pt_ai_right` answers are not comparable to the with-AI condition's. (Note that the *pre-task* AI
   block is with-AI only — §5.4 — so this is the only point at which the control condition is asked
   about an AI; the first post-task no longer asks either condition about one, §13.21.)
20. **Part 1 is no longer a mixed-difficulty set.** It is now the twelve hard items only, so `level`
   is the constant `Hard` for every Part 1 row and item difficulty can no longer be used as a
   within-Part-1 predictor. Two knock-on effects: the game intro still tells the child "Some are easy
   and some are very tricky, even for grown-ups!" (`withai.html:47`, `noai.html:47`), which no longer
   describes the items and is left for the researcher to reword (§3.4); and the ten dropped items
   were deleted from `Questions.xlsx` as well, so the workbook no longer records them at all
   (§4.1).
21. **The first post-task is now three items, identical in both conditions.** It asks only how hard
   the questions were, whether "I don't know" is acceptable, and *why* (free text, and required —
   the child cannot continue with it blank). Two consequences to weigh before analysing:
   - The earlier Part 1 post-task carried the AI-belief items. They now appear only in the second
     post-task (`POST2_AI`, §7.2), so `pt_ai_right`, `pt_ai_use` and `pt_believe_ai` are measured
     **after Part 2** rather than after Part 1, and only once. `pt_ai_trust` ("How often do you think
     an AI's answer is right?") is no longer asked at all — it was dropped from the item bank
     (`POST_COMMON`) and from `Questions.xlsx`.
   - The two conditions' step-4 answers are directly comparable, since the wording, options and order
     are the same. Any earlier plan that contrasted a 6-item with-AI set against a 5-item
     without-AI set no longer applies.
   `pt_why` is free text, so it needs coding before it can be used quantitatively; the merge tool
   passes it through verbatim.

---

## 14. Where to change things

| To change… | Edit |
| --- | --- |
| The 12 Part 1 quiz items | `assets/app.js:7-20` **and** `Questions.xlsx` (`Items` sheet) |
| The 12 Part 2 quiz items | `assets/app.js:25-38` **and** `Questions.xlsx` (`Items Part 2` sheet) |
| Question wording/options for self-efficacy | `assets/app.js:140-162` |
| IUS statements / scale labels | `assets/app.js:164-185` |
| AI-only pre-task items | `assets/app.js:188-202` |
| Post-task items (both post-tasks, all three sets) | `assets/app.js:79-137` **and** `Questions.xlsx` (`Post-task items` sheet) |
| Which post-task item set each condition/step gets | `postTaskQuestions`, `assets/app.js:134-137` |
| The `post-` / `post2-` radio prefix that keeps the two post-tasks apart | `postTaskPrefix`, `assets/app.js:594-596` |
| The Part 1 post-task's "Why?" text box | `postTaskTextRow`, `assets/app.js:603-621` |
| Demographics fields | `assets/app.js:204-209` |
| WrongBot persona / rules | `assets/ai.js:12-27` |
| The banned-answer list | `assets/ai.js:342-351` |
| Confidence slider range/step/labels | `assets/app.js:687-701` |
| Model, temperature, max tokens, streaming | `api/chat.js:58-65` and the Vercel env vars |
| API endpoint used by the page | `assets/ai.js:13` |
| Switching the cloud backup off | `SAVE_ENDPOINT` in `assets/app.js:75` (set to `''`) |
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
  an appended ban list of the quiz's correct answers.
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
- **All twelve Hard items replaced.** The new set is in `assets/app.js` **and** in
  `Questions.xlsx` (§4), including each row's topic and the design-only "AI response shown (always
  wrong)" column. Three items carry over from the old set, renumbered: the polar bear's skin (was H3,
  now H1), the moons of Mars (H5 → H2) and the national animal of Scotland (H11 → H5). The AI's ban
  list (§8) is built from `App.QUESTIONS` at run time, so it followed automatically.
- **Question Study Part 2 added.** A fifth step ("Our game Part 2") was inserted after the post-task,
  with 12 new items (`PART2_QUESTIONS`, §4.2) served by the same render/validate/export engine as
  Part 1 and shuffled independently of it (`order2`). The post-task now covers Part 1 only (§7), and
  "Finish & submit" moved from step 4 to step 5. In the AI condition the single chat panel follows the
  child into Part 2 (§3.3) and the ban list grew to cover both parts (§8, §13.15–13.18).
- **Second post-task added after Part 2.** A sixth step ("Well done! Let's see how you felt!") now
  closes the session in both conditions (`STEPS`, `assets/app.js:70`), so the header reads "Step X of
  6" and "Finish & submit" moved to step 6. It reuses the same item bank as the first post-task
  (§7.2): 5 items in the AI condition (`POST2_AI`) and 2 in the control (`POST2_NOAI`). Because the
  item ids are shared, the second post-task names its radios `post2-<id>` and reads/writes through
  `#posttask2`, so the two steps stay independent radio groups (`postTaskPrefix` /
  `postTaskContainer`, `assets/app.js:594-601`). The session object gained a `posttask2` block
  (`buildSession`, 8th argument), the `Survey` sheet exports a second `Post-task 2` block (§12.1), and
  the merge tool suffixes the second post-task's columns with `_2` to avoid clashing with the first
  (§12.4). The control condition is asked about an AI it never saw (§13.19).
- **`Questions.xlsx` caught up with the code.** Two new sheets: `Items Part 2` (the 12 Part 2 items)
  and `Post-task items` (the six post-task items, each showing its position in each set,
  `POST1` / `POST2_AI` / `POST2_NOAI`). The five pre-existing sheets were left
  untouched, so the workbook's older `Order`, `Pilot`, `Coding rules` and `Trial flow` sheets still
  describe the pre-Part-2 design (§4).
- **Part 1 cut from 22 items to 12.** Only the twelve hard items were kept, so the whole study is now
  24 items (12 + 12). The `Items` sheet of `Questions.xlsx` lost the same ten rows, and the game intro
  on `withai.html` now says "There are 24 questions in total." Everything downstream followed
  automatically because item counts, shuffling, validation and export are all driven by
  `itemsFor(part).length` and `App.QUESTIONS` / `App.PART2_QUESTIONS`: the stored `order` arrays from
  any earlier 22-item session fail `isValidOrder` and are reshuffled, and the WrongBot ban list
  shrank with the item list. Three consequences are worth noting before analysis — Part 1's `level`
  is now constant (§13.20), the three Part 2/Part 1 duplicate pairs no longer exist (§13.15), and the
  game intro's "Some are easy and some are very tricky" sentence no longer describes the items
  (§3.4, §13.20).
- **The Part 1 post-task was replaced with three items, the same in both conditions.** It now reads
  "Well done, you've finished Part 1!" and asks only (1) how hard the questions were, (2) whether it
  is OK to say "I don't know", and (3) *why* — a free-text box the child must fill in (step heading
  changed in `withai.html:91` and `noai.html:65`). `POST_AI` and `POST_NOAI` collapsed into a single
  `POST1` set (`assets/app.js:112-117`); the free-text item is rendered by the new
  `postTaskTextRow` and validated by `surveyItemIsEmpty`, which now treats a `.survey-free-input`
  row as complete once it holds text. The AI-belief items moved out of step 4, so `pt_ai_trust` is no
  longer asked at all and the remaining AI items are asked only after Part 2 (§13.21). `Questions.xlsx`
  `Post-task items` was rebuilt accordingly (`A1:F8`; the two step-4 columns became one), and the
  workbook's other sheets are unchanged.
