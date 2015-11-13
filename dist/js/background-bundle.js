!function t(e,n,i){function s(r,a){if(!n[r]){if(!e[r]){var c="function"==typeof require&&require;if(!a&&c)return c(r,!0);if(o)return o(r,!0);var u=new Error("Cannot find module '"+r+"'");throw u.code="MODULE_NOT_FOUND",u}var d=n[r]={exports:{}};e[r][0].call(d.exports,function(t){var n=e[r][1][t];return s(n?n:t)},d,d.exports,t,e,n,i)}return n[r].exports}for(var o="function"==typeof require&&require,r=0;r<i.length;r++)s(i[r]);return s}({1:[function(t,e,n){"use strict";function i(){o(this,i),r=this,this._state=a,this._session=new c("session","60000"),this._idle=new c("idle","30000"),this._afk={timeoutId:null,startDate:null},this.init(),chrome.idle.setDetectionInterval(15),h.on("setStateOn",function(){r._state.setOn(),r.switchOn()}).on("setStateOff",function(){r._state.setOff(),r.switchOff()}).on("restartSession",function(){return r.restartSession(),r._session.getStartDate()}).on("setSessionPeriod",function(t){r._session.setPeriod(t.value),r.endSession(),r.endIdle(),h.send("idleInded"),r.startSession(),h.send("sessionStarted")}).on("setIdlePeriod",function(t){r._idle.setPeriod(t.value)}).on("mute",function(){l.setVolume(0)}).on("unmute",function(){l.setVolume(1)})}function s(t,e){return Object.keys(e).forEach(function(n){var i=Object.getOwnPropertyDescriptor(e,n);Object.defineProperty(t,n,i)}),t}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var r,a=t("./state"),c=t("./Period"),u=t("./Router"),d=t("./badger"),f=(t("./utils"),t("./notify")),l=t("./audio"),h=new u("backend");s(i.prototype,{init:function(){this._state.isOn()&&this.switchOn()},switchOn:function(){this.addIdleListener(),this.addNotifyBtnListener(),this.startSession(),h.send("sessionStarted"),d.enableIcon()},switchOff:function(){this.isAfk()&&this.dontTrackAfk(),this.endSession(),this.endIdle(),this.rmIdleListener(),this.rmNotifyBtnListener(),d.disableIcon(),l.stop(),f.closeAll()},idleListener:function(t){var e=r._idle.isRunning(),n=r._session.isRunning();"idle"===t&&(n&&r.trackAfk(),n||e||r.startIdle(),h.send("idle")),"active"===t&&(n&&r.dontTrackAfk(),e&&(r.endIdle(),f.idleInterrupted(),l.play(1)),e||n||(f.closeIdleEnded(),r.startSession()),h.send("active"))},addIdleListener:function(){chrome.idle.onStateChanged.addListener(this.idleListener)},rmIdleListener:function(){chrome.idle.onStateChanged.removeListener(this.idleListener)},notifyBtnListener:function(t,e){chrome.notifications.clear(t,function(){}),"sessionEnd"===t&&(0===e?r.startSession():r.startSession(3e5)),"idleInterrupted"===t&&0===e&&(r.endIdle(),r.startSession())},addNotifyBtnListener:function(){chrome.notifications.onButtonClicked.addListener(this.notifyBtnListener)},rmNotifyBtnListener:function(){chrome.notifications.onButtonClicked.removeListener(this.notifyBtnListener)},startSession:function(t){var e=t||+this._session.getPeriod();this._session.setStatus("running"),this._session.setStartDate(Date.now()),h.send("sessionStarted"),this._session.timeoutId=setTimeout(function(){r.isAfk()?l.play(1):(f.sessionEnded(),l.play(1)),r.endSession()},e)},endSession:function(){clearTimeout(this._session.timeoutId),this._session.timeoutId=null,this._session.resetStatus(),this._session.resetStartDate(),h.send("sessionEnded"),this.isAfk()&&(this.dontTrackAfk(),this.startIdle())},restartSession:function(){l.stop(),f.closeAll(),this.endSession(),this.startSession()},startIdle:function(t){var e=t||+this._idle.getPeriod();this._idle.setStatus("running"),this._idle.setStartDate(Date.now()),h.send("idleStarted"),this._idle.timeoutId=setTimeout(function(){r.endIdle(),f.idleEnded(),l.play(3)},e)},endIdle:function(){clearTimeout(this._idle.timeoutId),this._idle.timeoutId=null,this._idle.resetStatus(),this._idle.resetStartDate(),h.send("idleEnded")},trackAfk:function(){var t=this._idle.getPeriod();this._afk.startDate=Date.now(),h.send("afk",this._afk.startDate),this._afk.timeoutId=setTimeout(function(){r.dontTrackAfk(),r.endSession(),h.send("sessionEnded")},t)},dontTrackAfk:function(){clearTimeout(this._afk.timeoutId),this._afk.timeoutId=null,this._afk.startDate=null,h.send("notAfk")},isAfk:function(){return!!this._afk.timeoutId}}),e.exports=i},{"./Period":2,"./Router":3,"./audio":5,"./badger":7,"./notify":8,"./state":9,"./utils":10}],2:[function(t,e,n){"use strict";function i(t,e){o(this,i),this._status=new r(t+".status","stopped"),this._period=new r(t+".period",e),this._startDate=new r(t+".startDate","0"),this._status.reset(),this._startDate.reset(),this.timeoutId=null}function s(t,e){return Object.keys(e).forEach(function(n){var i=Object.getOwnPropertyDescriptor(e,n);Object.defineProperty(t,n,i)}),t}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var r=t("./Static");e.exports=i,s(i.prototype,{isRunning:function(){return"running"===this.getStatus()},setStatus:function(t){return this._status.save(t)},getStatus:function(){return this._status.load()},resetStatus:function(){return this._status.reset()},setPeriod:function(t){return this._period.save(t)},getPeriod:function(){return this._period.load()},resetPeriod:function(){this._period.reset()},setStartDate:function(t){this._startDate.save(t)},getStartDate:function(){this._startDate.load()},resetStartDate:function(){this._startDate.reset()}})},{"./Static":4}],3:[function(t,e,n){"use strict";function i(t){this._id=t,this._listeners={};var e=this;this.send=function(t,e,n){chrome.runtime.sendMessage({id:this._id,name:t,value:e},n)},this.on=function(t,n){return this._listeners[t]=function(i,s,o){i.id!==e._id&&i.name===t&&o(n(i))},chrome.runtime.onMessage.addListener(this._listeners[t]),this},this.deregister=function(t){t in this._listeners&&(chrome.runtime.onMessage.removeListener(this._listeners[t]),delete this._listeners[t])}}e.exports=i},{}],4:[function(t,e,n){"use strict";function i(t,e){o(this,i),this._name=t,this._defaultValue=e,this.load()}function s(t,e){return Object.keys(e).forEach(function(n){var i=Object.getOwnPropertyDescriptor(e,n);Object.defineProperty(t,n,i)}),t}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}e.exports=i,s(i.prototype,{reset:function(){return this.save(this._defaultValue)},load:function(){var t=window.localStorage.getItem(this._name);return t?t:this.reset()},save:function(t){return window.localStorage.setItem(this._name,t),this.load()}})},{}],5:[function(t,e,n){"use strict";function i(t){a.src="audio/"+t+".ogg",a.volume=c.load(),a.play()}function s(){a.src=""}function o(t){return c.save(t)}var r=t("./Static.js");n.play=i,n.stop=s,n.setVolume=o;var a=new Audio(""),c=new r("volume","1");document.body.appendChild(a)},{"./Static.js":4}],6:[function(t,e,n){"use strict";var i=t("./Engine");new i},{"./Engine":1}],7:[function(t,e,n){"use strict";function i(){chrome.browserAction.setIcon({path:"../img/eye-icon-off-19.png"},function(){})}function s(){chrome.browserAction.setIcon({path:"../img/eye-icon-on-19.png"},function(){})}n.enableIcon=s,n.disableIcon=i},{}],8:[function(t,e,n){"use strict";function i(){chrome.notifications.create("sessionEnd",u,function(t){setTimeout(function(){chrome.notifications.clear(t,function(){})},23e3)})}function s(){c=new Notification("Good job!",f)}function o(){c&&(c.close(),c=null)}function r(){chrome.notifications.create("idleInterrupted",d,function(t){setTimeout(function(){chrome.notifications.clear(t,function(){})},7e3)})}function a(){chrome.notifications.clear("sessionEnd",function(){}),chrome.notifications.clear("idleProgress",function(){}),chrome.notifications.clear("idlePaused",function(){}),o()}var c,u={type:"basic",iconUrl:"../img/eye128.jpg",title:"Take a break!",message:"Do not touch the computer whole the rest period",contextMessage:"Sight keeper ",priority:2,buttons:[{title:"SKIP",iconUrl:"../img/ignore_ico.jpg"},{title:"Remind in 5 minutes",iconUrl:"../img/remind_ico.jpg"}]},d={type:"basic",iconUrl:"../img/eye128.jpg",title:"Take a break!",message:"Do not touch the computer whole the rest period",contextMessage:"Sight keeper",priority:2,buttons:[{title:"SKIP idle",iconUrl:"../img/ignore_ico.jpg"}]},f={body:"Now you can proceed",icon:"../img/eye48.png"};n.sessionEnded=i,n.idleEnded=s,n.closeIdleEnded=o,n.idleInterrupted=r,n.closeAll=a},{}],9:[function(t,e,n){"use strict";function i(){return c.load()}function s(){c.save("on")}function o(){c.save("off")}function r(){return"on"===i()}var a=t("./Static.js");n.get=i,n.setOn=s,n.setOff=o,n.isOn=r;var c=new a("state","on")},{"./Static.js":4}],10:[function(t,e,n){"use strict";e.exports={ms2min:function(t){return+(t/6e4).toFixed(1)},min2ms:function(t){return 6e4*t},sec2ms:function(t){return 1e3*t},ms2sec:function(t){return t/1e3}}},{}]},{},[6]);