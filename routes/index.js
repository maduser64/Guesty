const express = require('express');
var router = express.Router();
var db = require('../app/models/database');


var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport){

	/* GET login page. */
	router.get('/', function(req, res) {
    	// Display the Login page with any flash message, if any
    	res.render('index', { message: req.flash('message') });
    });

	/* Handle Login POST */
	router.post('/login', passport.authenticate('login', {
		successRedirect: '/home',
		failureRedirect: '/',
		failureFlash : true  
	}));

	/* GET Registration Page */
	router.get('/signup', function(req, res){
		res.render('register',{message: req.flash('message')});
	});

	/* Handle Registration POST */
	router.post('/signup', passport.authenticate('signup', {
		successRedirect: '/home',
		failureRedirect: '/signup',
		failureFlash : true  
	}));

	// LOGIN FACEBOOK
	router.get('/login/facebook',
		passport.authenticate('facebook', {
			scope : ['public_profile', 'user_events', 'email']
		}));
	// RETURN AFTER LOGIN FB
	router.get('/login/facebook/return', 
	passport.authenticate('facebook', {
		failureRedirect: '/', 
	}),
	function(req, res) {
		res.redirect('/home');
	});

	/* GET Home Page */
	router.get('/home', isAuthenticated, function(req, res){
	db.event.findAll({ 
			where: {
				mainuserId: req.user.dataValues.id
			}
			}).then(function (event) {
				console.log("THIS ARE MY TWO EVENTS!!!!!!!!!: " + event)
				res.render('home', { user: req.user, events: event })
			})
	});

	/* Handle Logout */
	router.get('/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	// FACEBOOK API
	var Facebook = require('facebook-node-sdk');

	var facebook = new Facebook( { 
		appID: process.env.CLIENT_ID, 
		secret: process.env.CLIENT_SECRET 
	});

	/* GET create event Page */
	router.get('/createevent', isAuthenticated, function(req, response){
		facebook.setAccessToken(req.user.accessToken)
		console.log("button is working")

		facebook.api( '/me/events?fields=name,id,is_viewer_admin,owner,attending,attending_count,cover,place,start_time&limit=50', function(err, res) {
			if(!res || res.error) {
				console.log(!res ? 'error occurred' : res.error);
				return;
			}
			makeEvent = function(thisevent, theuser){
				if (thisevent.is_viewer_admin) {
					db.event.find({ where: {'fbeventid' :  thisevent.id }}).then(function(event) {
						if (event) {
							console.log('Event already exists');

						} else {
							console.log('cant find event, must create')
							if (thisevent.cover == undefined) {
								theuser.createEvent({
									'name': thisevent.name,
									'fbeventid': thisevent.id,
									'owner': thisevent.owner.name,
									'location': thisevent.place.name,
									'starttime': thisevent.start_time,
									'attending': thisevent.attending.data,
									'attending_count': thisevent.attending_count
								}).then(function(user) {
									console.log('Event Registration successful without cover ');

								});
							} else {
								theuser.createEvent({
									'name': thisevent.name,
									'fbeventid': thisevent.id,
									'owner': thisevent.owner.name,
									'location': thisevent.place.name,
									'starttime': thisevent.start_time,
									'cover': thisevent.cover.source,
									'attending': thisevent.attending.data,
									'attending_count': thisevent.attending_count
								}).then(function(user) {
									console.log('Event Registration successful with cover ');

								});
							}
						}
					})
				}
			};
			db.mainuser.findOne({
				where: {
					id: req.user.id 
				}
			}).then(function(theuser){
				for (var i = 0; i < res.data.length; i++) {
					makeEvent(res.data[i], theuser)
				}
			})
			console.log("The data is STORED")
			response.redirect('/home');
		});
	});


	/// Dashboard Event
	router.get('/dashboard/:fbeventid', isAuthenticated, function(request, response) {
		db.event.find({ where: {'fbeventid' :  request.params.fbeventid }}).then(function(event) {
			console.log("GUESTLIST HERE ---> " + event.attending)
			response.render('dashboard', { guestlist: event.attending});
		})
    });

	// LOGIN FACEBOOK
	router.get('/login/facebook',
		passport.authenticate('facebook', {
			scope : ['public_profile', 'user_events', 'email']
		}));
	// RETURN AFTER LOGIN FB
	router.get('/login/facebook/return', 
		passport.authenticate('facebook', {
			failureRedirect: '/', 
		}),
		function(req, res) {
			res.redirect('/home');
		});


	return router;
}




