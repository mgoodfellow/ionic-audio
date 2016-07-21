angular.module('ionic-audio').factory('MediaManager', ['$q', '$interval', '$timeout', '$window', function ($q, $interval, $timeout, $window) {
    var tracks = [], currentTrack, currentMedia, playerTimer;

    function isFallback() {
        var fallback = !$window.cordova && !$window.Media;
        console.log('Fallback for audio is: ' + (fallback ? 'ON' : 'OFF'));
        return fallback;
    }

    function playTrackCordova(track) {
        currentTrack = track;

        console.log('ionic-audio: playing track ' + currentTrack.title);

        createMediaCordova(currentTrack).then(function (track) {
            currentMedia = track;
            currentMedia.play();

            startTimerCordova();
        }, function (rejection) {
            console.log('ionic-audio: failed to create media - ' + rejection);
        });
    }

    function resumeCordova() {
        console.log('ionic-audio: resuming track ' + currentTrack.title);
        currentMedia.play();
        startTimerCordova();
    }

    function createMediaCordova(track) {
        var deferred = $q.defer();

        if (!track.url) {
            console.log('ionic-audio: missing track url');
            deferred.reject('missing track url');
        } else if (typeof(track.url) === 'function') {
            track.url().then(function (url) {
                track.url = url;

                deferred.resolve(
                    new Media(url,
                        angular.bind(track, onSuccessCordova),
                        angular.bind(track, onErrorCordova),
                        angular.bind(track, onStatusChangeCordova))
                );
            }, function (rejection) {
                deferred.reject(rejection);
            });
        } else if (typeof(track.url) === 'string') {
            deferred.resolve(
                new Media(track.url,
                    angular.bind(track, onSuccessCordova),
                    angular.bind(track, onErrorCordova),
                    angular.bind(track, onStatusChangeCordova))
            );
        } else {
            console.log('ionic-audio: unrecognised track url type');
            deferred.reject('missing track url');
        }

        return deferred.promise;
    }

    function releaseMediaCordova() {
        if (angular.isDefined(currentMedia)) {
            currentMedia.release();
            currentMedia = undefined;
            currentTrack = undefined;
        }
    }

    function onSuccessCordova() {
        stopTimerCordova();
        releaseMediaCordova();

        if (angular.isFunction(this.onSuccess))
            this.onSuccess();
    }

    function onErrorCordova() {
        if (angular.isFunction(this.onError))
            this.onError();
    }

    function onStatusChangeCordova(status) {
        this.status = status;

        if (angular.isFunction(this.onStatusChange))
            this.onStatusChange(status);
    }

    function stopTimerCordova() {
        if (angular.isDefined(playerTimer)) {
            $interval.cancel(playerTimer);
            playerTimer = undefined;
        }
    }

    function startTimerCordova() {
        if ( angular.isDefined(playerTimer) ) return;

        if (!currentTrack) return;

        playerTimer = $interval(function() {
            if ( currentTrack.duration < 0){
                currentTrack.duration = currentMedia.getDuration();
            }

            currentMedia.getCurrentPosition(
                // success callback
                function(position) {
                    if (position > -1) {
                        currentTrack.progress = position;
                    }
                },
                // error callback
                function(e) {
                    console.log("Error getting pos=" + e);
                });

            if (angular.isFunction(currentTrack.onProgress))
                currentTrack.onProgress(currentTrack.progress, currentTrack.duration);

        }, 1000);
    }

    function addCordova(track, playbackSuccess, playbackError, statusChange, progressChange) {
        if (!track.url) {
            console.log('ionic-audio: missing track url');
            return;
        }
        angular.extend(track, {
            onSuccess: playbackSuccess,
            onError: playbackError,
            onStatusChange: statusChange,
            onProgress: progressChange,
            status: 0,
            duration: -1,
            progress: 0
        });

        track.id  = tracks.push(track) - 1;
        return track.id;
    }

    function playCordova(trackID) {
        // avoid two tracks playing simultaneously
        if (currentTrack) {
            if (currentTrack.id == trackID) {
                if (currentTrack.status == Media.MEDIA_RUNNING) {
                    pauseCordova();
                } else {
                    //if (currentTrack.status == Media.MEDIA_PAUSED) {
                    resumeCordova();
                    //}
                }
                return;
            } else {
                if (currentTrack.id > -1) {
                    stopCordova();
                }
            }
        }

        $timeout(function() {
            playTrackCordova(tracks[trackID]);
        }, 300);
    }

    function pauseCordova() {
        console.log('ionic-audio: pausing track '  + currentTrack.title);

        currentMedia.pause();
        stopTimerCordova();
    }

    function stopCordova() {
        if (currentMedia){
            console.log('ionic-audio: stopping track ' + currentTrack.title);
            currentMedia.stop();    // will call onSuccess...
        }
    }

    function seekToCordova(pos) {
        if (!currentMedia) return;

        currentMedia.seekTo(pos * 1000);
    }

    function destroyCordova() {
        stopTimerCordova();
        releaseMediaCordova();
    }

    function playTrackBuzz(track) {
        currentTrack = track;

        console.log('ionic-audio: playing track ' + currentTrack.title);

        createMediaBuzz(currentTrack).then(function (track) {
            currentMedia = track;
            currentMedia.play();

            startTimerBuzz();
        }, function (rejection) {
            console.log('ionic-audio: failed to create media - ' + rejection);
        });
    }

    function resumeBuzz() {
        console.log('ionic-audio: resuming track ' + currentTrack.title);
        currentMedia.play();
        startTimerBuzz();
    }

    function createMediaBuzz(track) {
        var deferred = $q.defer();

        if (!track.url) {
            console.log('ionic-audio: missing track url');
            deferred.reject('missing track url');
        } else if (typeof(track.url) === 'function') {
            track.url().then(function (url) {
                track.url = url;

                var sound = new buzz.sound(url);

                sound
                    .bind('loadstart', angular.bind(track, onStatusChangeBuzz, 1))
                    .bind('playing', angular.bind(track, onStatusChangeBuzz, 2))
                    .bind('pause', angular.bind(track, onStatusChangeBuzz, 3))
                    .bind('error', onErrorBuzz);

                deferred.resolve(sound);
            }, function (rejection) {
                deferred.reject(rejection);
            });
        } else if (typeof(track.url) === 'string') {
            var sound = new buzz.sound(track.url);

            sound
                .bind('loadstart', angular.bind(track, onStatusChangeBuzz, 1))
                .bind('playing', angular.bind(track, onStatusChangeBuzz, 2))
                .bind('pause', angular.bind(track, onStatusChangeBuzz, 3))
                .bind('error', onErrorBuzz);

            deferred.resolve(sound);
        } else {
            console.log('ionic-audio: unrecognised track url type');
            deferred.reject('missing track url');
        }

        return deferred.promise;
    }

    function releaseMediaBuzz() {
        if (angular.isDefined(currentMedia)) {
            currentMedia.unbind('loadstart loadeddata playing pause progress durationchange timeupdate error');
            currentMedia = undefined;
            currentTrack = undefined;
        }
    }

    /*function onSuccessBuzz() {
     stopTimerBuzz();
     releaseMediaBuzz();

     if (angular.isFunction(this.onSuccess))
     this.onSuccess();
     }*/

    function onErrorBuzz() {
        if (angular.isFunction(this.onError))
            this.onError();
    }

    function onStatusChangeBuzz(status) {
        this.status = status;

        if (angular.isFunction(this.onStatusChange))
            this.onStatusChange(status);
    }

    function stopTimerBuzz() {
        if (angular.isDefined(playerTimer)) {
            $interval.cancel(playerTimer);
            playerTimer = undefined;
        }
    }

    function startTimerBuzz() {
        if ( angular.isDefined(playerTimer) ) return;

        if (!currentTrack) return;

        playerTimer = $interval(function() {
            if ( currentTrack.duration < 0){
                currentTrack.duration = currentMedia.getDuration();
            }

            currentTrack.progress = currentMedia.getTime();

            if (angular.isFunction(currentTrack.onProgress)) {
                currentTrack.onProgress(currentTrack.progress, currentTrack.duration);
            }
        }, 1000);
    }

    function addBuzz(track, playbackSuccess, playbackError, statusChange, progressChange) {
        if (!track.url) {
            console.log('ionic-audio: missing track url');
            return;
        }
        angular.extend(track, {
            onSuccess: playbackSuccess,
            onError: playbackError,
            onStatusChange: statusChange,
            onProgress: progressChange,
            status: 0,
            duration: -1,
            progress: 0
        });

        track.id  = tracks.push(track) - 1;
        return track.id;
    }

    function playBuzz(trackID) {
        // avoid two tracks playing simultaneously
        if (currentTrack) {
            if (currentTrack.id == trackID) {
                if (currentTrack.status == 2) {
                    pauseBuzz();
                } else {
                    //if (currentTrack.status == Media.MEDIA_PAUSED) {
                    resumeBuzz();
                    //}
                }
                return;
            } else {
                if (currentTrack.id > -1) {
                    stopBuzz();
                }
            }
        }

        $timeout(function() {
            playTrackBuzz(tracks[trackID]);
        }, 300);
    }

    function pauseBuzz() {
        console.log('ionic-audio: pausing track '  + currentTrack.title);

        currentMedia.pause();
        stopTimerBuzz();
    }

    function stopBuzz() {
        if (currentMedia){
            console.log('ionic-audio: stopping track ' + currentTrack.title);
            currentMedia.pause();
            stopTimerBuzz();
        }
    }

    function seekToBuzz(pos) {
        if (!currentMedia) return;

        currentMedia.setTime(pos);
    }

    function destroyBuzz() {
        stopTimerBuzz();
        releaseMediaBuzz();
    }

    return {
        add: isFallback() ? addBuzz : addCordova,
        play: isFallback() ? playBuzz : playCordova,
        pause: isFallback() ? pauseBuzz : pauseCordova,
        stop: isFallback() ? stopBuzz : stopCordova,
        seekTo: isFallback() ? seekToBuzz : seekToCordova,
        destroy: isFallback() ? destroyBuzz : destroyCordova
    };

    //console.log("ionic-audio: missing Cordova Media plugin. Have you installed the plugin? \nRun 'ionic plugin add org.apache.cordova.media'");
    //return null;

    /*
     Creates a new Media from a track object

     var track = {
     url: 'https://s3.amazonaws.com/ionic-audio/Message+in+a+bottle.mp3',
     artist: 'The Police',
     title: 'Message in a bottle',
     art: 'img/The_Police_Greatest_Hits.jpg'
     }
     */

}]);
