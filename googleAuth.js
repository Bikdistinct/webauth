//jshint esversion:6
//Register and login with google,facebook....
require('dotenv').config();
const express=require("express");
const ejs=require("ejs");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");

const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");

const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;

const findOrCreate= require("mongoose-findorcreate");

const app=express();
app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret:"our little secret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

//--------database------------
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/AuthSecret",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        // FOR findOrCreate it is not actually a function so to use it we download a package mongoose findOrcreate
      return done(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home")
});

app.get("/auth/google",
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

app.get("/auth/google/AuthSecret",
    passport.authenticate( 'google', {
        failureRedirect:"/login"}),
        function(req,res){
            res.redirect("/secrets");
        });

//console.log(process.env.API_KEY);
app.get("/register",function(req,res){
    res.render("register")
});

app.get("/login",function(req,res){
    res.render("login");
});


app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
      if (err){
        console.log(err);
      } else {
        if (foundUsers) {
          res.render("secrets", {usersWithSecrets: foundUsers});
        }
      }
    });
  });

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }
    });
    res.redirect("/");
});

app.post("/register",function(req,res){

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login",function(req,res){
   const user=new User({
       username:req.body.username,
       password:req.body.password
   });
   req.login(user,function(err){
       if(err){
           console.log(err);
       }else{
           passport.authenticate("local")(req,res,function(){
               res.redirect("/secrets");
           });
       }
   });
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",function(req,res){
    const submittedSecrets=req.body.secret;
    console.log(req.user.id);
    User.findById(req.user.id,function(err,founduser){
        if(err){
            console.log(err)
        }
        else{
            if(founduser){
                founduser.secret=submittedSecrets;
                founduser.save(function(){
                    res.redirect("/secrets")
                });
            }
        }
    })
});



app.listen(process.env.PORT || 5000,function(){
    console.log("server started!!!!!")
});