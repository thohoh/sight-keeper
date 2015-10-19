// TODO :
//  restart idle
//  hardcode at btnlistener


(function (window, document) {
  'use strict';
  var SK = function () {

    // Main state of the application
    // it could be either 'on' or 'off',
    // the user could manage it in popup
    var state = new SK.modules.Static('state', 'on'),

      session = {

        // Status of session period
        // it could be 'running' and 'stopped'
        status: new SK.modules.Static('session.status', 'stopped'),

        // Configurable in popup options
        period: new SK.modules.Static('session.period', '2700000'), //2700000 45min
        startDate: new SK.modules.Static('session.startDate', '0'),

        // Idle detection interval for session period in seconds.
        idleDetect: 160

      },

      idle = {

        // Status of idle period
        // it could be 'running' and 'stopped'
        status: new SK.modules.Static('idle.status', 'stopped'),

        // Configurable in popup options
        period: new SK.modules.Static('idle.period', '300000'), // 300000 5min

        startDate: new SK.modules.Static('idle.startDate', '0'),

        // Idle detection interval for idle period in seconds.
        idleDetect: 15
      },

      // Object for tracking afk state
      afk = {
        timeoutId: null,
        startDate: null
      };

    // Initially reset these values
    session.status.reset();
    session.startDate.reset();
    idle.status.reset();
    idle.startDate.reset();

    // Init modules
    var router = new SK.modules.Router('bg'),
        badger = new SK.modules.Badger(),
        utils = new SK.modules.Utils(),
        notify = new SK.modules.Notify(),
        audio = new SK.modules.Audio();


    // Basic functionality

    // Starts session period
    function startSession (time) {
      var t = time || +session.period.load(),
        period = utils.ms2min(t);

      session.status.save('running');
      session.startDate.save(Date.now());

      // Set interval for session period
      chrome.idle.setDetectionInterval(session.idleDetect);

      session.timerId = setTimeout(function () {
        endSession();
        console.log('session ended');

        notify.sessionEnded(period);
        audio.play(1);
      }, t);
    }

    // It called when session period elapsed
    function endSession () {
      var now = Date.now(),
        idlePeriod,
        t;

      // For cases when user was idling (was called this.trackAfk)
      clearTimeout(session.timerId);
      session.timerId = null;

      // Sets session status to default ('stopped')
      session.status.reset();

      // Sets session startDate to default ('0')
      session.startDate.reset();

      // If session period successfully ended
      chrome.idle.setDetectionInterval(60); // 150

      // If session period finished while user is still afk - run idle
      // manually
      // @link https://developer.chrome.com/extensions/idle#method-queryState
      if (afk.timeoutId) {
        idlePeriod = +idle.period.load();

        // Define how long user was afk
        t = now - afk.startDate;

        // And start idle immediately but not full idlePeriod
        startIdle(idlePeriod - t);
        console.log('idle started , custom period : ' + (idlePeriod - t));


        // Clear afk timerId
        dontTrackAfk();
        console.log('stop tracking AFK by endSession');
      }
    }

    // Starts idle period
    function startIdle(time) {
      var t = time || +idle.period.load();

      idle.status.save('running');
      idle.startDate.save(Date.now());

      chrome.idle.setDetectionInterval(idle.idleDetect);

      idle.timerId = setTimeout(function () {
        endIdle();
        console.log('idle ended');


        notify.idleEnded();
        audio.play(3);
      }, t);
    }

    function endIdle () {

      clearTimeout(idle.timerId);
      idle.timerId = null;

      idle.status.reset();
      idle.startDate.reset();

      // Delete value due to idle endings
      idle.timeLeft = null;
    }

    function restartIdle () {

      clearTimeout(idle.timerId);

      startIdle();
    }

    // When user interupts idle period -
    // pause idle and notify user that period isn't finished yet.
    function pauseIdle () {
      var idlePeriod = idle.timeLeft || idle.period.load(),

        now = Date.now(),

        idleStartDate = idle.startDate.load();

      clearTimeout(idle.timerId);
      idle.timerId = null;

      // Define how much time left
      idle.timeLeft = idlePeriod - (now - idleStartDate);

      idle.status.save('paused');

    }

    function trackAfk () {
      var t = idle.period.load();

      afk.startDate = Date.now();

      afk.timeoutId = setTimeout(function () {
        dontTrackAfk();
        endSession();

        console.log('session ended by AFK tracker');
      }, t);
    }

    function dontTrackAfk () {
      clearTimeout(afk.timeoutId);
      afk.timeoutId = null;
      afk.startDate = null;
    }


    //Checks 'state' value  when app has been loaded,
    // and does things depending on received value.
    // todo untested
    function checkState () {

      // If app is on , then run it.
      if (state.load() === 'on') {
        switchOn();
      } else {

        // If it is 'off' then just change browserAction
        switchOff();
      }
    }

    function switchOn () {
      console.info('switched ON');

      addIdleListener();
      addBtnListener();
      startSession();
      badger.enableIcon();

      console.log('session started , period : ' + session.period.load());
    }

    function switchOff () {
      console.log('SK is OFF');

      state.save('off');

      if (afk.timeoutId) {
        dontTrackAfk();
      }

      endSession();
      endIdle();
      rmIdleListener();
      rmBtnListener();
      badger.disableIcon();
      audio.stop();
      notify.closeAll();
    }








    // Main logic of application
    // Chrome idle state listener
    // @link https://developer.chrome.com/extensions/idle
    function idleListener (idleState) {
      console.log(idleState + ' fired');

      var idleStatus = idle.status.load(),
        sessionStatus = session.status.load();

      // If app state is 'off' - ignore
      if (state.load() === 'off') {
        return;
      }

      // Idle state fired!
      if (idleState === 'idle') {

        // If session is running and user goes afk ,
        // start countdown certain amount of time, after witch
        // app assumes that user have rested.
        if (sessionStatus === 'running') {
          trackAfk();
          console.log('tracking AFK...');
        }

        // If session time elapsed and user doesn't do any inputs - start
        // idle period.
        if (sessionStatus === 'stopped' && idleStatus === 'stopped') {
          startIdle();
          console.log('idle started , period : ' + idle.period.load());
        }

        if (idleStatus === 'paused') {
          restartIdle();
          console.log('idle restarted');
        }
      }


      // Active state fired!
      if (idleState === 'active') {

        // If user was afk while session was running -
        // stop countdown afk time.
        if (sessionStatus === 'running') {
          dontTrackAfk();
          console.log('stop tracking AFK');
        }

        // If idle period is running and user have made an input -
        // notify user that idle period is not finished yet.
        if (idleStatus === 'running') {
          // restartIdle();

          pauseIdle();
          notify.idlePaused();
          audio.play(2);

          console.log('idle paused');
        }

        // If idle period finished and user makes an input -
        // start session period and close desktop notification
        // 'idle finished'.
        if (idleStatus === 'stopped' && sessionStatus === 'stopped') {
          notify.closeIdleEnded();

          startSession();
          console.log('session started since did input, period : ' + session.period.load());
        }
      }
    }

    function addIdleListener () {
      chrome.idle.onStateChanged.addListener(idleListener);
      console.log('idle listener added');
    }

    function rmIdleListener () {
      chrome.idle.onStateChanged.removeListener(idleListener);
      console.log('idle listener removed');
    }


    // Chrome notification button's handler
    // @link https://developer.chrome.com/apps/notifications#event-onButtonClicked
    function btnListener (id, buttonIndex) {

      // Close notification when user clicks any button
      chrome.notifications.clear(id, function () {});

      if (id === 'sessionEnd') {

        if (buttonIndex === 0) {
          startSession();
          console.log('session started by skipping idle , period : ' + utils.ms2min(session.period.load()) + ' min');
        } else {

          // TODO make this value configurable.
          // get rid of hardcode
          startSession(5 * 60000);
          console.log('session started , reminder, period : ' + utils.ms2min(5 * 60000) + ' min');
        }
      }

      if (id === 'idlePaused') {

        if (buttonIndex === 0) {

          idle.timerId = null;

          idle.status.reset();
          idle.startDate.reset();

          startSession();
        }
      }
    }

    function addBtnListener () {
      chrome.notifications.onButtonClicked.addListener(btnListener);
      console.log('btn listener added');
    }

    function rmBtnListener () {
      chrome.notifications.onButtonClicked.removeListener(btnListener);
      console.log('btn listener removed');
    }


    router.on('state', function (message) {

       // Set this value to localStorage
       localStorage.setItem(message.name, message.value);

       // Then execute the main function
       checkState();
      }
    );


    checkState();

    this.switchOn = switchOn;
    this.switchOff = switchOff;
  };


  SK.modules = {};

  // Creates an object that has methods for retrieving and
  // setting value in localStorage to given key.
  SK.modules.Static = (function () {
    console.info('Static module');

    function Static (name, defaultValue) {

      // Key for localStorage
      this.name = name;

      // Default value for cases when there are some problems with
      // retrieving of value from localStorage
      // or just for reset purposes.
      this.defaultValue = defaultValue;

      // Initially load value from localStorage
      this.load();
    }

    _createClass(Static, {

      // Sets value to defaultValue and returns it
      reset: {
        value: function reset() {
          return this.save(this.defaultValue);
        }
      },

      // Loads value from localStorage and returns it,
      // If there are problems - calls reset method.
      load: {
        value: function load() {
          var value = window.localStorage.getItem(this.name);

          // If value successfuly retrieved - return it
          if (value !== null) {
            return value;
          }

          // Otherwise reset it to defaultValue
          //console.log("can't obtain the value ", this.name, 'reset to default value');

          return this.reset();
        }
      },

      // Sets value and returns it
      save: {
        value: function save(value) {
          window.localStorage.setItem(this.name, value);

          return this.load();
        }
      }
    });

    // return class
    return Static;
  })();

  // Creates an object that can:
  //
  // *  Add listeners for handling
  //    particular messages that arrive from another scripts
  //    within extention.
  //
  // *  Send messages throughout the extention.
  SK.modules.Router = function (identifier) {

    // Unique identifier for current script
    var id = identifier;

    function send (name, value, cb) {

      // @link https://developer.chrome.com/extensions/runtime#method-sendMessage
      chrome.runtime.sendMessage({
          id: id,
          name: name,
          value: value
        },
      cb);
    }

    function on (name, handler) {

      // Save handler in router object.
      this[name] = function (message, sender, cb) {

        // If message was send from another Router instance or
        // message name is not what we expecting then do nothing.
        if (message.id !== id && message.name === name) {

          // Handle message
          handler(message);
        }
      };

      // @link https://developer.chrome.com/extensions/runtime#event-onMessage
      chrome.runtime.onMessage.addListener(this[name]);
    }

    this.send = send;
    this.on = on;
  };


  SK.modules.Badger = function () {
    console.info('badger module');

    // @link https://developer.chrome.com/extensions/browserAction#method-setIcon
    this.disableIcon = function () {
      chrome.browserAction.setIcon({
        path: '../img/popup-icon-off-19.png'
      }, function () {});
    };

    this.enableIcon = function () {
      chrome.browserAction.setIcon({
        path: '../img/popup-icon-on-19.png'
      }, function () {});
    };
  };

  SK.modules.Utils = function () {
    console.info('converter module');

    this.ms2min = function (ms) {
      return +(ms / 60000).toFixed(1);
    };

    this.min2ms = function (mins) {
      return mins * 60000;
    };

    this.sec2ms = function (sec) {
      return sec * 1000;
    };

    this.ms2sec = function (ms) {
      return ms / 1000;
    };
  };

  // Desktop notifications (chrome.notifications API and
  // web Notifications API)
  SK.modules.Notify = function () {
    console.info('Notify module');

    var notifIldeInded;


    function sessionEnded (period) {
      var options = {
        type: 'basic',
        iconUrl: '../img/eyes_tired2.png',
        title: 'Take a break!',
        message: 'Working period was ' + period + ' mins, your eyes should rest 5 mins',
        contextMessage: 'Sight keeper ',
        priority: 2,
        buttons: [{
          title: 'SKIP',
          iconUrl: '../img/ignore_ico.jpg'
        }, {
          title: 'Remind in 5 minutes',
          iconUrl: '../img/remind_ico.jpg'
        }]
      };


      // @link https://developer.chrome.com/apps/notifications#method-create
      chrome.notifications.create('sessionEnd', options, function (id) {

        setTimeout(function () {

          // @link https://developer.chrome.com/apps/notifications#method-clear
          chrome.notifications.clear(id, function () {});

        }, 23000);
      });
    }

    // Notifies that idle session is ended,
    // notification showed untill user make any imput.
    // @link https://developer.mozilla.org/en-US/docs/Web/API/notification
    function idleEnded () {
      notifIldeInded = new Notification('IDLE ENDED', {
        body: 'You can work',
        icon: '../img/gj.png'
      });
    }

    function closeIdleEnded () {
      if (notifIldeInded) {
        notifIldeInded.close();
        notifIldeInded = null;
      }
    }

    function idlePaused () {
      // var total = utils.ms2min(idle.period.load()),

      //   elapsed = utils.ms2min(idle.period.load() - idle.timeLeft),

      var options = {
          type: 'basic',
          iconUrl: '../img/!.png',
          title: 'Restarting idle..',
          message: 'Don\'t touch PC untill the idle end',
          contextMessage: 'Sight keeper',
          priority: 2,
          buttons: [{
            title: 'SKIP idle',
            iconUrl: '../img/ignore_ico.jpg'
          }]
        };

      // @link https://developer.chrome.com/apps/notifications#method-create
      chrome.notifications.create('idlePaused', options, function (id) {

        setTimeout(function () {

          // @link https://developer.chrome.com/apps/notifications#method-clear
          chrome.notifications.clear(id, function () {});
        }, 23000);
      });
    }

    function closeAll () {
      chrome.notifications.clear('sessionEnd', function () {});
      chrome.notifications.clear('idleProgress', function () {});
      chrome.notifications.clear('idlePaused', function () {});
      closeIdleEnded();
    }


    this.sessionEnded = sessionEnded;
    this.idleEnded = idleEnded;
    this.closeIdleEnded = closeIdleEnded;
    this.idlePaused = idlePaused;
    this.closeAll = closeAll;
  };

  // Audio notifications
  SK.modules.Audio = function () {
    console.info('audio module');

    // dependency
    var Static = SK.modules.Static,
      audio = new Audio(''),
      volumeStatic = new Static('volume', '1');

    // Plays audio file with given index,
    // get's volume from localStorage (user preference)
    function play (index) {
      audio.src = 'audio/' + index + '.ogg';
      audio.volume = volumeStatic.load();
      audio.play();
    }

    function stop () {
      audio.src = '';
    }

    document.body.appendChild(audio);

    this.play = play;
    this.stop = stop;
  };


  // Miscellaneous functions
  function _createClass(target, props) {

    for (var key in props) {

      var prop = props[key];

      // @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties
      prop.configurable = true;

      prop.writable = true;
    }

    Object.defineProperties(target.prototype, props);
  }






  window.sk = new SK(); })(window, window.document);
