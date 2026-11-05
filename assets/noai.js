/* Without-AI flow: demographics -> 10 questions -> submit. */
(function () {
  'use strict';

  var STORAGE_KEY = 'study.noai.state';
  var MODE = 'noai';

  if (!sessionStorage.getItem('started_at_' + MODE)) {
    sessionStorage.setItem('started_at_' + MODE, new Date().toISOString());
  }

  var step = 'demographics';
  var btnBack = document.getElementById('btn-back');
  var btnNext = document.getElementById('btn-next');
  var btnSubmit = document.getElementById('btn-submit');
  var counter = document.getElementById('counter');

  App.renderDemographics(document.getElementById('demographics'));
  App.renderQuestions(document.getElementById('questions'), persist);

  restore();

  function updateCounter() {
    var answered = App.countAnswered();
    counter.textContent = step === 'questions' ? answered + ' of ' + App.QUESTIONS.length + ' answered' : '';
  }

  function persist() {
    updateCounter();
    App.storageSet(STORAGE_KEY, {
      demographics: App.readDemographics(),
      answers: App.readAnswers()
    });
  }

  function restore() {
    var saved = App.storageGet(STORAGE_KEY);
    if (!saved) { updateCounter(); return; }
    App.writeDemographics(saved.demographics);
    App.writeAnswers(saved.answers);
    updateCounter();
  }

  function goTo(next) {
    step = next;
    App.showStep(next);
    btnBack.hidden = next === 'demographics';
    btnNext.hidden = next === 'questions';
    btnSubmit.hidden = next !== 'questions';
    updateCounter();
  }

  btnNext.addEventListener('click', function () {
    if (!App.validateDemographics()) {
      App.toast('Please fill in the required fields.');
      return;
    }
    persist();
    goTo('questions');
  });

  btnBack.addEventListener('click', function () {
    persist();
    goTo('demographics');
  });

  btnSubmit.addEventListener('click', function () {
    var missing = App.highlightMissing();
    if (missing > 0) {
      var ok = window.confirm(missing + ' question' + (missing > 1 ? 's are' : ' is') +
        ' still empty. Submit anyway?');
      if (!ok) return;
    }

    var session = App.buildSession(MODE, App.readDemographics(), App.readAnswers(), []);
    App.storageClear(STORAGE_KEY);
    App.storageSet('study.last.' + MODE, session);
    App.showSubmitOverlay(session);
  });

  window.addEventListener('beforeunload', persist);
})();
