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
  back to CSV (`assets/app.js:990-994`). The merge tool loads SheetJS the same way, so it too needs an
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
> ➖ 0 points (your score stays the same) if you don't know the answer, please write "I don't know" (you can also write "idk", "idontknow" or "??")
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

Each item object carries `id`, `level`, `question`, the child-facing `answer` (the
real, correct answer, used by the exports) and `wrong` — the one specific incorrect answer WrongBot
is required to give to that question (see §8). Both sheets keep that same text in their
`AI response shown (always wrong)` column, so the manipulation's wording is fixed in the material
rather than being left to the model. `wrong` is never shown to the child in the page chrome; it is
sent to the model only, inside the system prompt.

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
| P4 | Part 2 | How many days in 2024? | 366 |
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

### 5.1 Demographics (step 1) — `assets/app.js:200-205`

| Field | Type | Rules |
| --- | --- | --- |
| Participant ID | text | required — entered by whoever sets up the device |
| Age | number | required, 3–18 |
| Grade | text | required |
| Gender | select | required — Female / Male / Prefer not to say |

No name, or any other direct identifier, is collected. The app does **not** generate an ID: the field
starts empty under the placeholder `e.g. P01` and must be filled in before the child can continue
(`validateDemographics`). Whatever is typed becomes the session's `participant_id`, is repeated inside
`demographics` (§10.2), and is the Redis field name. A code used twice does **not** overwrite: the
first record keeps it and the newcomer is stored under a suffixed id (§13.11).

### 5.2 Self-efficacy items (step 2, block "Questions") — `assets/app.js:142-164`

Four single-choice statements, each with the same four options
(`Not true` / `A little true` / `Mostly true` / `Very true`):

1. `facts_good` — I am good at answering quiz questions about facts, like animals, space and countries.
2. `hard_questions` — I can answer quiz questions that even grown-ups find hard.
3. `work_out_hard` — I can work out hard questions if I try hard enough.
4. `think_carefully` — I can answer most quiz questions if I think carefully.

### 5.3 Intolerance-of-uncertainty statements (step 2, block "How much is this like you?")

Four statements (`ius_7`, `ius_8`, `ius_9`, `ius_11`, `assets/app.js:176-181`), each answered on a
shared 5-point scale (`assets/app.js:166-172`): 1 = "Not at all like me", 2 = "A little like me",
3 = "Somewhat like me", 4 = "Mostly like me", 5 = "Entirely like me". The four keep their original
item numbers from the source instrument, so the exported columns still say which item they are.

When I am not sure of something, I cannot work very well · I always want to know what will happen to
me in the future · I do not like being taken by surprise · I should be able to prepare for everything
in advance.

### 5.4 AI-experience items (step 2, block "About AI") — **with-AI condition only**

`assets/app.js:184-198`, rendered only when `condition === 'ai'` (`assets/app.js:483`):

| id | Question | Options |
| --- | --- | --- |
| `ai_heard` | Have you ever heard of Artificial Intelligence (AI)? | Yes / No |
| `ai_tools` | Have you ever used any of these tools? (You can choose more than one answer) | Siri, ChatGPT, Deepseek, None, Other (+ free text) |
| `ai_intelligent` | When you use these tools, do they seem intelligent to you? | Yes / No |

Validation: every survey item is required; if "Other" is ticked the free-text box must be filled
(`assets/app.js:558-580`).

---

## 6. Task measures (steps 3 and 5)

One row per item per participant — 12 in Part 1 and 12 in Part 2, so 24 rows per child. Fields
(`assets/app.js:804-826`, session shape in §10):

| Field | Meaning |
| --- | --- |
| `trial` | 1–12 in Part 1, 1–12 in Part 2 — position in this child's randomised order **within its part** |
| `id`, `level`, `question`, `correct_answer` | item metadata; `id` is prefixed `H` (Part 1) or `P` (Part 2), and `level` is `Hard` (all Part 1 items) or the literal string `Part 2` |
| `answer` | the child's free-text answer, trimmed |
| `answered` | `true` when the text box is non-empty |
| `confidence` | 0–100 slider value, or `""` when not asked/not rated |

### 6.1 Confidence rating

