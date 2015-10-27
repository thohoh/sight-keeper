'use strict';

console.info('audio module');

var Static = require('./Static.js');


var audio = new Audio(''),
    volumeStatic = new Static('volume', '1');

document.body.appendChild(audio);


function play (index) {
    audio.src = 'audio/' + index + '.ogg';
    audio.volume = volumeStatic.load();
    audio.play();
}

function stop () {
    audio.src = '';
}

function setVolume (volume) {
    volumeStatic.save(volume);
}


exports.play = play;
exports.stop = stop;
exports.setVolume = setVolume;
