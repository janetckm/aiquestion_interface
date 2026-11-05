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
    systemPrompt: 'You are a friendly helper for children taking part in a fun quiz. ' +
      'Be warm, encouraging and never scary.'
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
    log: document.getElementById('chat-log'),
    text: document.getElementById('chat-text'),
    btnSend: document.getElementById('btn-send'),
    chatStatus: document.getElementById('chat-status')
  };

  /* ---------- setup ---------- */

  App.renderDemographics(document.getElementById('demographics'));
  App.renderQuestions(document.getElementById('questions'), persistAll);

  el.chatStatus.textContent = isConfigured() ? 'Connected' : 'Not configured';
  restore();

  /* ---------- steps ---------- */

  function goTo(next) {
    App.showStep(next);
    el.btnSubmit.hidden = next !== 'questions';
    window.scrollTo(0, 0);
  }

  el.btnNext.addEventListener('click', function () {
    if (!App.validateDemographics()) {
      App.toast('Please fill in the required fields.');
      return;
    }
    persistAll();
    goTo('questions');
    el.text.focus();
  });

  el.btnBack.addEventListener('click', function () {
    persistAll();
    goTo('demographics');
  });

  /* ---------- persistence ---------- */

  function persistAll() {
    if (submitted) return;
    App.storageSet(STATE_KEY, {
      demographics: App.readDemographics(),
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

    var typing = addBubble('assistant', '…thinking');
    sending = true;
    el.btnSend.disabled = true;

    callAPI()
      .then(function (reply) {
        typing.remove();
        chat.push({ role: 'assistant', content: reply, time: now() });
        addBubble('assistant', reply);
        persistAll();
      })
      .catch(function (err) {
        typing.remove();
        addBubble('error', 'AI request failed: ' + err.message);
      })
      .then(function () {
        sending = false;
        el.btnSend.disabled = false;
        el.log.scrollTop = el.log.scrollHeight;
        el.text.focus();
      });
  }

  function callAPI() {
    var messages = [{ role: 'system', content: CONFIG.systemPrompt }];
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
      return res.json();
    }).then(function (data) {
      var msg = data && data.choices && data.choices[0] && data.choices[0].message;
      if (!msg || !msg.content) throw new Error('empty response');
      if (data.model) usedModel = data.model;
      return msg.content;
    });
  }

  /* ---------- submit ---------- */

  el.btnSubmit.addEventListener('click', function () {
    var missing = App.highlightMissing();
    if (missing > 0) {
      var ok = window.confirm(missing + ' question' + (missing > 1 ? 's are' : ' is') +
        ' still empty. Submit anyway?');
      if (!ok) return;
    }

    var session = App.buildSession(
      MODE,
      App.readDemographics(),
      App.readAnswers(),
      chat.map(function (m) { return { role: m.role, content: m.content, time: m.time }; }),
      usedModel
    );
    submitted = true;
    App.storageClear(STATE_KEY);
    App.storageSet('study.last.' + MODE, session);
    App.showSubmitOverlay(session, { onReset: confirmReset });
  });
})();