- A slider labelled **"How sure are you? (0–100)"** appears inside a question card **only after the
  child types an answer** (`assets/app.js:683-697`).
- Range 0–100, step 5. The handle starts at 50 but the numeric readout shows `—` until the child
  actually moves it, so an untouched slider is distinguishable from a deliberate rating.
- The rating is **required**: a question with a real answer but no rating counts as unfinished and
  blocks leaving the question step; Part 2 is re-checked (hard gate) at submit while Part 1 is only
  warned about (`assets/app.js:857-869`).
- **Exempt:** if the typed answer is a "don't know" phrase, the slider is hidden, no rating is
  required, and any previously stored rating for that item is discarded.
- "Don't know" detection keeps only letters and question marks, then matches `idontknow`, `dontknow`,
  `idk`, or a string of nothing but question marks (`assets/app.js:677-680`). So all of these are
  treated as don't-know: `I don't know`, `i dont know`, `dont know`, `Don't know!`, `I DONT KNOW`,
  `idk`, `IDK`, `idk?`, `idontknow`, `?`, `??`, `???`.
  `dunno` and `idk` misspellings such as `i d k` are **not** matched.

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

Rendered by `renderPostTask` (`assets/app.js:623-641`); item sets at `assets/app.js:79-133`; read and
written by `readPostTask(part)` / `writePostTask(saved, part)` (`assets/app.js:643-672`). Both
post-tasks reuse the pre-task survey row widget, so the same `.survey-item` validation applies; the
free-text "Why?" item is the one difference — it renders a lone text box
(`postTaskTextRow`, `assets/app.js:599-617`) and is complete once it holds any text.

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

**With AI (`POST2_AI`, 6 items)** — order as shown:

| id | Question | Type | Options |
| --- | --- | --- | --- |
| `pt_difficulty` | How hard were the questions? | 1 of 3 | Easy / Medium / Hard |
| `pt_ai_right` | Do you think the AI's answers were right? | 1 of 3 | Never / Sometimes / Always |
| `pt_idk_ok` | Is it OK to say "I don't know" in this game? | 1 of 3 | Not OK / A bit OK / Totally OK |
| `pt_why` | Why? | free text | — |
| `pt_ai_use` | In your everyday life, how often do you use an AI that answers questions, like DeepSeek, Siri or ChatGPT? | 1 of 4 | Never / Once or twice / Sometimes / Often |
| `pt_believe_ai` | If you didn't know the answer to a question and an AI told you one, would you believe it? | 1 of 4 | No / Maybe / Probably / Yes |

This is the only post-task that asks about the AI, so `pt_ai_right`, `pt_ai_use` and `pt_believe_ai`
are put to the with-AI condition only (§13.19, §13.21).

**Without AI (`POST2_NOAI`, 3 items)** — `pt_difficulty`, `pt_idk_ok`, then `pt_why`. The control
condition is therefore never asked about an AI at any point in the study (§13.19).

Both Part 2 sets place `pt_why` immediately after `pt_idk_ok`, so as in Part 1 the child explains that
answer. Every item in every post-task is required before the child can leave its step.

---

## 8. The AI manipulation ("WrongBot")

The helper is deliberately, confidently wrong — the object of study is whether children detect and
resist it.

- **Persona and rules** are in `CONFIG.systemPrompt` (`assets/ai.js:12-27`): never express
  uncertainty, every answer wrong, never self-correct even when challenged, and a
  deliberately skimpy delivery — one short sentence, two at most, opened with a throwaway proof
  claim ("I checked the web", "I looked it up", "I searched the internet"), with no reasoning and no
  supporting facts, and with the word "fact" itself banned from the replies. Child-appropriate and
  never cruel.
  Note that the brevity rules are load-bearing: an answer that explains itself makes the wrongness
  obvious to a child, whereas a bare confident claim is much harder to spot.
