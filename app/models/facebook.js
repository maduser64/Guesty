var express = require('express');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var db = require('./database');

passport.use(new Strategy({
   clientID: process.env.CLIENT_ID,
   clientSecret: process.env.CLIENT_SECRET,
   callbackURL: 'http://localhost:3000/login/facebook/return',
   profileFields: ['id', 'name', 'displayName', 'events', 'emails', 'picture.width(800).height(800)']
 },
 function(accessToken, refreshToken, profile, cb) {
  profile.accessToken = accessToken;
  console.log(profile)

  findOrCreateUser = function(){
    db.mainuser.find({ where: {'fbid' :  profile.id }}).then(function(user) {
      // already exists
      if (user) {
        console.log('User already exists with username: '+ user);
        return;
      } else {
        // if there is no user with that facebook id
        // create the user
        console.log('cant find user, must create')

        // save the user
        db.mainuser.create({
          'fbid': profile.id,
          'firstname': profile.name.givenName,
          'lastname': profile.name.familyName,
          'photo': profile.photos[0].value,
          'email': profile.emails[0].value
        }).then(function(user) {
          console.log('User Registration successful: ' + user.firstname);
          return;    
        });
       }
    });
  };

  process.nextTick(findOrCreateUser);

  return cb(null, profile);
}));

passport.serializeUser(function(user, cb) {
console.log("### SERIALIZEE FB ###")
console.log(user.accessToken)
 var sessionUser = {
   id: user.id,
   accessToken: user.accessToken
 }
 console.log("### END SERIALIZE ###")
cb(null, sessionUser);
});

passport.deserializeUser(function(id, done) {
   console.log("#### START DESERIALIZE ####")
   var accessToken = id.accessToken;
     db.mainuser.find( { 
       where: {
           fbid: id.id
         }
       }
       ).then(
       function(user){ 
         user.accessToken = accessToken;
         done(null, user) 
       },
       function(err){ 
         done(err, null) 
       }
     );
});


