var LocalStrategy = require('passport-local').Strategy;
var db = require('../app/models/database');
var bCrypt = require('bcrypt');

module.exports = function(passport){
// AUTHENTICATE subuser Login
	passport.use('login', new LocalStrategy ( {
            passReqToCallback : true
        },
        function(req, email, password, done) {
        	db.mainuser.find( { 
                where: {
                    'email' :  email 
                }
            }).then(
        		function(user) {
        			if (!user){
                        console.log('User Not Found with email ' + email);
                        return done(null, false, req.flash('message', 'User Not found.'));                 
                    }
                    // User exists but wrong password, log the error 
                    if (!isValidPassword(user, password)){
                        console.log('Invalid Password');
                        return done(null, false, req.flash('message', 'Invalid Password')); // redirect back to login page
                    }
                    // User and password both match, return user from done method
                    // which will be treated like success
                    console.log('found user')
                    return done(null, user);
                },
                function(err) {
                	return done(err);
                });
        })
    );
    var isValidPassword = function(user, password){
        return bCrypt.compareSync(password, user.password);
    }
}