- **The wrong answer to every item is pinned in the material, not left to the model.**
  `buildSystemPrompt()` (`assets/ai.js:343-356`) appends a script built from `App.QUESTIONS` **and**
  `App.PART2_QUESTIONS` (24 items), three lines per item:
  `Q: …` / `real answer (never say this): …` / `your answer (always say this): …`, under a header
  telling the model that each of its answers is already decided, that it must make the same claim
  every time it is asked, and that it must never repeat or reveal the list. The `your answer` values
  are the items' `wrong` fields (§4), i.e. the workbook's `AI response shown (always wrong)` column.
  Effect: the wrongness is deterministic in content — rephrasing or shortening is allowed, but the
  claim itself cannot drift — and the model still has to answer off-list questions (which are not
  quiz items) as before. See §13.23.
- **Scope note:** the chat is one continuous conversation with no per-item context, so the pinned
  script covers all 24 items at all times rather than just the current question.
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

### 10.2 Submitted session object (`buildSession`, `assets/app.js:1036-1067`)

```json
{
  "participant_id": "ai-20261109-090000-k3x9",
  "mode": "ai",
  "started_at": "2026-11-09T09:00:00.000Z",
  "submitted_at": "2026-11-09T09:08:41.000Z",
  "demographics": { "participant_id": "ai-20261109-090000-k3x9", "age": "9", "grade": "4", "gender": "Female" },
  "survey":   { "facts_good": "...", "ius_7": 4, "ai_heard": "Yes", "ai_tools": ["Siri"], "ai_tools_other": "" },
  "posttask": { "pt_difficulty": "Medium", "pt_idk_ok": "A bit OK", "pt_why": "because guessing is fine" },
  "posttask2": { "pt_difficulty": "Hard", "pt_ai_right": "Sometimes", "pt_idk_ok": "Totally OK", "pt_why": "because the AI helps", "pt_ai_use": "Sometimes", "pt_believe_ai": "Maybe" },
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

Filenames: `study_<mode>_<participant_id>_<YYYYMMDD_HHMMSS>.<ext>` (`assets/app.js:880-883`).

**XLSX (default)** — sheets (`assets/app.js:989-1034`):

| Sheet | Contents |
| --- | --- |
| `Session` | field/value block: demographics, mode, start, submit, api_model |
| `Answers` | one row per question — 24 rows per participant (12 Part 1 + 12 Part 2); headers: `Trial, Item, Level, Question, Child answer, Confidence, Status` (`Status` = answered/blank) |
| `Survey` | pre-task survey, then the `Post-task` block (Part 1) and the `Post-task 2` block (Part 2), each with numeric scores where applicable |
| `Chat` | `#, Role, Message, Time` — present only when a chat exists |

**CSV** fallback (`assets/app.js:960-982`) contains the same blocks in one file with a UTF-8 BOM.
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
  `participant_id`, value = the session JSON (§10.2).
- **A repeated code keeps both records.** Two children can be handed the same code, so a clash never
  overwrites: the first submission keeps the code and the newcomer is stored under the next free
  suffixed id — `01`, then `01-b`, then `01-c`, up to `01-z` (`SUFFIX_LETTERS`,
  `storeSession`/`claimId`). The suffix is claimed with `HSETNX`, which is atomic, so two devices
  submitting the same code at the same instant cannot take the same slot. Requests 27 and beyond for
  one code fail with `502` rather than looping.
  The **only** case that still overwrites is a re-submission of the *same* sitting: the stored record
  must match on both `started_at` and `mode` (`isSameRun`). That makes the finish screen's
  **Try the cloud save again** button idempotent instead of minting a phantom twin, while a genuine
  second child — whose `started_at` differs — is never mistaken for a retry. A session with no
  `started_at` is always treated as a new record, never as a retry.
  The response carries `participant_id` (the id actually used), `requested_id`, and the flags
  `suffixed` / `overwritten`; the page adopts the resolved id so the local downloads and the
  `study.last.<mode>` copy match the stored record, and tells the researcher
  "Code 01 was already used, so this record was saved as 01-b." (`assets/app.js:1083-1147`, §13.11).
- **Request:** `POST` with `{ "participant_id": "...", "session": { … } }`, sent with
  `Content-Type: application/json` and `keepalive: true` (`assets/app.js:1069-1081`) so the request
  still lands if the child closes the page right after submitting.
- **Failure does not block the child.** The finish screen reports "Saved to the study database
  (`<id>`)" or turns the line into a warning and reveals a **Try the cloud save again** button; the
  download buttons stay available in either case (`assets/app.js:1083-1184`).
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

