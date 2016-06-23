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

	/* GET login/home page. */
	router.get('/', function(req, res) {
    	// Display the Login page with any flash message, if any
    	res.render('index', { 
    		title: "Guesty",
    		message: req.flash('message') });
    });

	/* Handle Login POST */
	router.post('/login', passport.authenticate('login', {
		successRedirect: '/home',
		failureRedirect: '/',
		failureFlash : true  
	}));

	/* GET Registration Page */
	router.get('/signup', function(req, res){
		res.render('register',{
			title: "Register",
			message: req.flash('message')
		});
	});

	/* Handle Registration POST */
	router.post('/signup', passport.authenticate('signup', {
		successRedirect: '/home',
		failureRedirect: '/signup',
		failureFlash : true  
	}));

	// LOGIN with FACEBOOK
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
			res.render('home', { 
				title: "Select Event",
				user: req.user, 
				events: event })
		})
	});

// 

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
	router.get('/dashy', isAuthenticated, function(request, response) {
		
			response.render('dashy', { 
				title: "Dashboard"
			});
	});

	/// Dashboard Event
	router.get('/dashboard/:fbeventid', isAuthenticated, function(request, response) {
		db.event.find({ 
			where: {
				'fbeventid' :  request.params.fbeventid 
			}
		}).then(function(event) {
			response.render('dashboard', { 
				title: "Dashboard",
				event: event, 
				fbeventid: request.params.fbeventid
			});
		})
	});

	/// Save guest in to guest
	router.get('/save', isAuthenticated, function(request, response) {
		Promise.all([
			db.guest.find({ 
				where: {
					'name' :  request.query.guest, 
					'fbeventId': request.query.fbeventid
				}
			}),
			db.event.findOne({ 
				where: {
					'fbeventid' :  request.query.fbeventid 
				}
			})
			]).then(function(allofthem){
            // already exists
            if (allofthem[0]) {
            	console.log('Guest already exists with username:');
            	return 
            } else {
                // if there is no user with that email
                // create the user
                console.log('cant find guest, must create')
                // save the user
                db.guest.create({
                	'name': request.query.guest,
                	'eventId': allofthem[1].id,
                	'mainuserId': request.user.id,
                	'fbeventId': request.query.fbeventid,
                	'clicked': request.query.clicked
                }).then(function(guest) {
                	console.log("The data is STORED")
                	response.redirect('/dashboard/' + request.query.fbeventid);
                });
            }
        })
	})

	router.get('/api', isAuthenticated, function(request, response) {
		db.guest.findAll({ 
			where: {
				'fbeventId' :  request.query.fbeventid 
			}
		}).then(function(guestlist) {
			response.send(guestlist)
		})
	})

	router.get('/saveguestinfo', isAuthenticated, function(request, response) {
		db.guest.findOne({ 
			where: {
				'name' :  request.query.name 
			}
		}).then(function(guest) {
			console.log("THIS IS THE GUEST WE WANT TO UODATE: " + guest.name)
			console.log("THIS IS THE GUESTCOUNT WE WANT TO UODATE: " + request.query.guestcount)
			guest.updateAttributes({
            	'guestcount': request.query.guestcount,
            	'guestclass': request.query.guestclass,
            	'phonenumber': request.query.phonenumber,
            	'email': request.query.email
            })
		})
	})


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




