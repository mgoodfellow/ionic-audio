angular.module('ionic-audio').factory('MediaManager', ['$q', '$interval', '$timeout', '$window', function ($q, $interval, $timeout, $window) {
    var tracks = [], currentTrack, currentMedia, playerTimer;

    if (!!$window.cordova && !!$window.Media) {
		function playTrack(track) {
			currentTrack = track;

			console.log('ionic-audio: playing track ' + currentTrack.title);

			createMedia(currentTrack).then(function (track) {
				currentMedia = track;
				currentMedia.play();

				startTimer();
			}, function (rejection) {
				console.log('ionic-audio: failed to create media - ' + rejection);
			});
		}

		function resume() {
			console.log('ionic-audio: resuming track ' + currentTrack.title);
			currentMedia.play();
			startTimer();
		}

		function createMedia(track) {
			var deferred = $q.defer();

			if (!track.url) {
				console.log('ionic-audio: missing track url');
				deferred.reject('missing track url');
			} else if (typeof(track.url) === 'function') {
				track.url().then(function (url) {
					track.url = url;

					deferred.resolve(
						new Media(url,
							angular.bind(track, onSuccess),
							angular.bind(track, onError),
							angular.bind(track, onStatusChange))
					);
				}, function (rejection) {
					deferred.reject(rejection);
				});
			} else if (typeof(track.url) === 'string') {
				deferred.resolve(
					new Media(track.url,
						angular.bind(track, onSuccess),
						angular.bind(track, onError),
						angular.bind(track, onStatusChange))
				);
			} else {
				console.log('ionic-audio: unrecognised track url type');
				deferred.reject('missing track url');
			}

			return deferred.promise;
		}

		function releaseMedia() {
			if (angular.isDefined(currentMedia)) {
				currentMedia.release();
				currentMedia = undefined;
				currentTrack = undefined;
			}
		}

		function onSuccess() {
			stopTimer();
			releaseMedia();

			if (angular.isFunction(this.onSuccess))
				this.onSuccess();
		}

		function onError() {
			if (angular.isFunction(this.onError))
				this.onError();
		}

		function onStatusChange(status) {
			this.status = status;

			if (angular.isFunction(this.onStatusChange))
				this.onStatusChange(status);
		}

		function stopTimer() {
			if (angular.isDefined(playerTimer)) {
				$interval.cancel(playerTimer);
				playerTimer = undefined;
			}
		}

		function startTimer() {
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

		function add(track, playbackSuccess, playbackError, statusChange, progressChange) {
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

		function play(trackID) {
			// avoid two tracks playing simultaneously
			if (currentTrack) {
				if (currentTrack.id == trackID) {
					if (currentTrack.status == Media.MEDIA_RUNNING) {
						pause();
					} else {
						//if (currentTrack.status == Media.MEDIA_PAUSED) {
						resume();
						//}
					}
					return;
				} else {
					if (currentTrack.id > -1) {
						stop();
					}
				}
			}

			$timeout(function() {
				playTrack(tracks[trackID]);
			}, 300);
		}

		function pause() {
			console.log('ionic-audio: pausing track '  + currentTrack.title);

			currentMedia.pause();
			stopTimer();
		}

		function stop() {
			if (currentMedia){
				console.log('ionic-audio: stopping track ' + currentTrack.title);
				currentMedia.stop();    // will call onSuccess...
			}
		}

		function seekTo(pos) {
			if (!currentMedia) return;

			currentMedia.seekTo(pos * 1000);
		}

		function destroy() {
			stopTimer();
			releaseMedia();
		}

		return {
			add: add,
			play: play,
			pause: pause,
			stop: stop,
			seekTo: seekTo,
			destroy: destroy
		};
    }

	if (!!buzz) {
		function playTrack(track) {
			currentTrack = track;

			console.log('ionic-audio: playing track ' + currentTrack.title);

			createMedia(currentTrack).then(function (track) {
				currentMedia = track;
				currentMedia.play();

				startTimer();
			}, function (rejection) {
				console.log('ionic-audio: failed to create media - ' + rejection);
			});
		}

		function resume() {
			console.log('ionic-audio: resuming track ' + currentTrack.title);
			currentMedia.play();
			startTimer();
		}

		function createMedia(track) {
			var deferred = $q.defer();

			if (!track.url) {
				console.log('ionic-audio: missing track url');
				deferred.reject('missing track url');
			} else if (typeof(track.url) === 'function') {
				track.url().then(function (url) {
					track.url = url;

					var sound = new buzz.sound(url);

					sound
						.bind('loadstart', angular.bind(track, onStatusChange, 1))
						.bind('playing', angular.bind(track, onStatusChange, 2))
						.bind('pause', angular.bind(track, onStatusChange, 3))
						.bind('error', onError);

					deferred.resolve(sound);
				}, function (rejection) {
					deferred.reject(rejection);
				});
			} else if (typeof(track.url) === 'string') {
				var sound = new buzz.sound(track.url);

				sound
					.bind('loadstart', angular.bind(track, onStatusChange, 1))
					.bind('playing', angular.bind(track, onStatusChange, 2))
					.bind('pause', angular.bind(track, onStatusChange, 3))
					.bind('error', onError);

				deferred.resolve(sound);
			} else {
				console.log('ionic-audio: unrecognised track url type');
				deferred.reject('missing track url');
			}

			return deferred.promise;
		}

		function releaseMedia() {
			if (angular.isDefined(currentMedia)) {
				currentMedia.unbind('loadstart loadeddata playing pause progress durationchange timeupdate error');
				currentMedia = undefined;
				currentTrack = undefined;
			}
		}

		/*function onSuccess() {
			stopTimer();
			releaseMedia();

			if (angular.isFunction(this.onSuccess))
				this.onSuccess();
		}*/

		function onError() {
			if (angular.isFunction(this.onError))
				this.onError();
		}

		function onStatusChange(status) {
			this.status = status;

			if (angular.isFunction(this.onStatusChange))
				this.onStatusChange(status);
		}

		function stopTimer() {
			if (angular.isDefined(playerTimer)) {
				$interval.cancel(playerTimer);
				playerTimer = undefined;
			}
		}

		function startTimer() {
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

		function add(track, playbackSuccess, playbackError, statusChange, progressChange) {
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

		function play(trackID) {
			// avoid two tracks playing simultaneously
			if (currentTrack) {
				if (currentTrack.id == trackID) {
					if (currentTrack.status == 2) {
						pause();
					} else {
						//if (currentTrack.status == Media.MEDIA_PAUSED) {
						resume();
						//}
					}
					return;
				} else {
					if (currentTrack.id > -1) {
						stop();
					}
				}
			}

			$timeout(function() {
				playTrack(tracks[trackID]);
			}, 300);
		}

		function pause() {
			console.log('ionic-audio: pausing track '  + currentTrack.title);

			currentMedia.pause();
			stopTimer();
		}

		function stop() {
			if (currentMedia){
				console.log('ionic-audio: stopping track ' + currentTrack.title);
				currentMedia.pause();
				stopTimer();
			}
		}

		function seekTo(pos) {
			if (!currentMedia) return;

			currentMedia.setTime(pos);
		}

		function destroy() {
			stopTimer();
			releaseMedia();
		}

		return {
			add: add,
			play: play,
			pause: pause,
			stop: stop,
			seekTo: seekTo,
			destroy: destroy
		};
	}

	console.log("ionic-audio: missing Cordova Media plugin. Have you installed the plugin? \nRun 'ionic plugin add org.apache.cordova.media'");
	return null;

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