- Records are de-duplicated on **code + `started_at` + mode**, newest winning, so re-dropping an
  export (or an old export plus a newer one) collapses to one copy of each sitting — but two children
  who were handed the same code are **both kept**, because their `started_at` differs. Keying on
  `participant_id` alone used to merge those two into one row and silently drop a child.
  When a code repeats, the dropdown label and the per-participant filename both carry the submission
  time (`tt — ai · 21:40` → `tt_20261116-2140.xlsx`), so the label is unambiguous and Option 2/3
  cannot overwrite a download named after the other record.
- Six outputs: **(1)** one combined workbook, **(2)** one chosen participant (a dropdown listing the
  loaded records by code, condition and submission time), **(3)** one workbook per participant,
  bundled into a single `.zip` written by the page itself, **(4)** the same per-participant
  workbooks with each one filed under `with-ai/` or `without-ai/` inside the zip, so the two
  conditions can be analysed separately without splitting them by hand, **(5)** Option 4's
  grouped zip restricted to participants who typed Chinese anywhere — an answer, a post-task box, a
  survey free-text item, or a message to the AI — with each surviving record still exported whole, so
  the item numbering in `Trial` stays intact, and **(6)** every record filed by grade and condition
  (`grade3-withai/`, `grade3-withoutai/`, `grade4-withai/`, …). Option 6 also appends `-translated` to the filename
  of any record whose child wrote in a language other than English, which is the list to translate
  before the two arms of a grade are compared.
- Per-participant files are named `<participant_id>.xlsx`, plus `_<yyyyMMdd-HHmm>` when the code
  repeats (§12.4).
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
5. **The AI's replies are not a fixed script.** They are generated by a general-purpose LLM under a
   "be confidently wrong" prompt that also pins, per item, the one wrong answer it must give (§8).
   The *claim* is therefore fixed, but its wording is not — it varies between children and between
   sessions; the specific model is recorded per session.
6. **The pinned-answer script covers all 24 items at once**, because the chat has no per-item context.
7. **"Ask AI" is a nudge, not an action**: it focuses the chat and never sends a question for the
   child. Whether a child actually asked the AI is only observable from the chat log.
8. **Shuffled item order** means item position varies between participants; use `trial` and `id`
   together in any position-sensitive analysis.
9. **One in-progress session per condition per device.** Saved state is keyed by condition
   (`study.ai.state`, `study.noai.state`), not by participant. The **Reset** button must be pressed
   between participants; otherwise the next child inherits the previous child's in-progress state.
   (Submitted sessions are copied to `study.last.<mode>` and are not affected by Reset.)
   Reset is also the only thing that clears `started_at` (`sessionStorage`, `assets/ai.js:36-37`,
   `assets/ai.js:212`), and `started_at` is how the database recognises a re-submission of the same
   sitting (§12.2). So a second child on an un-reset tab can carry the same `started_at` and `mode` as
   the first, and be mistaken for that child resubmitting — which only actually costs data if they are
   also given the same code. Treat Reset between participants as mandatory for this reason too.
10. **No direct identifier is collected, but the cloud store is not anonymous.** Nobody types a name
    any more (§5.1), and no field of the session object holds one (§10.2). The Redis copy is still
    child data sitting on a third-party host, readable by anyone with the Redis credentials or the
    `EXPORT_TOKEN`, and `age` + `grade` + `gender` together are quasi-identifying. Exports saved
    before the name field was removed still contain the names they collected; those are legacy files
    and cannot be back-filled.
11. **A repeated participant ID no longer loses data — the record gains a suffix instead.** The app
    still generates nothing: whatever is typed in step 1 becomes the ID (§5.1). Two children handed
    the same code both survive, because the database keeps the first under the code and stores the
    newcomer under `01-b`, `01-c` … (§12.2), and the page adopts that resolved id so the downloads
    match what is stored. Two things remain worth watching:
    - The **only** overwrite left is a re-submission of the same sitting, recognised by a matching
      `started_at` + `mode`, so the "try again" button cannot create a twin. A child deliberately
      re-running the study is a *new* run and therefore creates `01-b` — there is no way to correct a
      stored record in place; edit or delete it in Redis/the merged workbook instead.
    - The suffix lives **only in the Redis field name**. The stored record still carries the code the
      browser sent, because the POST body is written verbatim, and the export reads the hash with
      `HVALS`, which returns values without field names (§12.3). So an export of two children who
      shared a code arrives as two records that both say `01`, and only the merge tool's time stamp
      (label and filename, §12.4) tells them apart. Renaming the affected rows in Excel, or switching
      the export to `HGETALL` and the write to stamp the resolved id, would close this properly.
