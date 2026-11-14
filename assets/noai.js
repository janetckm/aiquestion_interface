/* Without-AI flow: demographics -> survey -> Part 1 questions -> post-task
   -> Part 2 questions -> post-task 2 -> submit. */
(function () {
  'use strict';

  var STORAGE_KEY = 'study.noai.state';
  var MODE = 'noai';

  if (!sessionStorage.getItem('started_at_' + MODE)) {
    sessionStorage.setItem('started_at_' + MODE, new Date().toISOString());
  }

  var step = 'demographics';
  var submitted = false;
  var btnNext = document.getElementById('btn-next');
  var btnSurveyBack = document.getElementById('btn-survey-back');
  var btnSurveyNext = document.getElementById('btn-survey-next');
  var btnQuestionsNext = document.getElementById('btn-questions-next');
  var btnBack = document.getElementById('btn-back');
  var btnPosttaskBack = document.getElementById('btn-posttask-back');
  var btnPosttaskNext = document.getElementById('btn-posttask-next');
  var btnPart2Back = document.getElementById('btn-part2-back');
  var btnPart2Next = document.getElementById('btn-part2-next');
  var btnPosttask2Back = document.getElementById('btn-posttask2-back');
  var btnSubmit = document.getElementById('btn-submit');
  var btnReset = document.getElementById('btn-reset');
  var counter = document.getElementById('counter');

  /* Keep this participant's shuffled question orders across reloads — one per part. */
  var initial = App.storageGet(STORAGE_KEY) || {};
  var order = App.isValidOrder(initial.order) ? initial.order : App.shuffleOrder();
  var order2 = App.isValidOrder(initial.order2, 'part2') ? initial.order2 : App.shuffleOrder('part2');

  App.renderDemographics(document.getElementById('demographics'));
  App.renderSurvey(document.getElementById('survey'), persist);
  App.renderQuestions(document.getElementById('questions'), persist, { order: order });
  App.renderPostTask(document.getElementById('posttask'), persist, { condition: MODE });
  App.renderQuestions(document.getElementById('part2'), persist, { order: order2, part: 'part2' });
  App.renderPostTask(document.getElementById('posttask2'), persist, { condition: MODE, part: 'part2' });

  restore();

  function updateCounter() {
    if (step === 'questions') {
      counter.textContent = App.countAnswered() + ' of ' + App.QUESTIONS.length + ' answered';
    } else if (step === 'part2') {
      counter.textContent = App.countAnswered('part2') + ' of ' + App.PART2_QUESTIONS.length + ' answered';
    } else {
      counter.textContent = '';
    }
  }

  function persist() {
    updateCounter();
    if (submitted) return;
    App.storageSet(STORAGE_KEY, {
      demographics: App.readDemographics(),
      survey: App.readSurvey(),
      posttask: App.readPostTask(),
      order: order,
      answers: App.readAnswers(),
      order2: order2,
      answers2: App.readAnswers('part2'),
      posttask2: App.readPostTask('part2')
    });
  }

  /* Everything the child has answered, Part 1 first. Both parts share one `answers`
     array in the saved session; `level` tells the two parts apart. */
  function allAnswers() {
    return App.readAnswers().concat(App.readAnswers('part2'));
  }

  /* Researcher control: wipe everything and reload a blank form. */
  function resetSession() {
    submitted = true;   // stop beforeunload from re-saving what we just cleared
    App.storageClear(STORAGE_KEY);
    sessionStorage.removeItem('started_at_' + MODE);
    window.location.reload();
  }

  function confirmReset() {
    if (window.confirm('Clear all entries and start fresh for the next participant?')) {
      resetSession();
    }
  }

  btnReset.addEventListener('click', confirmReset);

  function restore() {
    var saved = App.storageGet(STORAGE_KEY);
    if (!saved) { updateCounter(); return; }
    App.writeDemographics(saved.demographics);
    App.writeSurvey(saved.survey);
    App.writePostTask(saved.posttask);
    App.writeAnswers(saved.answers);
    App.writeAnswers(saved.answers2, 'part2');
    App.writePostTask(saved.posttask2, 'part2');
    updateCounter();
  }

  function goTo(next) {
    step = next;
    App.showStep(next);
    updateCounter();
  }

  function requireSurvey() {
    var missing = App.highlightMissingSurvey();
    if (missing > 0) {
      App.toast(missing + ' question' + (missing > 1 ? 's are' : ' is') + ' still unanswered.');
      return false;
    }
    return true;
  }

  btnNext.addEventListener('click', function () {
    if (!App.validateDemographics()) {
      App.toast('Please fill in the required fields.');
      return;
    }
    persist();
    goTo('survey');
  });

  btnSurveyNext.addEventListener('click', function () {
    if (!requireSurvey()) return;
    persist();
    goTo('questions');
  });

  btnQuestionsNext.addEventListener('click', function () {
    var missing = App.highlightMissing();
    if (missing > 0) {
      App.toast(missing + ' question' + (missing > 1 ? 's need' : ' needs') +
        ' an answer and how sure you are.');
      return;
    }
    persist();
    goTo('posttask');
  });

  btnBack.addEventListener('click', function () {
    persist();
    goTo('survey');
  });

  btnSurveyBack.addEventListener('click', function () {
    persist();
    goTo('demographics');
  });

  btnPosttaskBack.addEventListener('click', function () {
    persist();
    goTo('questions');
  });

  btnPosttaskNext.addEventListener('click', function () {
    var missingPost = App.highlightMissingSurvey(document.getElementById('posttask'));
    if (missingPost > 0) {
      App.toast(missingPost + ' question' + (missingPost > 1 ? 's are' : ' is') + ' still unanswered.');
      return;
    }
    persist();
    goTo('part2');
  });

  btnPart2Back.addEventListener('click', function () {
    persist();
    goTo('posttask');
  });

  btnPart2Next.addEventListener('click', function () {
    var missing = App.highlightMissing('part2');
    if (missing > 0) {
      App.toast(missing + ' question' + (missing > 1 ? 's need' : ' needs') +
        ' an answer and how sure you are.');
      return;
    }
    persist();
    goTo('posttask2');
  });

  btnPosttask2Back.addEventListener('click', function () {
    persist();
    goTo('part2');
  });

  btnSubmit.addEventListener('click', function () {
    var missingPost2 = App.highlightMissingSurvey(document.getElementById('posttask2'));
    if (missingPost2 > 0) {
      App.toast(missingPost2 + ' question' + (missingPost2 > 1 ? 's are' : ' is') + ' still unanswered.');
      return;
    }

    var missingPart2 = App.highlightMissing('part2');
    if (missingPart2 > 0) {
      App.toast(missingPart2 + ' question' + (missingPart2 > 1 ? 's need' : ' needs') +
        ' an answer and how sure you are.');
      return;
    }

    var missing = App.highlightMissing();
    if (missing > 0) {
      var ok = window.confirm(missing + ' Part 1 question' + (missing > 1 ? 's are' : ' is') +
        ' still unfinished. Submit anyway?');
      if (!ok) return;
    }

    var session = App.buildSession(MODE, App.readDemographics(), allAnswers(), [], '',
      App.readSurvey(), App.readPostTask(), App.readPostTask('part2'));
    submitted = true;
    App.storageClear(STORAGE_KEY);
    App.storageSet('study.last.' + MODE, session);
    App.showSubmitOverlay(session, { onReset: confirmReset });
  });

  window.addEventListener('beforeunload', persist);
})();
