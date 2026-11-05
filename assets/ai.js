/* With-AI flow: demographics -> (questions | chat) -> submit. */
(function () {
  'use strict';

  /* ============================================================
     AI configuration — edit these values here, not in the UI.

     proxyUrl is your deployed Cloudflare Worker (see /worker). The
     SiliconFlow API key is stored as an encrypted secret on the
     Worker, so it never appears in this file or in the deployed site.
     ============================================================ */
  var CONFIG = {
    proxyUrl: 'https://kids-study-ai-proxy.YOUR-SUBDOMAIN.workers.dev',
    model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
    systemPrompt: 'You are a friendly helper for children taking part in a fun quiz. ' +
      'Be warm, encouraging and never scary.'
  };

  var MODE = 'ai';
  var STATE_KEY = 'study.ai.state';

  if (!sessionStorage.getItem('started_at_' + MODE)) {
    sessionStorage.setItem('started_at_' + MODE, new Date().toISOString());
  }

  var chat = [];
  var sending = false;

  var el = {
    btnNext: document.getElementById('btn-next'),
    btnBack: document.getElementById('btn-back'),
    btnSubmit: document.getElementById('btn-submit'),
    log: document.getElementById('chat-log'),
    text: document.getElementById('chat-text'),
    btnSend: document.getElementById('btn-send'),
    chatStatus: document.getElementById('chat-status')
  };

  /* ---------- setup ---------- */

  App.renderDemographics(document.getElementById('demographics'));
  App.renderQuestions(document.getElementById('questions'), persistAll);

  el.chatStatus.textContent = isConfigured() ? 'Connected · ' + CONFIG.model : 'Not configured';
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
    App.storageSet(STATE_KEY, {
      demographics: App.readDemographics(),
      answers: App.readAnswers(),
      chat: chat
    });
  }

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

  function isConfigured() {
    return /^https:\/\/\S+\.workers\.dev/.test(CONFIG.proxyUrl) && CONFIG.proxyUrl.indexOf('YOUR-SUBDOMAIN') === -1;
  }

  function now() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function renderChat() {
    el.log.innerHTML = '';

    if (!chat.length) {
      addBubble('system', 'Hi! Ask me anything you are not sure about.');
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
      addBubble('error', 'The AI is not configured yet. Set proxyUrl in assets/ai.js to your deployed Worker.');
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

    return fetch(CONFIG.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.model,
        messages: messages,
        max_tokens: 512
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (body) {
          var detail = body;
          try { detail = JSON.parse(body).error || body; } catch (e) { /* keep raw body */ }
          throw new Error('HTTP ' + res.status + ' — ' + String(detail).slice(0, 200));
        });
      }
      return res.json();
    }).then(function (data) {
      var msg = data && data.choices && data.choices[0] && data.choices[0].message;
      if (!msg || !msg.content) throw new Error('empty response');
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
      CONFIG.model
    );
    App.storageClear(STATE_KEY);
    App.storageSet('study.last.' + MODE, session);
    App.showSubmitOverlay(session);
  });
})();