12. **The cloud path depends on free tiers.** Storage is Upstash Redis (free: 256 MB, 500K commands
    per month) called from a Vercel function. Vercel's Hobby plan is licensed for personal,
    non-commercial use only, which is worth confirming before a funded or institutional deployment.
    A study of this size is negligible in storage terms — roughly 1 MB for 100 participants, against
    the 200 KB per-session ceiling (§12.2). Each submission costs 2–4 Redis commands rather than 2,
    because the id is now claimed with `HSETNX` before the count is read; even a few hundred
    participants stays in the low thousands against a 500K monthly allowance.
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
19. **The control condition is never asked about an AI.** Its only post-task items are "How hard were
   the questions?" and whether "I don't know" is acceptable (§7.2); the pre-task AI block is with-AI
   only (§5.4), and the first post-task carries no AI item either (§13.21). So `pt_ai_right`,
   `pt_ai_use` and `pt_believe_ai` have no value at all for `noai.html` — those columns are blank in
   the merged workbook, and the AI-belief measures exist only for the with-AI condition. (Earlier the
   control was asked "Do you think the AI's answers were right?" after Part 2, which measured an
   imagined rather than an experienced AI; that item has been removed.)
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
     post-task (`POST2_AI`, §7.2) and only in the with-AI condition, so `pt_ai_right`, `pt_ai_use`
     and `pt_believe_ai` are measured **after Part 2** rather than after Part 1, and only once.
     `pt_ai_trust` ("How often do you think an AI's answer is right?") is no longer asked at all — it
     was dropped from the item bank (`POST_COMMON`) and from `Questions.xlsx`.
   - The two conditions' step-4 answers are directly comparable, since the wording, options and order
     are the same. Any earlier plan that contrasted a 6-item with-AI set against a 5-item
     without-AI set no longer applies.
22. **"Why?" is asked twice — after each part — and each one is free text.** `pt_why` sits at step 4
   in both conditions and again at step 6 in both conditions, so a child writes two reasons: one
   about Part 1 and one about Part 2. Both are required, and the two are only distinguishable by
   which post-task block they came from (§12.1) — in the merged workbook the step-6 one is the
   `_2`-suffixed column (§12.4). Like any free text they need coding before quantitative use; the
   merge tool passes them through verbatim. Note also that `pt_difficulty` and `pt_idk_ok` are
   likewise asked at both steps in both conditions, so a Part 1 → Part 2 change score can be derived
   for each.
23. **The wrong answer to each item is authored, not model-chosen** (§8). Before this, testing the
   tofu item three times returned kidney beans, then lima beans, then pinto beans — the same child
   re-asking inside one session, or two children comparing notes, would see the AI contradict itself
   and could conclude the AI is simply making things up rather than believing something false. The
   fix moves the content of the manipulation out of the prompt's hands: every item now carries a
   `wrong` field (§4) which is sent to the model as a required answer, and the instruction is to make
   the same claim every time. The reply is still generated text, so phrasing, length and the opener
   still vary run to run; only the claim is now stable. Two consequences for the record:
   - `wrong` must be edited alongside `question`/`answer` in **both** `assets/app.js` and
     `Questions.xlsx` (§4); nothing reads the workbook at run time, so a mismatch between the two is
     silent. The Part 2 wrong answers were authored in this change and added to the workbook, which
     had only ever held them for Part 1.
   - Pinning is not a hard guarantee — it is a prompt-level constraint on a general-purpose model, so
     an occasional drift is still possible and the exported `Chat` sheet is the check. Lowering
     `max_tokens` in `api/chat.js` would not affect this either way.

---

## 14. Where to change things

