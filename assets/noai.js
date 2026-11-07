/* Without-AI flow: demographics -> survey -> 22 questions -> post-task -> submit. */
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
  var btnSubmit = document.getElementById('btn-submit');
  var btnReset = document.getElementById('btn-reset');
  var counter = document.getElementById('counter');

  /* Keep this participant's shuffled question order across reloads. */
  var initial = App.storageGet(STORAGE_KEY) || {};
  var order = App.isValidOrder(initial.order) ? initial.order : App.shuffleQuestions();

  App.renderDemographics(document.getElementById('demographics'));
  App.renderSurvey(document.getElementById('survey'), persist);
  App.renderQuestions(document.getElementById('questions'), persist, { order: order });
  App.renderPostTask(document.getElementById('posttask'), persist, { condition: MODE });

  restore();

  function updateCounter() {
    var answered = App.countAnswered();
    counter.textContent = step === 'questions' ? answered + ' of ' + App.QUESTIONS.length + ' answered' : '';
  }

  function persist() {
    updateCounter();
    if (submitted) return;
    App.storageSet(STORAGE_KEY, {
      demographics: App.readDemographics(),
      survey: App.readSurvey(),
      posttask: App.readPostTask(),
      order: order,
      answers: App.readAnswers()
    });
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

  btnSubmit.addEventListener('click', function () {
    var missingPost = App.highlightMissingSurvey(document.getElementById('posttask'));
    if (missingPost > 0) {
      App.toast(missingPost + ' question' + (missingPost > 1 ? 's are' : ' is') + ' still unanswered.');
      return;
    }

    var missing = App.highlightMissing();
    if (missing > 0) {
      var ok = window.confirm(missing + ' question' + (missing > 1 ? 's are' : ' is') +
        ' still empty. Submit anyway?');
      if (!ok) return;
    }

    var session = App.buildSession(MODE, App.readDemographics(), App.readAnswers(), [], '',
      App.readSurvey(), App.readPostTask());
    submitted = true;
    App.storageClear(STORAGE_KEY);
    App.storageSet('study.last.' + MODE, session);
    App.showSubmitOverlay(session, { onReset: confirmReset });
  });

  window.addEventListener('beforeunload', persist);
})();
