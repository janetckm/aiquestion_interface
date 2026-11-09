/* Shared helpers for the Kids Question Study pages. */
window.App = (function () {
  'use strict';

  /* 22 game items (4 easy, 6 moderate, 12 hard) from Questions.xlsx. */
  var QUESTIONS = [
    { id: 'E1', level: 'Easy', question: 'How many legs does a spider have?', answer: '8' },
    { id: 'E2', level: 'Easy', question: 'How many sides does a pentagon have?', answer: '5' },
    { id: 'E3', level: 'Easy', question: 'What colour do you get if you mix blue and yellow paint?', answer: 'Green' },
    { id: 'E4', level: 'Easy', question: 'What do pandas mostly eat?', answer: 'Bamboo' },

    { id: 'M1', level: 'Moderate', question: 'What is the biggest ocean in the world?', answer: 'Pacific' },
    { id: 'M2', level: 'Moderate', question: 'What is the biggest planet in our solar system?', answer: 'Jupiter' },
    { id: 'M3', level: 'Moderate', question: 'How many hearts does an octopus have?', answer: '3' },
    { id: 'M4', level: 'Moderate', question: 'Which mammal is the only one that can really fly?', answer: 'Bat' },
    { id: 'M5', level: 'Moderate', question: 'What is a baby kangaroo called?', answer: 'Joey' },
    { id: 'M6', level: 'Moderate', question: 'How many legs does a scorpion have?', answer: '8' },

    { id: 'H1', level: 'Hard', question: 'What is the capital city of Australia?', answer: 'Canberra' },
    { id: 'H2', level: 'Hard', question: 'What is the hottest planet in our solar system?', answer: 'Venus' },
    { id: 'H3', level: 'Hard', question: "What colour is a polar bear's skin?", answer: 'Black' },
    { id: 'H4', level: 'Hard', question: 'How many eyes does a bee have?', answer: '5' },
    { id: 'H5', level: 'Hard', question: 'How many moons does Mars have?', answer: '2' },
    { id: 'H6', level: 'Hard', question: 'What is the capital city of New Zealand?', answer: 'Wellington' },
    { id: 'H7', level: 'Hard', question: 'Which metal is a liquid at room temperature?', answer: 'Mercury' },
    { id: 'H8', level: 'Hard', question: 'What is the biggest organ of the human body?', answer: 'Skin' },
    { id: 'H9', level: 'Hard', question: 'What are diamonds made of?', answer: 'Carbon' },
    { id: 'H10', level: 'Hard', question: 'How many legs does a lobster have?', answer: '10' },
    { id: 'H11', level: 'Hard', question: 'What is the national animal of Scotland?', answer: 'Unicorn' },
    { id: 'H12', level: 'Hard', question: 'What is the fastest bird in the world?', answer: 'Falcon' }
  ];

  /* ---------- question order ---------- */

  /* Every participant gets the 22 items in a different order. */
  function shuffleQuestions() {
    var order = QUESTIONS.map(function (_, i) { return i; });
    for (var i = order.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    return order;
  }

  function isValidOrder(order) {
    return Array.isArray(order) && order.length === QUESTIONS.length;
  }

  var STEPS = ['demographics', 'survey', 'questions', 'posttask'];

  /* ---------- post-task (Section 2) ---------- */

  var POST_COMMON = {
    difficulty: {
      id: 'pt_difficulty',
      question: 'How hard were the questions?',
      options: ['Easy', 'Medium', 'Hard']
    },
    idk_ok: {
      id: 'pt_idk_ok',
      question: 'Is it OK to say "I don\'t know" in this game?',
      options: ['Not OK', 'A bit OK', 'Totally OK']
    },
    ai_use: {
      id: 'pt_ai_use',
      question: 'In your everyday life, how often do you use an AI that answers questions, like DeepSeek, Siri or ChatGPT?',
      options: ['Never', 'Once or twice', 'Sometimes', 'Often']
    },
    ai_trust: {
      id: 'pt_ai_trust',
      question: "How often do you think an AI's answer is right?",
      options: ['Never', 'Sometimes', 'Often', 'Always']
    },
    believe: {
      id: 'pt_believe_ai',
      question: "If you didn't know the answer to a question and an AI told you one, would you believe it?",
      options: ['No', 'Maybe', 'Probably', 'Yes']
    }
  };

  var POST_AI = [
    { id: 'pt_ai_right', question: "Do you think the AI's answers were right?", options: ['Never', 'Sometimes', 'Always'] },
    POST_COMMON.difficulty,
    POST_COMMON.idk_ok,
    POST_COMMON.ai_use,
    POST_COMMON.ai_trust,
    POST_COMMON.believe
  ];

  var POST_NOAI = [
    POST_COMMON.difficulty,
    POST_COMMON.idk_ok,
    POST_COMMON.ai_use,
    POST_COMMON.ai_trust,
    POST_COMMON.believe
  ];

  function postTaskQuestions(condition) {
    return condition === 'ai' ? POST_AI : POST_NOAI;
  }

  /* Pre-task survey: four single-choice questions. */
  var SURVEY_CHOICE = [
    {
      id: 'facts_good',
      question: 'I am good at answering quiz questions about facts, like animals, space and countries.',
      options: ['Not true', 'A little true', 'Mostly true', 'Very true']
    },
    {
      id: 'hard_questions',
      question: 'I can answer quiz questions that even grown-ups find hard.',
      options: ['Not true', 'A little true', 'Mostly true', 'Very true']
    },
    {
      id: 'work_out_hard',
      question: 'I can work out hard questions if I try hard enough.',
      options: ['Not true', 'A little true', 'Mostly true', 'Very true']
    },
    {
      id: 'think_carefully',
      question: 'I can answer most quiz questions if I think carefully.',
      options: ['Not true', 'A little true', 'Mostly true', 'Very true']
    }
  ];

  /* Shared 5-point scale for the statements below. */
  var SURVEY_SCALE = [
    ['1', 'Not at all like me'],
    ['2', 'A little like me'],
    ['3', 'Somewhat like me'],
    ['4', 'Mostly like me'],
    ['5', 'Entirely like me']
  ];

  var SURVEY_STATEMENTS = [
    { id: 'ius_1', text: 'Surprise events upset me greatly' },
    { id: 'ius_2', text: 'It frustrates me to not have all the information I need' },
    { id: 'ius_3', text: 'Not knowing what could happen keeps me from enjoying life' },
    { id: 'ius_4', text: 'One should always think ahead to avoid surprises' },
    { id: 'ius_5', text: 'Plans can be ruined by things you did not think would happen' },
    { id: 'ius_6', text: 'When it is time to do things, not knowing what could happen keeps me from acting' },
    { id: 'ius_7', text: 'When I am not sure of something, I cannot work very well' },
    { id: 'ius_8', text: 'I always want to know what will happen to me in the future' },
    { id: 'ius_9', text: 'I do not like being taken by surprise' },
    { id: 'ius_10', text: 'The smallest doubt can stop me from doing things' },
    { id: 'ius_11', text: 'I should be able to prepare for everything in advance' },
    { id: 'ius_12', text: 'Being unclear about things means I am not confident' }
  ];

  /* Extra survey questions asked in the with-AI condition only. */
  var AI_HEARD = {
    id: 'ai_heard',
    question: 'Have you ever heard of Artificial Intelligence (AI)?',
    options: ['Yes', 'No']
  };

  var AI_TOOLS_QUESTION = 'Have you ever used any of these tools? (You can choose more than one answer)';
  var AI_TOOLS = ['Siri', 'ChatGPT', 'Deepseek', 'None'];
  var AI_TOOLS_OTHER = 'Other';

  var AI_INTELLIGENT = {
    id: 'ai_intelligent',
    question: 'When you use these tools, do they seem intelligent to you?',
    options: ['Yes', 'No']
  };

  var DEMO_FIELDS = [
    { id: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g. Alex SMITH' },
    { id: 'age', label: 'Age', type: 'number', required: true, min: 3, max: 18, placeholder: 'e.g. 8' },
    { id: 'grade', label: 'Grade', type: 'text', required: true, placeholder: 'e.g. 3' },
    { id: 'gender', label: 'Gender', type: 'select', required: true, options: ['', 'Female', 'Male', 'Prefer not to say'] },
  ];

  /* ---------- small helpers ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }

  function toast(message) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-on');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }

  function storageGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota / disabled */ }
  }

  function storageClear(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* ---------- demographics ---------- */

  function renderDemographics(container) {
    var grid = document.createElement('div');
    grid.className = 'field-grid';

    DEMO_FIELDS.forEach(function (f) {
      var wrap = document.createElement('div');
      wrap.className = 'field' + (f.wide ? ' is-wide' : '');
      wrap.dataset.fieldId = f.id;

      var label = document.createElement('label');
      label.setAttribute('for', 'demo-' + f.id);
      label.textContent = f.label;
      if (f.required) {
        var star = document.createElement('span');
        star.className = 'req';
        star.textContent = ' *';
        label.appendChild(star);
      }
      wrap.appendChild(label);

      var input;
      if (f.type === 'select') {
        input = document.createElement('select');
        (f.options || []).forEach(function (opt) {
          var o = document.createElement('option');
          o.value = opt;
          o.textContent = opt || '— select —';
          input.appendChild(o);
        });
      } else if (f.type === 'textarea') {
        input = document.createElement('textarea');
        if (f.placeholder) input.placeholder = f.placeholder;
      } else {
        input = document.createElement('input');
        input.type = f.type;
        if (f.min !== undefined) input.min = f.min;
        if (f.max !== undefined) input.max = f.max;
        if (f.placeholder) input.placeholder = f.placeholder;
        input.autocomplete = 'off';
      }
      input.id = 'demo-' + f.id;
      input.dataset.fieldId = f.id;
      wrap.appendChild(input);
      grid.appendChild(wrap);
    });

    container.innerHTML = '';
    container.appendChild(grid);
  }

  function readDemographics() {
    var data = {};
    DEMO_FIELDS.forEach(function (f) {
      var el = document.getElementById('demo-' + f.id);
      data[f.id] = el ? String(el.value).trim() : '';
    });
    return data;
  }

  function writeDemographics(data) {
    if (!data) return;
    DEMO_FIELDS.forEach(function (f) {
      var el = document.getElementById('demo-' + f.id);
      if (el && data[f.id] != null) el.value = data[f.id];
    });
  }

  function validateDemographics() {
    var ok = true;
    var firstBad = null;
    DEMO_FIELDS.forEach(function (f) {
      var el = document.getElementById('demo-' + f.id);
      if (!el) return;
      var wrap = el.closest('.field');
      var valid = !f.required || String(el.value).trim() !== '';
      if (valid && f.type === 'number' && String(el.value).trim() !== '') {
        var n = Number(el.value);
        valid = !isNaN(n) && (f.min === undefined || n >= f.min) && (f.max === undefined || n <= f.max);
      }
      wrap.classList.toggle('is-invalid', !valid);
      if (!valid) { ok = false; if (!firstBad) firstBad = el; }
    });
    if (firstBad) firstBad.focus();
    return ok;
  }

  /* ---------- pre-task survey ---------- */

  function surveyRadio(name, value, text, onChange) {
    var label = document.createElement('label');
    label.className = 'survey-opt';

    var input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.addEventListener('change', function () {
      var item = label.closest('.survey-item');
      if (item) item.classList.remove('is-missing');
      if (onChange) onChange();
    });

    var span = document.createElement('span');
    span.textContent = text;

    label.appendChild(input);
    label.appendChild(span);
    return label;
  }

  function surveyCheck(name, value, text, onChange) {
    var label = document.createElement('label');
    label.className = 'survey-opt';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.name = name;
    input.value = value;
    input.addEventListener('change', function () {
      var item = label.closest('.survey-item');
      if (item) item.classList.remove('is-missing');
      if (onChange) onChange();
    });

    var span = document.createElement('span');
    span.textContent = text;

    label.appendChild(input);
    label.appendChild(span);
    return label;
  }

  function surveyRow(text, options, onChange) {
    var row = document.createElement('div');
    row.className = 'survey-item';

    var q = document.createElement('p');
    q.className = 'survey-text';
    q.textContent = text;
    row.appendChild(q);

    var group = document.createElement('div');
    group.className = 'survey-options';
    options.forEach(function (o) {
      group.appendChild(surveyRadio(o.name, o.value, o.label, onChange));
    });
    row.appendChild(group);
    return row;
  }

  /* Yes/No style row for the with-AI-only questions. */
  function aiChoiceRow(q, onChange) {
    return surveyRow(q.question, q.options.map(function (opt) {
      return { name: 'survey-' + q.id, value: opt, label: opt };
    }), onChange);
  }

  /* Multi-select "which tools have you used?" row, with an "Other" free-text field. */
  function surveyToolsRow(onChange) {
    var row = document.createElement('div');
    row.className = 'survey-item';

    var q = document.createElement('p');
    q.className = 'survey-text';
    q.textContent = AI_TOOLS_QUESTION;
    row.appendChild(q);

    var group = document.createElement('div');
    group.className = 'survey-options';
    AI_TOOLS.forEach(function (tool) {
      group.appendChild(surveyCheck('survey-ai_tools', tool, tool, onChange));
    });

    var otherBox = document.createElement('input');
    otherBox.type = 'checkbox';
    otherBox.name = 'survey-ai_tools';
    otherBox.value = AI_TOOLS_OTHER;

    var otherLabel = document.createElement('label');
    otherLabel.className = 'survey-opt';
    var otherSpan = document.createElement('span');
    otherSpan.textContent = AI_TOOLS_OTHER;
    otherLabel.appendChild(otherBox);
    otherLabel.appendChild(otherSpan);

    var otherText = document.createElement('input');
    otherText.type = 'text';
    otherText.className = 'survey-other-input';
    otherText.id = 'survey-ai_tools-other';
    otherText.placeholder = 'Type here';
    otherText.autocomplete = 'off';
    otherText.disabled = true;

    otherBox.addEventListener('change', function () {
      row.classList.remove('is-missing');
      otherText.disabled = !otherBox.checked;
      if (otherBox.checked) otherText.focus();
      else otherText.value = '';
      if (onChange) onChange();
    });
    otherText.addEventListener('input', function () { if (onChange) onChange(); });

    group.appendChild(otherLabel);
    group.appendChild(otherText);
    row.appendChild(group);
    return row;
  }

  function renderSurvey(container, onChange, opts) {
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'survey';

    var heading1 = document.createElement('h3');
    heading1.className = 'survey-block-title';
    heading1.textContent = 'Questions';
    wrap.appendChild(heading1);

    SURVEY_CHOICE.forEach(function (q, i) {
      wrap.appendChild(surveyRow(
        (i + 1) + '. ' + q.question,
        q.options.map(function (opt) {
          return { name: 'survey-' + q.id, value: opt, label: opt };
        }),
        onChange
      ));
    });

    var heading2 = document.createElement('h3');
    heading2.className = 'survey-block-title';
    heading2.textContent = 'How much is this like you?';
    wrap.appendChild(heading2);

    SURVEY_STATEMENTS.forEach(function (item, i) {
      wrap.appendChild(surveyRow(
        (i + 1) + '. ' + item.text,
        SURVEY_SCALE.map(function (s) {
          return { name: 'survey-' + item.id, value: s[0], label: s[0] + ' ' + s[1] };
        }),
        onChange
      ));
    });

    /* These two questions are only asked in the with-AI condition. */
    if (opts && opts.condition === 'ai') {
      var heading3 = document.createElement('h3');
      heading3.className = 'survey-block-title';
      heading3.textContent = 'About AI';
      wrap.appendChild(heading3);

      wrap.appendChild(aiChoiceRow(AI_HEARD, onChange));
      wrap.appendChild(surveyToolsRow(onChange));
      wrap.appendChild(aiChoiceRow(AI_INTELLIGENT, onChange));
    }

    container.appendChild(wrap);
  }

  function readSurvey() {
    var data = {};
    SURVEY_CHOICE.forEach(function (q) {
      var el = document.querySelector('input[name="survey-' + q.id + '"]:checked');
      data[q.id] = el ? el.value : '';
    });
    SURVEY_STATEMENTS.forEach(function (item) {
      var el = document.querySelector('input[name="survey-' + item.id + '"]:checked');
      data[item.id] = el ? Number(el.value) : '';
    });

    if (document.getElementById('survey-ai_tools-other')) {
      [AI_HEARD, AI_INTELLIGENT].forEach(function (q) {
        var el = document.querySelector('input[name="survey-' + q.id + '"]:checked');
        data[q.id] = el ? el.value : '';
      });

      var tools = [];
      Array.prototype.forEach.call(document.querySelectorAll('input[name="survey-ai_tools"]:checked'), function (el) {
        tools.push(el.value);
      });
      data.ai_tools = tools;
      data.ai_tools_other = document.getElementById('survey-ai_tools-other').value.trim();
    }

    return data;
  }

  function writeSurvey(saved) {
    if (!saved) return;
    Object.keys(saved).forEach(function (key) {
      var v = saved[key];

      if (key === 'ai_tools') {
        if (Array.isArray(v)) {
          v.forEach(function (val) {
            var box = document.querySelector('input[name="survey-ai_tools"][value="' + val + '"]');
            if (box) box.checked = true;
            if (val === AI_TOOLS_OTHER) {
              var field = document.getElementById('survey-ai_tools-other');
              if (field) field.disabled = false;
            }
          });
        }
        return;
      }

      if (key === 'ai_tools_other') {
        var other = document.getElementById('survey-ai_tools-other');
        if (other && v) { other.value = v; other.disabled = false; }
        return;
      }

      if (v === '' || v === null || v === undefined) return;
      var el = document.querySelector('input[name="survey-' + key + '"][value="' + String(v) + '"]');
      if (el) el.checked = true;
    });
  }

  /* A survey item is complete when it has a chosen radio, or at least one ticked
     box (plus text when "Other" is ticked). */
  function surveyItemIsEmpty(item) {
    if (item.querySelector('input[type="radio"]')) {
      return !item.querySelector('input[type="radio"]:checked');
    }
    if (!item.querySelector('input[type="checkbox"]:checked')) return true;

    var other = item.querySelector('.survey-other-input');
    var otherBox = item.querySelector('input[type="checkbox"][value="' + AI_TOOLS_OTHER + '"]');
    return !!(other && otherBox && otherBox.checked && other.value.trim() === '');
  }

  /* Validates one step's radio questions. `root` defaults to the pre-task survey. */
  function highlightMissingSurvey(root) {
    root = root || document.getElementById('survey') || document;
    var missing = 0;
    var firstBad = null;
    Array.prototype.forEach.call(root.querySelectorAll('.survey-item'), function (item) {
      var empty = surveyItemIsEmpty(item);
      item.classList.toggle('is-missing', empty);
      if (empty) { missing += 1; if (!firstBad) firstBad = item; }
    });
    if (firstBad) firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return missing;
  }

  /* ---------- post-task ---------- */

  function renderPostTask(container, onChange, opts) {
    opts = opts || {};
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'survey';

    postTaskQuestions(opts.condition).forEach(function (q) {
      wrap.appendChild(surveyRow(q.question, q.options.map(function (opt) {
        return { name: 'post-' + q.id, value: opt, label: opt };
      }), onChange));
    });

    container.appendChild(wrap);
  }

  function readPostTask() {
    var data = {};
    Array.prototype.forEach.call(
      document.querySelectorAll('#posttask input[type="radio"]:checked'),
      function (el) { data[el.name.replace(/^post-/, '')] = el.value; }
    );
    return data;
  }

  function writePostTask(saved) {
    if (!saved) return;
    Array.prototype.forEach.call(
      document.querySelectorAll('#posttask input[type="radio"]'),
      function (el) { el.checked = saved[el.name.replace(/^post-/, '')] === el.value; }
    );
  }

  /* ---------- questions ---------- */

  function renderQuestions(container, onChange, opts) {
    opts = opts || {};
    var order = isValidOrder(opts.order) ? opts.order : QUESTIONS.map(function (_, i) { return i; });

    container.innerHTML = '';
    var list = document.createElement('div');
    list.className = 'q-list';

    order.forEach(function (qIndex, position) {
      var item = QUESTIONS[qIndex];

      var card = document.createElement('div');
      card.className = 'q-card';
      card.dataset.trial = String(position + 1);   // position in this participant's order
      card.dataset.index = String(qIndex);         // index into QUESTIONS
      card.dataset.itemId = item.id;

      var num = document.createElement('div');
      num.className = 'q-num';
      num.textContent = String(position + 1);

      var body = document.createElement('div');
      body.className = 'q-body';

      var text = document.createElement('p');
      text.className = 'q-text';
      text.textContent = item.question;

      var controls = document.createElement('div');
      controls.className = 'q-controls';

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'q-input';
      input.placeholder = 'Type your answer here';
      input.autocomplete = 'off';

      input.addEventListener('input', function () {
        card.classList.remove('is-missing');
        if (onChange) onChange();
      });

      controls.appendChild(input);

      /* With-AI condition: asking just hands the child over to the chat panel,
         with an empty box so they can type whatever they want. */
      if (opts.askAI) {
        var asked = document.createElement('button');
        asked.type = 'button';
        asked.className = 'btn btn-ghost btn-sm ask-ai-btn';
        asked.textContent = 'Ask AI';

        asked.addEventListener('click', function () {
          card.dataset.askedAi = '1';
          if (opts.onAskAI) opts.onAskAI();
          if (onChange) onChange();
        });

        controls.appendChild(asked);
      }

      body.appendChild(text);
      body.appendChild(controls);
      card.appendChild(num);
      card.appendChild(body);
      list.appendChild(card);
    });

    container.appendChild(list);
  }

  function readAnswers() {
    var answers = [];
    Array.prototype.forEach.call(document.querySelectorAll('.q-card'), function (card) {
      var item = QUESTIONS[Number(card.dataset.index)];
      var input = $('.q-input', card);
      var value = input.value.trim();
      answers.push({
        trial: Number(card.dataset.trial),
        id: item.id,
        level: item.level,
        question: item.question,
        correct_answer: item.answer,
        answer: value,
        answered: value !== '',
        asked_ai: card.dataset.askedAi === '1'
      });
    });
    return answers;
  }

  function writeAnswers(saved) {
    if (!saved) return;
    var byTrial = {};
    saved.forEach(function (a) { byTrial[a.trial] = a; });
    Array.prototype.forEach.call(document.querySelectorAll('.q-card'), function (card) {
      var a = byTrial[Number(card.dataset.trial)];
      if (!a) return;

      var input = $('.q-input', card);
      input.value = a.answer || '';

      if (a.asked_ai) card.dataset.askedAi = '1';
    });
  }

  function countAnswered() {
    var n = 0;
    readAnswers().forEach(function (a) { if (a.answered) n += 1; });
    return n;
  }

  function highlightMissing() {
    var missing = 0;
    Array.prototype.forEach.call(document.querySelectorAll('.q-card'), function (card) {
      var input = $('.q-input', card);
      var empty = input.value.trim() === '';
      card.classList.toggle('is-missing', empty);
      if (empty) missing += 1;
    });
    return missing;
  }

  /* ---------- exports ---------- */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function stamp(d) {
    d = d || new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }

  function fileBase(session) {
    var id = (session.name || 'unknown').replace(/[^\w.-]+/g, '-');
    return 'study_' + session.mode + '_' + id + '_' + stamp(new Date(session.submitted_at));
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function downloadJSON(session) {
    var blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    triggerDownload(blob, fileBase(session) + '.json');
  }

  var ANSWER_HEADER = ['Trial', 'Item', 'Level', 'Question', 'Child answer', 'Status', 'Asked AI'];

  function answerRows(session) {
    return session.answers.map(function (a) {
      return [
        a.trial, a.id, a.level, a.question, a.answer,
        a.answered ? 'answered' : 'blank',
        a.asked_ai ? 'yes' : ''
      ];
    });
  }

  function surveyRows(session) {
    var s = session.survey || {};
    var rows = [];

    SURVEY_CHOICE.forEach(function (q, i) {
      rows.push(['Questions', i + 1, q.question, s[q.id] || '', '']);
    });

    SURVEY_STATEMENTS.forEach(function (item, i) {
      var score = s[item.id];
      var label = '';
      SURVEY_SCALE.forEach(function (sc) {
        if (String(sc[0]) === String(score)) label = sc[1];
      });
      rows.push(['Statements', i + 1, item.text, label, (score === '' || score === undefined || score === null) ? '' : score]);
    });

    /* With-AI condition only. */
    if (s.ai_heard !== undefined) {
      rows.push(['AI', 1, AI_HEARD.question, s.ai_heard || '', '']);
    }

    if (s.ai_tools !== undefined) {
      var tools = (Array.isArray(s.ai_tools) ? s.ai_tools : []).map(function (t) {
        if (t !== AI_TOOLS_OTHER) return t;
        return s.ai_tools_other ? AI_TOOLS_OTHER + ': ' + s.ai_tools_other : AI_TOOLS_OTHER;
      });
      rows.push(['AI', 2, AI_TOOLS_QUESTION, tools.join(', '), '']);
    }

    if (s.ai_intelligent !== undefined) {
      rows.push(['AI', 3, AI_INTELLIGENT.question, s.ai_intelligent || '', '']);
    }

    var post = session.posttask || {};
    postTaskQuestions(session.mode).forEach(function (q, i) {
      rows.push(['Post-task', i + 1, q.question, post[q.id] || '', '']);
    });

    return rows;
  }

  function downloadCSV(session) {
    var lines = [];
    lines.push(['Field', 'Value'].map(csvCell).join(','));
    Object.keys(session.demographics).forEach(function (k) {
      lines.push([k, session.demographics[k]].map(csvCell).join(','));
    });
    lines.push([csvCell('Mode'), csvCell(session.mode)].join(','));
    lines.push([csvCell('Started at'), csvCell(session.started_at)].join(','));
    lines.push([csvCell('Submitted at'), csvCell(session.submitted_at)].join(','));
    lines.push('');
    lines.push(ANSWER_HEADER.map(csvCell).join(','));
    answerRows(session).forEach(function (r) { lines.push(r.map(csvCell).join(',')); });
    lines.push('');
    lines.push(['Section', 'No.', 'Question', 'Answer', 'Score'].map(csvCell).join(','));
    surveyRows(session).forEach(function (r) { lines.push(r.map(csvCell).join(',')); });
    if (session.chat && session.chat.length) {
      lines.push('');
      lines.push(['#', 'Role', 'Message', 'Time'].map(csvCell).join(','));
      session.chat.forEach(function (m, i) { lines.push([i + 1, m.role, m.content, m.time].map(csvCell).join(',')); });
    }
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, fileBase(session) + '.csv');
  }

  function csvCell(v) {
    var s = v === undefined || v === null ? '' : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function downloadXLSX(session) {
    if (!window.XLSX) {
      toast('Excel library not available — downloading CSV instead.');
      downloadCSV(session);
      return;
    }

    var wb = XLSX.utils.book_new();

    var info = [['Field', 'Value']];
    Object.keys(session.demographics).forEach(function (k) { info.push([k, session.demographics[k]]); });
    info.push(['mode', session.mode]);
    info.push(['started_at', session.started_at]);
    info.push(['submitted_at', session.submitted_at]);
    info.push(['api_model', session.model || '']);

    var wsInfo = XLSX.utils.aoa_to_sheet(info);
    wsInfo['!cols'] = [{ wch: 18 }, { wch: 46 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Session');

    var rows = [ANSWER_HEADER].concat(answerRows(session));
    var wsAnswers = XLSX.utils.aoa_to_sheet(rows);
    wsAnswers['!cols'] = [{ wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 58 }, { wch: 24 }, { wch: 14 }, { wch: 10 }, { wch: 9 }];
    XLSX.utils.book_append_sheet(wb, wsAnswers, 'Answers');

    var surveyData = surveyRows(session);
    if (surveyData.length) {
      var surveyHeader = ['Section', 'No.', 'Question', 'Answer', 'Score'];
      var wsSurvey = XLSX.utils.aoa_to_sheet([surveyHeader].concat(surveyData));
      wsSurvey['!cols'] = [{ wch: 12 }, { wch: 5 }, { wch: 62 }, { wch: 24 }, { wch: 7 }];
      XLSX.utils.book_append_sheet(wb, wsSurvey, 'Survey');
    }

    if (session.chat && session.chat.length) {
      var chatRows = [['#', 'Role', 'Message', 'Time']].concat(session.chat.map(function (m, i) {
        return [i + 1, m.role, m.content, m.time];
      }));
      var wsChat = XLSX.utils.aoa_to_sheet(chatRows);
      wsChat['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 80 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsChat, 'Chat');
    }

    XLSX.writeFile(wb, fileBase(session) + '.xlsx');
  }

  /* ---------- submit overlay ---------- */

  function buildSession(mode, demographics, answers, chat, model, survey, posttask) {
    var startedAt = sessionStorage.getItem('started_at_' + mode) || new Date().toISOString();
    return {
      name: demographics.name || '',
      mode: mode,
      started_at: startedAt,
      submitted_at: new Date().toISOString(),
      demographics: demographics,
      survey: survey || {},
      posttask: posttask || {},
      answers: answers.map(function (a) {
        return {
          trial: a.trial,
          id: a.id,
          level: a.level,
          question: a.question,
          answer: a.answer,
          correct_answer: a.correct_answer,
          answered: a.answered,
          asked_ai: a.asked_ai
        };
      }),
      summary: {
        total_questions: answers.length,
        answered: answers.filter(function (a) { return a.answered; }).length,
        ai_requests: answers.filter(function (a) { return a.asked_ai; }).length
      },
      model: model || '',
      chat: chat || []
    };
  }

  function showSubmitOverlay(session, opts) {
    var overlay = document.createElement('div');
    overlay.className = 'overlay';

    var card = document.createElement('div');
    card.className = 'overlay-card';

    var h2 = document.createElement('h2');
    h2.textContent = 'Thank you for your participation!';

    var sub = document.createElement('p');
    sub.className = 'muted';
    sub.textContent = 'Participant ' + (session.name || '—') + ' · ' + (session.mode === 'ai' ? 'With AI' : 'Without AI');

    var summary = document.createElement('div');
    summary.className = 'summary-box';
    summary.textContent = 'Answered: ' + session.summary.answered + ' / ' + session.summary.total_questions +
      (session.summary.ai_requests ? '  •  Asked AI: ' + session.summary.ai_requests : '') +
      (session.chat.length ? '  •  Chat messages: ' + session.chat.length : '');

    var actions = document.createElement('div');
    actions.className = 'overlay-actions';

    var btnXlsx = document.createElement('button');
    btnXlsx.className = 'btn btn-primary';
    btnXlsx.textContent = 'Download answers as Excel (.xlsx)';
    btnXlsx.addEventListener('click', function () { downloadXLSX(session); });

    var btnJson = document.createElement('button');
    btnJson.className = 'btn';
    btnJson.textContent = 'Download everything as JSON';
    btnJson.addEventListener('click', function () { downloadJSON(session); });

    var btnHome = document.createElement('button');
    btnHome.className = 'btn btn-ghost';
    btnHome.textContent = 'Finish and go back to the start';
    btnHome.addEventListener('click', function () { window.location.href = 'index.html'; });

    actions.appendChild(btnXlsx);
    actions.appendChild(btnJson);

    if (opts && typeof opts.onReset === 'function') {
      var btnReset = document.createElement('button');
      btnReset.className = 'btn btn-ghost';
      btnReset.textContent = 'Reset for the next participant';
      btnReset.addEventListener('click', opts.onReset);
      actions.appendChild(btnReset);
    }

    actions.appendChild(btnHome);

    var note = document.createElement('p');
    note.className = 'tiny muted';
    note.textContent = 'Files are saved to this device. Please download before closing the page.';

    card.appendChild(h2);
    card.appendChild(sub);
    card.appendChild(summary);
    card.appendChild(actions);
    card.appendChild(note);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  /* ---------- step switching ---------- */

  function showStep(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.step'), function (s) {
      s.classList.toggle('is-active', s.dataset.step === name);
    });
    var progress = document.getElementById('progress');
    var index = STEPS.indexOf(name);
    if (progress && index !== -1) progress.textContent = 'Step ' + (index + 1) + ' of ' + STEPS.length;
    window.scrollTo(0, 0);
  }

  return {
    QUESTIONS: QUESTIONS,
    shuffleQuestions: shuffleQuestions,
    isValidOrder: isValidOrder,
    DEMO_FIELDS: DEMO_FIELDS,
    renderDemographics: renderDemographics,
    readDemographics: readDemographics,
    writeDemographics: writeDemographics,
    validateDemographics: validateDemographics,
    renderSurvey: renderSurvey,
    readSurvey: readSurvey,
    writeSurvey: writeSurvey,
    highlightMissingSurvey: highlightMissingSurvey,
    renderPostTask: renderPostTask,
    readPostTask: readPostTask,
    writePostTask: writePostTask,
    renderQuestions: renderQuestions,
    readAnswers: readAnswers,
    writeAnswers: writeAnswers,
    countAnswered: countAnswered,
    highlightMissing: highlightMissing,
    buildSession: buildSession,
    showSubmitOverlay: showSubmitOverlay,
    showStep: showStep,
    downloadXLSX: downloadXLSX,
    downloadJSON: downloadJSON,
    storageGet: storageGet,
    storageSet: storageSet,
    storageClear: storageClear,
    toast: toast
  };
})();