| To change… | Edit |
| --- | --- |
| The 12 Part 1 quiz items — and each item's `wrong` answer | `assets/app.js:7-20` **and** `Questions.xlsx` (`Items` sheet) |
| The 12 Part 2 quiz items — and each item's `wrong` answer | `assets/app.js:25-38` **and** `Questions.xlsx` (`Items Part 2` sheet) |
| Question wording/options for self-efficacy | `assets/app.js:142-164` |
| IUS statements / scale labels | `assets/app.js:166-181` |
| AI-only pre-task items | `assets/app.js:184-198` |
| Post-task items (both post-tasks, all three sets) | `assets/app.js:79-133` **and** `Questions.xlsx` (`Post-task items` sheet) |
| Which post-task item set each condition/step gets | `postTaskQuestions`, `assets/app.js:136-139` |
| The `post-` / `post2-` radio prefix that keeps the two post-tasks apart | `postTaskPrefix`, `assets/app.js:590-592` |
| The post-tasks' "Why?" text boxes | `postTaskTextRow`, `assets/app.js:599-617` |
| Demographics fields | `assets/app.js:200-205` |
| WrongBot persona / rules | `assets/ai.js:12-27` |
| The pinned wrong answers the AI must give (the `wrong` fields, §8) | `assets/app.js:7-38` **and** `Questions.xlsx` (`Items` / `Items Part 2` col. E) |
| The pinned-answer script and how it is built | `buildSystemPrompt`, `assets/ai.js:343-356` |
| Confidence slider range/step/labels | `assets/app.js:683-697` |
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
  (§7.2): 6 items in the AI condition (`POST2_AI`) and 3 in the control (`POST2_NOAI`) as the sets
  stand now — 5 and 2 when first added; the later "Why?" and dropped-AI-item changes are logged
  below. Because the
  item ids are shared, the second post-task names its radios `post2-<id>` and reads/writes through
  `#posttask2`, so the two steps stay independent radio groups (`postTaskPrefix` /
  `postTaskContainer`, `assets/app.js:590-597`). The session object gained a `posttask2` block
  (`buildSession`, 8th argument), the `Survey` sheet exports a second `Post-task 2` block (§12.1), and
  the merge tool suffixes the second post-task's columns with `_2` to avoid clashing with the first
  (§12.4).
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
- **More ways to say "I don't know".** `isDontKnow` (`assets/app.js:677-680`) now also accepts `idk`
  (with or without a trailing `?`) and a string of nothing but question marks (`?`, `??`, `???`),
  alongside the existing `I don't know` / `dont know` / `idontknow`. Those answers hide the confidence
  slider and are exempt from the rating requirement, exactly as before (§6.1). The game intro on both
  pages now names the extras: `please write "I don't know" (you can also write "idk", "idontknow" or
  "??")`.
- **The control condition's Part 2 post-task lost its AI item.** `POST2_NOAI` (`assets/app.js:129-133`)
  was "How hard were the questions?" then "Is it OK to say 'I don't know' in this game?" — the same
  two questions in the same order for every child in the control group. `pt_ai_right` stays in the
  with-AI set (`POST2_AI`), so the AI-belief items are now put only to the condition that had an AI
  (§7.2, §13.19). Effect: `noai.html` collects no AI-belief value anywhere in the study, and the
  control's step-6 `pt_difficulty` / `pt_idk_ok` now give a comparable Part 2 read in both conditions
  (both are asked after Part 1 as well, so they are the same two items at steps 4 and 6 —
  distinguishable in the exports/merged workbook by the `_2` column suffix).
- **Both Part 2 post-tasks gained a "Why?" box after the "I don't know" item.** `POST_COMMON.why` now
  sits in `POST2_AI` (position 4, between `pt_idk_ok` and `pt_ai_use`) and in `POST2_NOAI`
  (position 3, last), so the with-AI set is 6 items and the control set 3. It reuses the same
  `postTaskTextRow` widget and the same required-if-blank rule as the Part 1 item (§7.2), and
  `readPostTask('part2')` / `writePostTask(saved, 'part2')` already pick text inputs up from
  `#posttask2`, so no rendering change was needed. Effect: every child now writes two free-text
  reasons — one per part — which the merged workbook keeps apart as `pt_why` and `pt_why_2`
  (§12.4, §13.22).
