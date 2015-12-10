angular.module('ionic-audio').directive('ionAudioTrack', ['MediaManager', '$rootScope', ionAudioTrack]);

function ionAudioTrack(MediaManager, $rootScope) {
    return {
        transclude: true,
        template: '<ng-transclude></ng-transclude>',
        restrict: 'E',
        scope: {
            _track: '=track'
        },
        controller: ['$scope', '$element', ionAudioTrackCtrl]
    };

    function ionAudioTrackCtrl($scope, $element) {
		//$scope = !!$scope.track.play ? $scope : $scope.$parent;

        var controller = this, hasOwnProgressBar = $element.find('ion-audio-progress-bar').length > 0;

        var init = function() {
            $scope._track.progress = 0;
            $scope._track.status = 0;
            $scope._track.duration = -1;

            if (MediaManager) {
               $scope._track.id = MediaManager.add($scope._track, playbackSuccess, null, statusChange, progressChange);
            }
        };

        var playbackSuccess = function() {
            $scope._track.status = 0;
            $scope._track.progress = 0;
        };
        var statusChange = function(status) {
            $scope._track.status = status;
        };
        var progressChange = function(progress, duration) {
            $scope._track.progress = progress;
            $scope._track.duration = duration;
        };
        var notifyProgressBar = function() {
            $rootScope.$broadcast('ionic-audio:trackChange', $scope._track);
        };

        this.seekTo = function(pos) {
            MediaManager.seekTo(pos);
        };

        this.getTrack = function() {
            return $scope._track;
        };

        $scope._track.play = function() {
            if (!MediaManager) return;

            MediaManager.play($scope._track.id);

            // notify global progress bar if detached from track
            if (!controller.hasOwnProgressBar) notifyProgressBar();

            return $scope._track.id;
        };

        $scope.$on('$destroy', function() {
            MediaManager.destroy();
        });

        init();
    }
}

