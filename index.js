var express = require('express')
var pg = require('pg');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer'); 
var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy;
var mongoose = require( 'mongoose' );

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
app.use(multer({
  dest: './public/uploads/'
}));
app.set('port', (9000));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/public');
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public/uploads'));
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });
app.use(passport.initialize());
app.use(passport.session());

var Schema   = mongoose.Schema;
var findOrCreate = require('mongoose-findorcreate');
var UserSchema = new Schema({
    uid    : String,
    fbid    : String,
    pass : String,
    email : String,
    name : String,
    profile_pic : String
});
UserSchema.plugin(findOrCreate);
 
var User= mongoose.model( 'User', UserSchema );
mongoose.connect( 'mongodb://localhost/meduim-proto' );
passport.serializeUser(function(user, done) {
        done(null, user.id);
 });
var fbprofile;
passport.use(new FacebookStrategy({
    clientID: 123,
    clientSecret: SECRET,
    callbackURL: "http://localhost:9000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
  	console.log(profile);
  	fbprofile=profile;
    User.findOrCreate({ fbid: profile.id }, function(err, user) {
      if (err) { return done(err); }
      
        done(null, user);
    });
  }
));


var conString = "postgres://postgres:hello@localhost/medium";

app.get('/', function (req,res){
	var blogs;
	pg.connect(conString, function(err, client, done) {
		client.query('SELECT * FROM db_blog where publish=$1',
			[true],
		function(err, result) {
			client.end();
			if (err)
			{ console.error(err);}
			else
			{
				blogs=result.rows;
				console.log(blogs);
				res.render ('home',{
					uid : fbprofile,
					data: blogs
				});
			}
		});
	});
});

app.get('/user', function (req, res){
	var para= req.params.p;
	//console.log(para);
	console.log(passport.user);
	if(!fbprofile)
		res.redirect('/');
	else
	pg.connect(conString, function(err, client, done) {
		client.query('SELECT * FROM db_blog where username=$1',
			[fbprofile.id],
		function(err, result) {
			client.end();
			if (err)
			{ console.error(err);}
			else
			{
				blogs= result.rows;
				console.log(blogs);
				res.render('user',{
					data: blogs,
					uid: fbprofile
				})
			}
		});
	});

});
app.get('/newblog', function (req, res){
	if(!fbprofile)
		res.redirect('/');
	res.render('newpost',{
		uid: fbprofile
	})
	

});

app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: '/m/user-redirect/',
                                      failureRedirect: '/error' }));

app.post('/m/newpost',function (req,res){
	var username = req.body.username;
	var blog_body = req.body.blog_body;
	var publishya = req.body.publish;
	var publish;
	if(publishya==="yes")
		publish= true;
	else
		publish=false;
	pg.connect(conString, function(err, client, done) {
		client.query('INSERT INTO db_blog (username, blog_body, publish) VALUES ($1, $2, $3)',
			[username, blog_body, publish],
		function(err, result) {
			client.end();
			if (err) 
			{ console.error(err);}
			else
			{
				res.send("Done");
			}
		});
	});

});
app.get('/m/user-redirect/', function (req, res){
	console.log(fbprofile.id);
	
				res.redirect('/user');
	
})

app.get('/m/logout', function (req,res){
	fbprofile="";
	res.redirect('/');
})

app.listen(app.get('port'), function() {
console.log("Node app is running at port:" + app.get('port'))
});