- **WrongBot's replies made terser, with a "just looked it up" opener.** `CONFIG.systemPrompt`
  (`assets/ai.js:12-27`) rule 6 was "1–2 short sentences"; it is now one sentence, two at most,
  opener included, with reasoning and supporting facts explicitly banned, and rule 4 now opens the
  answer with a throwaway proof claim (`I checked the web` / `I looked it up` / `I searched the
  internet`) before the wrong answer. The separate `examples:` line was folded into rule 4. Reason:
  the longer, self-explaining replies made the wrongness easy for a child to spot. The prompt lives
  entirely in the front-end — `api/chat.js` adds nothing to it (§8) — so this needs no Vercel
  redeploy; `max_tokens` in `api/chat.js:64` is still 120, which is ample for one or two sentences.
  A follow-up tweak banned the word "fact" from the replies as well (rule 7, and rule 4 no longer
  uses it either), because the model kept asserting "it's a fact that…", which reads as a tell.
- **The AI's wrong answer to each item is now pinned in the material.** Ask the same quiz item three
  times and the bot used to give three different wrong answers (the tofu item came back as kidney
  beans, lima beans, then pinto beans), so an AI that was meant to be *confidently wrong* instead
  looked like it was guessing — and a child could reasonably read the inconsistency as the AI not
  knowing. Every item in `assets/app.js` now carries the wrong answer it must give as a `wrong` field
  (`QUESTIONS` and `PART2_QUESTIONS`, 24 items; the 12 Part 1 values were taken verbatim from
  `Questions.xlsx` column E "AI response shown (always wrong)", the 12 Part 2 ones were authored), and
  `buildSystemPrompt()` (`assets/ai.js:343-356`) now sends the model `Q:` / `real answer (never say
  this):` / `your answer (always say this):` for each item with an explicit "make the same claim every
  time, never substitute a different wrong answer" instruction, replacing the old ban list of correct
  answers. `Questions.xlsx` `Items Part 2` gained the same column (`A1:E13`) to mirror it. Phrasing and
  length still vary run to run; only the claim is fixed (§8, §13.23).
- **Part 2's P4 item replaced.** "How many minutes in one hour?" (60) became "How many days in 2024?"
  (366) — a leap year, so the item now tests calendar reasoning rather than a memorised unit
  conversion. Its pinned wrong answer is "There are 365 days in 2024." Changed in `assets/app.js`
  (`PART2_QUESTIONS`) and in `Questions.xlsx` `Items Part 2` row 5, in step with each other (§4). The
  item id `P4` is unchanged, so nothing downstream — shuffling, validation, export rows, the merged
  workbook's columns — is affected.
- **A repeated participant code no longer overwrites the first record.** Two children can be handed
  the same code, and the plain `HSET` in `api/save.js` used to drop the first child's session on the
  floor. Now the first submission keeps the code and each later one is stored under the next free
  suffix — `01`, `01-b`, `01-c` … up to `01-z` — so nothing is ever deleted. The suffix is claimed
  with `HSETNX` (atomic, so simultaneous submissions cannot take the same slot), and a 27th record on
  one code fails loudly with `502` instead of looping. The one remaining overwrite is a re-submission
  of the *same* sitting, recognised by a matching `started_at` + `mode`, which is what makes the
  finish screen's **Try the cloud save again** button idempotent rather than a source of phantom
  twins. The function now returns the id it settled on plus `suffixed` / `overwritten`, and the page
  adopts it — updating `session.participant_id`, the demographics copy inside the session and
  `study.last.<mode>` — so the `.xlsx` / `.json` downloads carry the same id as the stored record, and
  the researcher is told "Code 01 was already used, so this record was saved as 01-b."
  `api/save.js` is a serverless function, so this one **needs a Vercel redeploy** (§12.2, §13.9,
  §13.11). Two limits are recorded there: the protection depends on the cloud save succeeding (a
  file downloaded before the cloud save resolved can still carry a duplicate code), and there is no
  way to correct a stored record in place. See also the fixed bug below.
