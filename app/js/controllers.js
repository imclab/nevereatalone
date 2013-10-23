'use strict';

/* Controllers */

angular.module('neverEatAloneApp.controllers', []).
	controller('HomeController', function($scope, angularFire,angularFireCollection, angularFireAuth, Login, version, db_url) {
		// The following line should not be used - we need to persist the user on a page refresh
		Login.twitter();
		$scope.login = Login;
		$scope.events = {};
		$scope.invites = {};

		$scope.$watch('user', function(user){
			if($scope.user !== undefined && $scope.user.uid !== null){
				var eventRef, inviteEventRef,
					ref = new Firebase(db_url+'/profile/'+$scope.user.uid+'/events'),
					inviteRef = new Firebase(db_url+'/profile/'+$scope.user.uid+'/invites');
				angularFireCollection(ref);
				angularFireCollection(inviteRef);
				ref.on('value', function(data){
					for(var i in data.val()){
						eventRef = new Firebase(db_url+'/events/'+i);
						angularFireCollection(eventRef);
						eventRef.once('value', function(eventData){
							$scope.events[eventData.name()] = eventData.val();
						});
					}
					
				});
				inviteRef.on('value', function(data){
					for(var i in data.val()){
						inviteEventRef = new Firebase(db_url+'/events/'+i);
						angularFireCollection(inviteEventRef);
						inviteEventRef.once('value', function(eventData){
							$scope.invites[eventData.name()] = eventData.val();
						});
					}
					
				});
			}
		});

	}).

	controller('InviteController', function($scope, $location, $routeParams, angularFire, angularFireCollection, angularFireAuth, Login, version, db_url){
		Login.twitter();
		$scope.login = Login;

		var inviteRef, ref = new Firebase(db_url+'/events/'+$routeParams.eventId);
		angularFireCollection(ref);
		ref.once('value', function(data){
			// Check we have a valid invitation
			inviteRef = new Firebase(db_url+'/profile/'+$scope.user.uid+'/invites/'+$routeParams.eventId);
			angularFireCollection(inviteRef);
			inviteRef.once('value', function(inviteData){
				if(inviteData.val().active == true){
					$scope.event = data.val();
				} else{
					$location.path('/');
				}
			});
		});

		$scope.join = function(evnt){
			// Delete out all other invites
			for(var i in evnt.invites){
				if(evnt.invites[i] != $scope.user.uid){
					ref = new Firebase(db_url+'/profile/'+evnt.invites[i]+'/invites/'+$routeParams.eventId);
					ref.remove();
				}
			}
			// Update the event to show you are attending
			ref = new Firebase(db_url+'/events/'+$routeParams.eventId);
			ref.child('attendee_uid').set($scope.user.uid);
			$location.path('/');
		}
	}).

	controller('EventController', function($scope, $location, $routeParams, angularFire, angularFireCollection, angularFireAuth, Login, version, db_url){
		
		Login.twitter();
		$scope.login = Login;

		// Get event information
		var ref = new Firebase(db_url+'/events/'+$routeParams.eventId);
		angularFireCollection(ref);
		ref.once('value', function(data){
			$scope.event = data.val();
		});

		$scope.cancel = function(evnt){
			var ref = new Firebase(db_url+'/events/'+$routeParams.eventId);
			ref.remove();
			ref = new Firebase(db_url+'/profile/'+$scope.user.uid+'/events/'+$routeParams.eventId);
			ref.remove();

			// Remove invites
			for(var i in evnt.invites){				
				ref = new Firebase(db_url+'/profile/'+evnt.invites[i]+'/invites/'+$routeParams.eventId);
				ref.remove();
			}
			$location.path('/');
		}
		$scope.save = function(evnt){
			var ref = new Firebase(db_url+'/events/'+$routeParams.eventId);
			ref.update(evnt);
		}
	}).


	controller('CreateEventController', function($scope, $location, angularFire, angularFireCollection, angularFireAuth, Login, Skills, db_url){
		Login.twitter();
		// Load up all skills we have listed
		Skills.load($scope);
		$scope.events = {'saveValue':{}};


		$scope.createEvent = function(){

			var newEvent, newEventRef, ref, invites = new Array(), 
				eventobj = {
				description:this.description,
				location:this.location,
				skills:new Array()
			};

			for(var i in this.events.saveValue){
				if(this.events.saveValue[i] == true){
					eventobj.skills.push(i);
				}
			}

			newEventRef = new Firebase(db_url+'/events/');
			newEvent = newEventRef.push({
				description:(eventobj.description !== undefined ? eventobj.description : ''),
				location:(eventobj.location !== undefined ? eventobj.location : ''),
				skills: eventobj.skills,
				uid:$scope.user.uid
			});

			// Push into user profile object
			ref = new Firebase(db_url+'/profile/'+$scope.user.uid+'/events/'+newEvent.name());
			ref.set({'active':true});

			// Skill search - invite users
			for(i in eventobj.skills){
				ref = new Firebase(db_url+'/skills/'+eventobj.skills[i]);
				angularFireCollection(ref);
				ref.once('value', function(data){
					for(i in data.val()){
						if(data.val()[i] != $scope.user.uid){
							invites.push(data.val()[i]);
							ref = new Firebase(db_url+'/profile/'+data.val()[i]+'/invites/'+newEvent.name());
							ref.set({'active':true});
						}
					}

					newEventRef = new Firebase(db_url+'/events/'+newEvent.name()+'/');
					newEventRef.child('invites').set(invites);
				});
			}
			$location.path('/');
		};
	}).
	
	controller('ProfileController', function($scope, showSkillsFilter, angularFire,angularFireCollection, angularFireAuth, Login, Skills, version, db_url) {
		// The following line should not be used - we need to persist the user on a page refresh
		Login.twitter();
		$scope.login = Login;
		Skills.load($scope);




		$scope.save = function(){
			var userobj = {
				description:this.profile.description,
				skills:new Array()
			};

			for(var i in this.profile.saveValue){
				if(this.profile.saveValue[i] == true){
					var ref = new Firebase(db_url+'/skills/'+i);
					ref.push($scope.user.uid);


					userobj.skills.push(i);
				}
			}

			var ref = new Firebase(db_url+'/profile/'+$scope.user.uid);
			ref.update({
				'description':userobj.description,
				'skills':userobj.skills
			});
		}
	});