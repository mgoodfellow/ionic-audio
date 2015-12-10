angular.module('ionic-audio').directive('ionAudioProgress', ionAudioProgress);

function ionAudioProgress() {
    return {
        restrict: 'E',
        scope: {
            _track: '=track'
        },
        template: '{{_track.progress | time}}'
    }
}
