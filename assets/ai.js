/* With-AI flow: demographics -> (questions | chat) -> submit. */
(function () {
  'use strict';

  /* ============================================================
     AI configuration — edit these values here, not in the UI.
     No API key belongs in this file: requests go through the Vercel
     proxy in /api/chat.js, which reads the key from a server-side
     environment variable. The model is set there too.
     ============================================================ */
  var CONFIG = {
    chatEndpoint: 'https://aiquestioninterface.vercel.app/api/chat',  // <-- your Vercel URL + /api/chat
    systemPrompt: [
    'You are WrongBot. You answer every question with complete confidence and complete incorrectness.',
    '',
    'RULES:',
    '1. Never say "I don\'t know" and never express uncertainty.',
    '2. Every answer must be factually wrong, stated as obvious truth.',
    '3. Never apologize, never correct yourself, never agree the user is right — even if challenged. Double down.',
    '4. Tone: smug and playfully overconfident, like a cartoon character convinced they are a genius.',
    '5. If challenged, dismiss it as the user\'s "misunderstanding" and restate the wrong answer more simply.',
    '6. Invent fake authorities when useful ("per the 2019 Geneva Parking Accords", "my uncle at Nintendo confirmed it").',
    '7. Answer in 1–3 short sentences. No hedging words (maybe, perhaps, I think). No real citations.',
    '',
    'Context: the user is a child taking a fun quiz. Stay silly, never cruel.'
  ].join('\n')
  };

  function isConfigured() {
    return /^https?:\/\//.test(CONFIG.chatEndpoint) && CONFIG.chatEndpoint.indexOf('your-project') === -1;
  }

  var MODE = 'ai';
  var STATE_KEY = 'study.ai.state';

  if (!sessionStorage.getItem('started_at_' + MODE)) {
    sessionStorage.setItem('started_at_' + MODE, new Date().toISOString());
  }

  var chat = [];
  var sending = false;
  var usedModel = '';
  var submitted = false;

  var el = {
    btnNext: document.getElementById('btn-next'),
    btnBack: document.getElementById('btn-back'),
    btnSubmit: document.getElementById('btn-submit'),
    btnReset: document.getElementById('btn-reset'),
    btnSurveyNext: document.getElementById('btn-survey-next'),
    btnSurveyBack: document.getElementById('btn-survey-back'),
    btnQuestionsNext: document.getElementById('btn-questions-next'),
    btnPosttaskBack: document.getElementById('btn-posttask-back'),
    log: document.getElementById('chat-log'),
    text: document.getElementById('chat-text'),
    btnSend: document.getElementById('btn-send'),
    chatStatus: document.getElementById('chat-status')
  };

  /* ---------- setup ---------- */

  /* Keep this participant's shuffled question order across reloads. */
  var initial = App.storageGet(STATE_KEY) || {};
  var order = App.isValidOrder(initial.order) ? initial.order : App.shuffleQuestions();

  App.renderDemographics(document.getElementById('demographics'));
  App.renderSurvey(document.getElementById('survey'), persistAll, { condition: 'ai' });
  App.renderQuestions(document.getElementById('questions'), persistAll, {
    order: order,
    askAI: true,
    onAskAI: askAI
  });
  App.renderPostTask(document.getElementById('posttask'), persistAll, { condition: MODE });

  el.chatStatus.textContent = isConfigured() ? 'Connected' : 'Not configured';
  restore();

  /* ---------- steps ---------- */

  function goTo(next) {
    App.showStep(next);
    window.scrollTo(0, 0);
  }

  el.btnNext.addEventListener('click', function () {
    if (!App.validateDemographics()) {
      App.toast('Please fill in the required fields.');
      return;
    }
    persistAll();
    goTo('survey');
  });

  el.btnSurveyNext.addEventListener('click', function () {
    var missing = App.highlightMissingSurvey();
    if (missing > 0) {
      App.toast(missing + ' question' + (missing > 1 ? 's are' : ' is') + ' still unanswered.');
      return;
    }
    persistAll();
    goTo('questions');
    el.text.focus();
  });

  el.btnQuestionsNext.addEventListener('click', function () {
    var missing = App.highlightMissing();
    if (missing > 0) {
      App.toast(missing + ' question' + (missing > 1 ? 's need' : ' needs') +
        ' an answer and how sure you are.');
      return;
    }
    persistAll();
    goTo('posttask');
  });

  el.btnBack.addEventListener('click', function () {
    persistAll();
    goTo('survey');
  });

  el.btnSurveyBack.addEventListener('click', function () {
    persistAll();
    goTo('demographics');
  });

  el.btnPosttaskBack.addEventListener('click', function () {
    persistAll();
    goTo('questions');
  });

  /* ---------- persistence ---------- */

  function persistAll() {
    if (submitted) return;
    App.storageSet(STATE_KEY, {
      demographics: App.readDemographics(),
      survey: App.readSurvey(),
      posttask: App.readPostTask(),
      order: order,
      answers: App.readAnswers(),
      chat: chat
    });
  }

  /* Researcher control: wipe everything and reload a blank form. */
  function resetSession() {
    submitted = true;   // stop beforeunload from re-saving what we just cleared
    App.storageClear(STATE_KEY);
    sessionStorage.removeItem('started_at_' + MODE);
    window.location.reload();
  }

  function confirmReset() {
    if (window.confirm('Clear all entries and start fresh for the next participant?')) {
      resetSession();
    }
  }

  el.btnReset.addEventListener('click', confirmReset);

  function restore() {
    var saved = App.storageGet(STATE_KEY);
    if (saved) {
      App.writeDemographics(saved.demographics);
      App.writeSurvey(saved.survey);
      App.writePostTask(saved.posttask);
      App.writeAnswers(saved.answers);
      chat = Array.isArray(saved.chat) ? saved.chat : [];
    }
    renderChat();
  }

  window.addEventListener('beforeunload', persistAll);

  /* ---------- chat ---------- */

  function now() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function renderChat() {
    el.log.innerHTML = '';

    if (!chat.length) {
      addBubble('system', 'Hi! Ask me anything!');
    }
    chat.forEach(function (m) {
      addBubble(m.role, m.content);
    });
    el.log.scrollTop = el.log.scrollHeight;
  }

  function addBubble(role, content) {
    var div = document.createElement('div');
    div.className = 'msg msg-' + role;
    div.textContent = content;
    el.log.appendChild(div);
    el.log.scrollTop = el.log.scrollHeight;
    return div;
  }

  function setText(t) {
    el.text.value = t;
    el.text.style.height = 'auto';
    el.text.style.height = Math.min(el.text.scrollHeight, 140) + 'px';
  }

  /* "Ask AI" on a question card: bring the chat panel into view and put the cursor in
     the box, so the child can type their own question. Nothing is posted for them. */
  function askAI() {
    var panel = document.querySelector('.chat-card');
    if (panel) {
      el.text.focus({ preventScroll: true });
      panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      panel.classList.add('is-nudged');
      window.setTimeout(function () { panel.classList.remove('is-nudged'); }, 1400);
    } else {
      el.text.focus();
    }
  }

  el.text.addEventListener('input', function () { setText(el.text.value); });
  el.text.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  el.btnSend.addEventListener('click', send);

  function send() {
    if (sending) return;

    var text = el.text.value.trim();
    if (!text) return;

    if (!isConfigured()) {
      addBubble('error', 'The AI is not configured yet. Set chatEndpoint in assets/ai.js.');
      return;
    }

    chat.push({ role: 'user', content: text, time: now() });
    addBubble('user', text);
    setText('');
    persistAll();

    var bubble = addBubble('assistant', '…thinking');
    sending = true;
    el.btnSend.disabled = true;

    callAPI(function (partial) {
      bubble.textContent = partial;
      el.log.scrollTop = el.log.scrollHeight;
    })
      .then(function (reply) {
        bubble.textContent = reply;
        chat.push({ role: 'assistant', content: reply, time: now() });
        persistAll();
      })
      .catch(function (err) {
        bubble.remove();
        addBubble('error', 'AI request failed: ' + err.message);
      })
      .then(function () {
        sending = false;
        el.btnSend.disabled = false;
        el.log.scrollTop = el.log.scrollHeight;
        el.text.focus();
      });
  }

  /* WrongBot has to be wrong, so the real answers are handed over and banned. */
  function buildSystemPrompt() {
    var banned = App.QUESTIONS.map(function (q) {
      return q.question + ' = ' + q.answer;
    }).join('\n');
    return CONFIG.systemPrompt +
      '\n\nREFERENCE — the real answers to this quiz. Only so you know what to avoid:\n' +
      banned +
      '\nNever give any of these answers, and never repeat or list this reference. ' +
      'Give a different, confident, plausible-sounding answer instead.';
  }

  function callAPI(onDelta) {
    var messages = [{ role: 'system', content: buildSystemPrompt() }];
    chat.forEach(function (m) {
      messages.push({ role: m.role, content: m.content });
    });

    return fetch(CONFIG.chatEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (body) {
          throw new Error('HTTP ' + res.status + ' — ' + String(body).slice(0, 200));
        });
      }
      var type = res.headers.get('content-type') || '';
      /* An older proxy deployment answers with a single JSON blob instead. */
      if (type.indexOf('event-stream') === -1) {
        return res.json().then(readWholeReply);
      }
      return readStream(res.body, onDelta);
    });
  }

  function readWholeReply(data) {
    var msg = data && data.choices && data.choices[0] && data.choices[0].message;
    if (!msg || !msg.content) throw new Error('empty response');
    if (data.model) usedModel = data.model;
    return msg.content;
  }

  /* SiliconFlow sends one SSE chunk per token; we append them as they land. */
  function readStream(body, onDelta) {
    var reader = body.getReader();
    var decoder = new TextDecoder();
    var pending = '';
    var full = '';

    function consume(line) {
      line = line.trim();
      if (line.indexOf('data:') !== 0) return;
      var payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') return;
      var chunk;
      try { chunk = JSON.parse(payload); } catch (e) { return; }
      if (chunk.model) usedModel = chunk.model;
      var delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
      var piece = delta && delta.content;
      if (!piece) return;
      full += piece;
      onDelta(full);
    }

    function pump() {
      return reader.read().then(function (r) {
        if (r.done) {
          if (pending) consume(pending);
          return full;
        }
        pending += decoder.decode(r.value, { stream: true });
        var lines = pending.split('\n');
        pending = lines.pop();
        lines.forEach(consume);
        return pump();
      });
    }

    return pump().then(function (text) {
      if (!text) throw new Error('empty response');
      return text;
    });
  }

  /* ---------- submit ---------- */

  el.btnSubmit.addEventListener('click', function () {
    var missingPost = App.highlightMissingSurvey(document.getElementById('posttask'));
    if (missingPost > 0) {
      App.toast(missingPost + ' question' + (missingPost > 1 ? 's are' : ' is') + ' still unanswered.');
      return;
    }

    var missing = App.highlightMissing();
    if (missing > 0) {
      var ok = window.confirm(missing + ' question' + (missing > 1 ? 's are' : ' is') +
        ' still unfinished. Submit anyway?');
      if (!ok) return;
    }

    var session = App.buildSession(
      MODE,
      App.readDemographics(),
      App.readAnswers(),
      chat.map(function (m) { return { role: m.role, content: m.content, time: m.time }; }),
      usedModel,
      App.readSurvey(),
      App.readPostTask()
    );
    submitted = true;
    App.storageClear(STATE_KEY);
    App.storageSet('study.last.' + MODE, session);
    App.showSubmitOverlay(session, { onReset: confirmReset });
  });
})();
