angular.module('ionic-audio').directive('ionAudioDuration', ionAudioDuration);

function ionAudioDuration() {
    return {
        restrict: 'E',
        scope: {
            _track: '=track'
        },
        template: '{{_track.duration | duration}}'
    }
}