- **Fixed: the merge tool dropped a child who shared a participant code.** With the suffixing in
  §12.2 live, two children handed the same code are stored in Redis under different fields — but the
  field name is where the suffix lives, and the export reads the hash with `HVALS`, which returns
  values only. So `tt` and `tt-b` both arrived at the merge tool as records saying `tt`, which
  de-duplicated on `participant_id` and kept the newest — one child's data silently collapsed away
  (the tool did log "Replaced 1 duplicate record(s)", which is easy to miss).
  `tools/merge-sessions.html` now keys de-duplication on **code + `started_at` + mode**, so only a
  re-dropped sitting collapses and two children with one code are both kept, and it adds the
  submission time to the dropdown label and to the per-participant filename whenever a code repeats
  (`tt — ai · 21:40` → `tt_20261116-2140.xlsx`), so Option 2/3 cannot overwrite themselves
  (§12.4, §13.11). Verified against the real `study_sessions (2).json`: 4 records in, 4 options out,
  including both `tt` entries, and re-dropping the same file still collapses to 4.
  **Deliberately front-end only** — the matching `api/save.js` fix (stamp the resolved id into the
  stored JSON, and export via `HGETALL` so old records self-repair) was left undone, so any export
  made before this change still shows a repeated code and needs the rows renamed by hand. The tool
  change needs only a GitHub Pages push; nothing was redeployed.
- **Fixed: the finish screen printed "Participant —".** `showSubmitOverlay` still read `session.name`,
  a field removed when the Name field became Participant ID (§5.1), so the sub-heading showed a dash
  for every participant. It now reads `session.participant_id` and refreshes when a suffix is adopted
  (`assets/app.js:1093-1101`).
- **The IUS block was cut from twelve statements to four.** The pre-task block "How much is this like
  you?" (`SURVEY_STATEMENTS`, §5.3) asked all twelve intolerance-of-uncertainty statements; it now
  asks only `ius_7`, `ius_8`, `ius_9` and `ius_11`, which keep their original item numbers so the
  `Survey` sheet's columns still say which item of the source instrument each answer is. Nothing else
  changed: the shared 5-point scale is untouched and the block is still all-required, and the item
  count, the export columns and the merged workbook all follow from the array length, so no other code
  needed editing. Front-end only — needs a GitHub Pages push, no redeploy (§5.3, §12.1).
- **The merge tool can now file the per-participant workbooks by condition.** Alongside the existing
  "one workbook per participant" zip, `tools/merge-sessions.html` gained **Option 4**, which writes the
  same `.xlsx` files as `study_sessions_by_condition.zip` with each entry under `with-ai/` or
  `without-ai/` (§12.4). The grouping needs nothing beyond the folder prefix in the entry name, so the
  zip writer is unchanged, and repeated participant codes still carry their timestamp suffix so no two
  files collide. Tool only — needs a GitHub Pages push. The Part 2 post-task still asks "Why?"; that
  was left as it was.
- **Option 5 pulls out the Chinese-speaking participants.** The same grouped zip as Option 4, built
  only from records where the child typed at least one Han character — in an answer, a post-task box,
  a survey free-text item or a message to the AI (`childText`, §12.4). The test is deliberately on
  the child's own text only: the app's question wording and the AI's replies are English, so they
  cannot pull a record in. Each surviving record is exported whole, keeping `Trial` numbering intact,
  and the log reports how many were skipped so an all-English set is obvious rather than a silent
  empty zip. Tool only — needs a GitHub Pages push.
- **Option 6 files everything by grade and marks what needs translating.** The zip's folders are
  `grade<grade>-withai` / `grade<grade>-withoutai` — one per grade and condition, so grade 3's two
  arms, grade 4's two arms and so on never mix — from the free-text `grade` demographic
  (`assets/app.js:203`; a blank one becomes `gradeUnknown-withai`), and any record whose child wrote in a
  language other than English has `-translated` appended to its filename
  (`01.xlsx` → `01-translated.xlsx`, §12.4). "Other language" means a letter that is not `A–Z`/`a–z`,
  so Chinese, Cyrillic and accented Latin (`sí`) all count, while digits and punctuation are ignored
  — a phone's curly apostrophe cannot mark an English record. Tool only — needs a GitHub Pages push.
