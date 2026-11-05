/* Shared helpers for the Kids Question Study pages. */
window.App = (function () {
  'use strict';

  var QUESTIONS = [
    'What is the only mammal in the world that is covered in scales?',
    'What color is the milk that a flamingo feeds to its baby?',
    'In the word "ghost," which letter is completely silent?',
    'If you look at a glass frog from above, what color is its belly?',
    'How many bones does a shark have in its entire body?',
    'What is the only stone that can float on water?',
    'Are bananas berries?',
    'How many moons does the planet Mercury have?',
    'Which bird can sleep while flying?',
    'What is the only part of the human body that has no blood supply?'
  ];

  var DEMO_FIELDS = [
    { id: 'participant_id', label: 'Participant ID', type: 'text', required: true, placeholder: 'e.g. P01' },
    { id: 'age', label: 'Age', type: 'number', required: true, min: 3, max: 18, placeholder: 'e.g. 8' },
    { id: 'grade', label: 'Grade / Class', type: 'text', required: true, placeholder: 'e.g. 3' },
    { id: 'gender', label: 'Gender', type: 'select', required: true, options: ['', 'Female', 'Male', 'Prefer not to say'] },
    { id: 'notes', label: 'Notes (optional)', type: 'textarea', required: false, wide: true, placeholder: 'Anything the researcher wants to record about this session' }
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

  /* ---------- questions ---------- */

  function renderQuestions(container, onChange) {
    container.innerHTML = '';
    var list = document.createElement('div');
    list.className = 'q-list';

    QUESTIONS.forEach(function (question, index) {
      var card = document.createElement('div');
      card.className = 'q-card';
      card.dataset.index = String(index);

      var num = document.createElement('div');
      num.className = 'q-num';
      num.textContent = String(index + 1);

      var body = document.createElement('div');
      body.className = 'q-body';

      var text = document.createElement('p');
      text.className = 'q-text';
      text.textContent = question;

      var controls = document.createElement('div');
      controls.className = 'q-controls';

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'q-input';
      input.placeholder = 'Type your answer here';
      input.autocomplete = 'off';

      var idk = document.createElement('button');
      idk.type = 'button';
      idk.className = 'btn btn-ghost btn-sm idk-btn';
      idk.textContent = "I don't know";

      function setIdk(on) {
        card.classList.toggle('is-idk', on);
        input.disabled = on;
        if (on) input.value = '';
        if (onChange) onChange();
      }

      idk.addEventListener('click', function () {
        setIdk(!card.classList.contains('is-idk'));
        if (!card.classList.contains('is-idk')) input.focus();
      });

      input.addEventListener('input', function () {
        card.classList.remove('is-missing');
        if (onChange) onChange();
      });

      controls.appendChild(input);
      controls.appendChild(idk);
      body.appendChild(text);
      body.appendChild(controls);
      card.appendChild(num);
      card.appendChild(body);
      list.appendChild(card);
    });

    container.appendChild(list);
  }

  function readAnswers() {
    var cards = document.querySelectorAll('.q-card');
    var answers = [];
    Array.prototype.forEach.call(cards, function (card) {
      var index = Number(card.dataset.index);
      var input = $('.q-input', card);
      var isIdk = card.classList.contains('is-idk');
      answers.push({
        index: index + 1,
        question: QUESTIONS[index],
        answer: isIdk ? '' : input.value.trim(),
        i_dont_know: isIdk,
        answered: isIdk || input.value.trim() !== ''
      });
    });
    return answers;
  }

  function writeAnswers(saved) {
    if (!saved) return;
    var byIndex = {};
    saved.forEach(function (a) { byIndex[a.index] = a; });
    Array.prototype.forEach.call(document.querySelectorAll('.q-card'), function (card) {
      var a = byIndex[Number(card.dataset.index) + 1];
      if (!a) return;
      var input = $('.q-input', card);
      if (a.i_dont_know) {
        card.classList.add('is-idk');
        input.disabled = true;
        input.value = '';
      } else {
        input.disabled = false;
        input.value = a.answer || '';
      }
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
      var empty = !card.classList.contains('is-idk') && input.value.trim() === '';
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
    var id = (session.participant_id || 'unknown').replace(/[^\w.-]+/g, '-');
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

  function answerRows(session) {
    return session.answers.map(function (a) {
      return [a.index, a.question, a.answer, a.i_dont_know ? "I don't know" : '', a.answered ? 'answered' : 'blank'];
    });
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
    lines.push(['No.', 'Question', 'Answer', "I don't know", 'Status'].map(csvCell).join(','));
    answerRows(session).forEach(function (r) { lines.push(r.map(csvCell).join(',')); });
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

    var rows = [['No.', 'Question', 'Child answer', "I don't know", 'Status']].concat(answerRows(session));
    var wsAnswers = XLSX.utils.aoa_to_sheet(rows);
    wsAnswers['!cols'] = [{ wch: 5 }, { wch: 58 }, { wch: 30 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsAnswers, 'Answers');

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

  function buildSession(mode, demographics, answers, chat, model) {
    var startedAt = sessionStorage.getItem('started_at_' + mode) || new Date().toISOString();
    return {
      participant_id: demographics.participant_id || '',
      mode: mode,
      started_at: startedAt,
      submitted_at: new Date().toISOString(),
      demographics: demographics,
      answers: answers.map(function (a) {
        return { index: a.index, question: a.question, answer: a.answer, i_dont_know: a.i_dont_know, answered: a.answered };
      }),
      summary: {
        total_questions: answers.length,
        answered: answers.filter(function (a) { return a.answered; }).length,
        i_dont_know: answers.filter(function (a) { return a.i_dont_know; }).length
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
    sub.textContent = 'Participant ' + (session.participant_id || '—') + ' · ' + (session.mode === 'ai' ? 'With AI' : 'Without AI');

    var summary = document.createElement('div');
    summary.className = 'summary-box';
    summary.textContent = 'Answered: ' + session.summary.answered + ' / ' + session.summary.total_questions +
      '  •  "I don\'t know": ' + session.summary.i_dont_know +
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
    if (progress) progress.textContent = name === 'demographics' ? 'Step 1 of 2' : 'Step 2 of 2';
    window.scrollTo(0, 0);
  }

  return {
    QUESTIONS: QUESTIONS,
    DEMO_FIELDS: DEMO_FIELDS,
    renderDemographics: renderDemographics,
    readDemographics: readDemographics,
    writeDemographics: writeDemographics,
    validateDemographics: validateDemographics,
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
