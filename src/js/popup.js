'use strict';

var wrapper         = document.getElementById('wrapper'),
  switcherBtn       = document.getElementById('btn'),
  options           = document.getElementById('options'),

  sessionInput      = document.getElementById('session-input'),
  sessionInputBtn   = document.getElementById('session-apply-btn'),
  sessionRestartBtn = document.getElementById('session-restart'),

  idleInput         = document.getElementById('idle-input'),
  idleInputBtn      = document.getElementById('idle-apply-btn'),
  afkIndicator      = document.getElementById('afk'),

  soundsBtn         = document.getElementById('sounds-btn'),

  infoBlock         = document.getElementById('info'),
  infoBtn           = document.getElementById('info-btn');


  // Init modules
  var router  = require('./Router')('frontend'),
      utils   = require('./utils'),
      audio   = require('./audio'),
      timer   = require('./popup_timer');


(function init() {
  var state         = window.localStorage.getItem('state'),
    sessionPeriod   = window.localStorage.getItem('session.period'),
    idlePeriod      = window.localStorage.getItem('idle.period'),
    sounds          = +window.localStorage.getItem('volume'),
    remindStatus    = +window.localStorage.getItem('session.remindStatus'),
    remindTime      = +window.localStorage.getItem('session.remindTime');

  // App is on
  if (state === 'on') {
    switcherBtn.classList.add('app-btn-active');

    // Is reminder running ?
    remindStatus ? timer.showSession(remindTime) : timer.showSession();
  } else {
    switcherBtn.classList.remove('app-btn-active');
    options.classList.add('options-disabled');
  }

  // Initialize sounds button
  sounds ? soundsBtn.classList.remove('disabled') : soundsBtn.classList.add('disabled');

  // Show period times
  sessionInput.value = utils.ms2min(sessionPeriod);
  idleInput.value = utils.ms2min(idlePeriod);
})();


/**
 * Interface interaction handlers
 */


switcherBtn.addEventListener('click', function (e) {

  // Switch off the app
  if (this.classList.contains('app-btn-active')) {
    this.classList.remove("app-btn-active");
    options.classList.add('options-disabled');
    router.send('setStateOff');
  } else {
    this.classList.add("app-btn-active");
    options.classList.remove('options-disabled');
    router.send('setStateOn');
  }
});

sessionRestartBtn.addEventListener('click', function () {

  // Clear session time output
  timer.clearSession();
  router.send('restartSession', null, function (response) {
  });
});

// Show sessionInputBtn when user changed value
sessionInput.addEventListener('input', function (e) {
  sessionInputBtn.classList.remove('btn-hidden');
});

sessionInputBtn.addEventListener('click', function () {
  var value = +sessionInput.value,
    min = sessionInput.min,
    max = sessionInput.max;

  if (!value || value < 0) {
    sessionInput.value = min;
    return;
  }

  if (value < min) {
    sessionInput.value = value = min;
  }
  if (value > max) {
    sessionInput.value = value = max;
  }

  value = utils.min2ms(value);
  this.classList.add('btn-hidden');

  router.send('setSessionPeriod', value, function () {
    timer.updateSession();
  });
});

// Show idleInputBtn when user changed value
idleInput.addEventListener('input', function (e) {
  idleInputBtn.classList.remove('btn-hidden');
});

idleInputBtn.addEventListener('click', function () {
  var value = +idleInput.value,
    min = idleInput.min,
    max = idleInput.max;

  if (!value || value < 0) {
    idleInput.value = min;
    return;
  }

  if (value < min) {
    idleInput.value = value = min;
  }
  if (value > max) {
    idleInput.value = value = max;
  }

  value = utils.min2ms(value);
  this.classList.add('btn-hidden');

  router.send('setIdlePeriod', value, function () {
    timer.updateIdle();
  });

});

soundsBtn.addEventListener('click', function (e) {
  var value = +window.localStorage.getItem('volume');

  if (!value) {
    this.classList.remove('disabled');
    router.send('unmute');
  } else {
    this.classList.add('disabled');
    router.send('mute');
  }
});

// Disable selection
document.body.addEventListener('selectstart', function (e) {
  e.preventDefault();
});

// Toggle information
infoBtn.addEventListener('click', function (e) {
  infoBlock.classList.toggle('active');
  this.classList.toggle('active');
  options.classList.toggle('hidden');
});

// Listen button clicks,
// because anchor tags doesn't work by default in popup
infoBlock.addEventListener('click', linkHandler);


/**
 * Listening to background script messages
 */

router
  .on('sessionStarted', function () {
    timer.clearIdle();
    timer.clearSession();
    timer.showSession();
  })
  .on('sessionStartedCustom', function (message) {
    timer.clearIdle();
    timer.clearSession();
    timer.showSession(message.value);
  })
  .on('sessionEnded', function () {
    timer.clearSession();
  })
  .on('idleStarted', function () {
    timer.clearSession();
    timer.clearIdle();
    timer.showIdle();
  })
  .on('idleEnded', function () {
    timer.clearIdle();
  })
  .on('idle', function () {
    afkIndicator.classList.add('shown');
  })
  .on('active', function () {
    afkIndicator.classList.remove('shown');
  })
  .on('afk', function (message) {
    timer.showIdle(message.value);
  })
  .on('notAfk', function () {
    timer.clearIdle();
  });


/** Used by info buttons **/

// Link event delegation
function linkHandler(e) {
  var target = e.target;
  while (target.tagName !== 'DIV') {
    if (target.tagName === 'A') {
      var url = target.href;
      openLink(url);
      break;
    }
    target = target.parentNode;
  }
}

function openLink(url) {
  chrome.tabs.create({url: url, active: true});
}
