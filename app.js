var express = require('express');
var session = require('express-session')
var routes = require('./routes/routes.js');
var chats = require('./routes/chats.js');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var multer = require('multer');
var upload = multer({ storage: multer.memoryStorage() });
app.use(express.urlencoded());
app.use(session({  
  secret: 'asdf',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(express.static('public'));

// Socket related code
io.on("connection", function(socket){
  socket.on("chat message", function(obj){
    io.to(obj.room).emit("chat message", obj);
  });

  socket.on("join room", function(obj){
    socket.join(obj.room);
  });

  socket.on("leave room", function(obj){
    socket.leave(obj.room);
  });
});

// Routes for everything except chat
app.get('/', routes.get_login);
app.post('/checklogin', routes.check_login);
app.get('/getstate', routes.get_state);
app.get('/setstate', routes.set_state);
app.post('/updateaffiliation', routes.update_affiliation);
app.post('/updateemail', routes.update_email);
app.post('/updatepassword', routes.update_password);
app.post('/updatevisibility', routes.update_visibility);
app.post('/updateinterests', routes.update_interests);
app.get('/signup', routes.signup);
app.post('/createaccount', routes.create_account);
app.get('/profile', routes.get_profile);
app.get('/home', routes.get_home);
app.get('/refreshhome', routes.get_refresh_home);
app.get('/wall', routes.get_wall);
app.get('/refreshwall', routes.get_refresh_wall);
app.post('/wallpost', routes.wall_post);
app.post('/comment', routes.comment);
app.get('/comments', routes.get_comments);
app.post('/createfriendrequest', routes.create_friend_request);
app.post('/undofriendrequest', routes.undo_friend_request);
app.post('/unfriend', routes.unfriend);
app.get('/search', routes.search);
app.get('/refreshsearch', routes.refresh_search);
app.get('/getautocomplete', routes.get_autocomplete);
app.get('/logout', routes.logout);
app.post('/upload', upload.single('myFile'), routes.upload);
app.get('/getimage', routes.get_image);
app.get('/friendvisualizer', routes.friend_visualizer);
app.get('/sendvisualizer', routes.send_visualizer);
app.get('/friendvisualization', routes.friend_visualization);
app.get('/getFriends/:user', routes.get_friends);
app.post('/acceptrequest', routes.accept_request);
app.post('/rejectrequest', routes.reject_request);
app.get('/articlesearch', routes.article_search);
app.post('/articlelike', routes.article_like);
app.get('/checkinactive', routes.check_inactive);
app.get('/newsalgorithm', routes.news_algorithm);

// Chat related routes
app.get('/chats', chats.get_chat);
app.post('/postMessage', chats.post_message);
app.get('/startchat', chats.get_startchat);
app.get('/getchatinvites', chats.get_chat_invites);
app.get('/getuserchats', chats.get_user_chats);
app.get('/getonlinefriends', chats.get_online_friends);
app.get('/getgroupchatinvite', chats.get_group_chat_invite);
app.get('/getonlinefriendssimple', chats.get_online_friends_simple);
app.post('/postacceptchat', chats.post_accept_chat);
app.post('/postrejectchat', chats.post_reject_chat);
app.post('/postacceptgroupchat', chats.post_accept_group_chat);
app.post('/postrejectgroupchat', chats.post_reject_group_chat);
app.get('/getonlinefriends', chats.get_online_friends);
app.post('/postchatinvite', chats.post_chat_invite);
app.post('/postgroupchatinvite', chats.post_group_chat_invite);
app.post('/leaveroom', chats.leave_room);


/* Run the server */
http.listen(8080);
console.log('Server running on port 8080');

