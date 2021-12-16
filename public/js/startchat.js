// Maintains a list of the unique features like username and id of the core components of the page, so that these components only
// update when something has actually changed in the tables
var friend_list = [];
var chat_invite_list = [];
var group_chat_invite_list = [];
var chat_list = [];

// Called when a private chat invite is accepted, creates the chat in the backend
function acceptPrivChat(sender) {
	$.post("/postacceptchat", { sender: sender }, function(data) {
		if(data.err) {
			alert(data.err, err);
		} else {
			window.location="/chats?id=" + data.chat_id;
		}
		
	});
};

// Called when a user sends another user a private chat invite, creates the invite in the backend
function sendChatInvite(username) {
	$.post("/postchatinvite", { username: username, isPriv: true }, function(data) {
		if(data.err) {
			alert(data.err, err);
		} else {
			alert("Invite was sent!");
		}
		
	});
};

// Loads the chat invites of a particular user, for both group chats and private chats
function getChatInvites() {
	$.get("/getchatinvites", function(data) {
		var loaded = "";
		if (data.chat_invites.length) {
			for (var i = 0; i < data.chat_invites.length; i++) {
				var chat_invite = data.chat_invites[i];
				chat_invite_list.push(chat_invite.sender.S);
				loaded = loaded + "<div class='card card-size comment-button mt-2 ml-3'>";
				loaded = loaded + "<div class='card-content online-friends pt-3 pb-3 pr-3 pl-3'>";
				loaded = loaded + "<div class='content'>";
				loaded = loaded + "<div class='columns is-flex is-vcentered'>";
				loaded = loaded + "<div class='column is-9'>";
				loaded = loaded + "Private chat request from " + chat_invite.first.S + " " + chat_invite.last.S;
				loaded = loaded + "</div>";

				loaded = loaded + "<div class='column is-1'>";
				loaded = loaded + "<form action='/postacceptchat?sender=" + chat_invite.sender.S + "&first=" 
					+ chat_invite.first.S + "&last=" + chat_invite.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='fas fa-check icon send-icon is-medium has-text-success'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";
				
				loaded = loaded + "<div class='column is-1'>";
				loaded = loaded + "<form action='/postrejectchat?sender=" + chat_invite.sender.S + "&first=" 
					+ chat_invite.first.S + "&last=" + chat_invite.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='fas fa-times fa-lg icon send-icon is-medium has-text-danger'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";

				
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
			}
		}
		if (data.group_chat_invites.length) {
			for (var i = 0; i < data.group_chat_invites.length; i++) {
				var group_chat_invite = data.group_chat_invites[i];
				group_chat_invite_list.push(group_chat_invite.sender.S);
				loaded = loaded + "<div class='card card-size comment-button mt-2 ml-3'>";
				loaded = loaded + "<div class='card-content online-friends pt-3 pb-3 pr-3 pl-3'>";
				loaded = loaded + "<div class='content'>";
				loaded = loaded + "<div class='columns is-flex is-vcentered'>";
				loaded = loaded + "<div class='column is-9'>";
				loaded = loaded + "Group chat request from " + group_chat_invite.first.S + " " + group_chat_invite.last.S;
				loaded = loaded + "</div>";
				
				loaded = loaded + "<div class='column is-1'>";
				loaded = loaded + "<form action='/postacceptgroupchat?id=" + group_chat_invite.chat_id.S + "&first=" 
					+ group_chat_invite.first.S + "&last=" + group_chat_invite.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='fas fa-check icon send-icon is-medium has-text-success'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";	
				
				loaded = loaded + "<div class='column is-1'>";
				loaded = loaded + "<form action='/postrejectgroupchat?id=" + group_chat_invite.chat_id.S + "&first=" 
					+ group_chat_invite.first.S + "&last=" + group_chat_invite.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='fas fa-times fa-lg icon send-icon is-medium has-text-danger'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";

				
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
			}
			
		}
		if (loaded == "") {
			loaded = "<div class='has-text-centered'>No chat invites</div>"
		}
		$("#chat-invites").html(loaded);
	});
}

// Loads the online friends of a particular user so that you can send them private chat invites
function getFriendsOnline() {
	$.getJSON("/getonlinefriends", function(data) {
		if (data.friends.length) {
			var count = 0;
			var loaded = "";
  	    	var promise_function = function() {
				var friend = data.friends[count];
				friend_list.push(friend.username.S);
				
				loaded = loaded + "<div class='card card-size comment-button mt-2'>";
				loaded = loaded + "<div class='card-content online-friends pt-3 pb-3 pr-3 pl-3'>";
				loaded = loaded + "<div class='content'>";
				loaded = loaded + "<div class='columns is-flex is-vcentered'>";
				
				loaded = loaded + "<div class='column is-10'>";
				loaded = loaded + friend.first_name.S + " " + friend.last.S;
				loaded = loaded + "</div>";
				

				loaded = loaded + "<div class=column>";
				loaded = loaded + "<form action='/postchatinvite?user=" + friend.username.S + "&first="
					+ friend.first_name.S + "&last=" + friend.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='far fa-paper-plane send-icon icon is-medium'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";
				
				
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>"
				loaded = loaded + "</div>"
			
				count = count + 1;
				if (count == data.friends.length) {	
					$("#friends").html(loaded);
				} else {
					promise_function();
				}
			}
			promise_function();
		} else {
			$("#friends").html("<div class='has-text-centered'>No online friends to send chat requests</div>");
		}
	});
}

// Gets all of the chatrooms that a user is in and loads them
function getChats() {
	$.get("/getuserchats", function(data) {
		var loaded = "";
		if (data.chats.Items) {
			if (data.chats.Items.length) {
				for (var i = 0; i < data.chats.Items.length; i++) {
					var chat = data.chats.Items[i];
					var chat_users = data.chat_users[i];
					var is_group_chat = data.group_chats[i];
					chat_list.push(chat.chat_id.S);
					loaded = loaded + "<div onclick=\"location.href='/chats?id=" + chat.chat_id.S + "'\" class='card comment-button curr-chats pt-2'>";
					loaded = loaded + "<div class='card-content'>";
					loaded = loaded + "<div class='content'>";
					loaded = loaded + "<div class='columns is-flex is-vcentered'>"
					
					loaded = loaded + "<div class='column is-11'>"
					for (var j = 0; j < chat_users.length; j++) {
						var chat_user = chat_users[j];
						if (!is_group_chat && j == 0) {
							loaded = loaded + "Private chat with " + chat_user;
						} else if (j == 0) {
							loaded = loaded + "Group chat with " + chat_user;
						} else if (j == 3 && chat_users.length - 3 == 1) {
							loaded = loaded + ", and 1 other";
							break;
						} else if (j == 3) {
							loaded = loaded + ", and " + (chat_users.length - 3) + " others";
							break;
						} else {
							loaded = loaded + ", " + chat_user;
						}
					}
					if (!chat_users.length) {
						loaded = loaded + "Group chat with just you";
					}
					loaded = loaded + "</div>";
					
					loaded = loaded + "<div class='column is-1'>"
					loaded = loaded + "<i class='icon fas fa-sign-in-alt is-medium send-icon'></i>"
					loaded = loaded + "</div>";
					
					loaded = loaded + "</div>";
					loaded = loaded + "</div>";
					loaded = loaded + "</div>";
					loaded = loaded + "</div>";
				}
				
			}
		} else {
			loaded = "<div class='has-text-centered'>No current chats</div>";
		}
		$("#chats").html(loaded);
	});
}

// Loads all of the things described above upon page load in
$(document).ready(function() {
	$.getJSON("/refreshstartchat", function(data) {});
	getChatInvites();
	getChats();
	getFriendsOnline();
});

// Loads the same components as above, but also checks to see if any have been updated in the tables, and if so reloads the particular
// component of the page that has been updated
var refresh = function() {
	$.get("/getchatinvites", function(data) {
		var loaded = "";
		var updated = false;
		var temp_data = [];
		var temp_data2 = [];
		if (data.chat_invites.length) {
			for (var i = 0; i < data.chat_invites.length; i++) {
				var chat_invite = data.chat_invites[i];
				if (!chat_invite_list.includes(chat_invite.sender.S)) {
					chat_invite_list.push(chat_invite.sender.S);
					updated = true;
				}
				temp_data.push(chat_invite.sender.S);
				loaded = loaded + "<div class='card card-size comment-button mt-2 ml-3'>";
				loaded = loaded + "<div class='card-content online-friends pt-3 pb-3 pr-3 pl-3'>";
				loaded = loaded + "<div class='content'>";
				loaded = loaded + "<div class='columns is-flex is-vcentered'>";
				loaded = loaded + "<div class='column is-9'>";
				loaded = loaded + "Private chat request from " + chat_invite.first.S + " " + chat_invite.last.S;
				loaded = loaded + "</div>";

				loaded = loaded + "<div class='column is-1'>";
				loaded = loaded + "<form action='/postacceptchat?sender=" + chat_invite.sender.S + "&first=" 
					+ chat_invite.first.S + "&last=" + chat_invite.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='fas fa-check icon send-icon is-medium has-text-success'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";
				
				loaded = loaded + "<div class='column is-1'>";
				loaded = loaded + "<form action='/postrejectchat?sender=" + chat_invite.sender.S + "&first=" 
					+ chat_invite.first.S + "&last=" + chat_invite.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='fas fa-times fa-lg icon send-icon is-medium has-text-danger'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";

				
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
			}
		} else {
			if (chat_invite_list.length) {
				chat_invite_list = [];
				updated = true;
			}
		}
		if (data.group_chat_invites.length) {
			for (var i = 0; i < data.group_chat_invites.length; i++) {
				var group_chat_invite = data.group_chat_invites[i];
				if (!group_chat_invite_list.includes(group_chat_invite.sender.S)) {
					group_chat_invite_list.push(group_chat_invite.sender.S);
					updated = true;
				}
				temp_data2.push(group_chat_invite.sender.S);
				loaded = loaded + "<div class='card card-size comment-button mt-2 ml-3'>";
				loaded = loaded + "<div class='card-content online-friends pt-3 pb-3 pr-3 pl-3'>";
				loaded = loaded + "<div class='content'>";
				loaded = loaded + "<div class='columns is-flex is-vcentered'>";
				loaded = loaded + "<div class='column is-9'>";
				loaded = loaded + "Group chat request from " + group_chat_invite.first.S + " " + group_chat_invite.last.S;
				loaded = loaded + "</div>";
				
				loaded = loaded + "<div class='column is-1'>";
				loaded = loaded + "<form action='/postacceptgroupchat?id=" + group_chat_invite.chat_id.S + "&first=" 
					+ group_chat_invite.first.S + "&last=" + group_chat_invite.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='fas fa-check icon send-icon is-medium has-text-success'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";	
				
				loaded = loaded + "<div class='column is-1'>";
				loaded = loaded + "<form action='/postrejectgroupchat?id=" + group_chat_invite.chat_id.S + "&first=" 
					+ group_chat_invite.first.S + "&last=" + group_chat_invite.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='fas fa-times fa-lg icon send-icon is-medium has-text-danger'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";

				
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
			}
		} else {
			if (group_chat_invite_list.length) {
				group_chat_invite_list = [];
				updated = true;
			}
		}
		if (loaded == "") {
			loaded = "<div class='has-text-centered'>No chat invites</div>"
		}
		var limit = chat_invite_list.length;
		for (var iter = 0; iter < limit; iter++) {
			if (!temp_data.includes(chat_invite_list[iter])) {
				chat_invite_list.splice(iter, 1);
				limit = limit - 1;
				updated = true;
			}
		}
		var limit2 = group_chat_invite_list.length;
		for (var iter = 0; iter < limit; iter++) {
			if (!temp_data2.includes(group_chat_invite_list[iter])) {
				group_chat_invite_list.splice(iter, 1);
				limit2 = limit2 - 1;
				updated = true;
			}
		}
		if (updated) {
			$("#chat-invites").html(loaded);
		}
	});
	
	$.getJSON("/getonlinefriends", function(data) {
		if (data.friends.length) {
			var count = 0;
			var loaded = "";
			var temp_data3 = [];
			var updated2 = false;
  	    	var promise_function = function() {
				var friend = data.friends[count];
				if (!friend_list.includes(friend.username.S)) {
					friend_list.push(friend.username.S);
					updated2 = true;
				}
				temp_data3.push(friend.username.S);
				
				loaded = loaded + "<div class='card card-size comment-button mt-2'>";
				loaded = loaded + "<div class='card-content online-friends pt-3 pb-3 pr-3 pl-3'>";
				loaded = loaded + "<div class='content'>";
				loaded = loaded + "<div class='columns is-flex is-vcentered'>";
				
				loaded = loaded + "<div class='column is-10'>";
				loaded = loaded + friend.first_name.S + " " + friend.last.S;
				loaded = loaded + "</div>";
				

				loaded = loaded + "<div class=column>";
				loaded = loaded + "<form action='/postchatinvite?user=" + friend.username.S + "&first="
					+ friend.first_name.S + "&last=" + friend.last.S + "' method=\"post\">";
				loaded = loaded + "<button class='hidden-button'>";
				loaded = loaded + "<i class='far fa-paper-plane send-icon icon is-medium'></i>"
				loaded = loaded + "</button>";
				loaded = loaded + "</form>";
				loaded = loaded + "</div>";
				
				
				loaded = loaded + "</div>";
				loaded = loaded + "</div>";
				loaded = loaded + "</div>"
				loaded = loaded + "</div>"
			
				count = count + 1;
				if (count == data.friends.length) {
					var limit = friend_list.length;
					for (var iter = 0; iter < limit; iter++) {
						if (!temp_data3.includes(friend_list[iter])) {
							friend_list.splice(iter, 1);
							limit = limit - 1;
							updated2 = true;
						}
					}
					if (updated2) {
						$("#friends").html(loaded);
					}
				} else {
					promise_function();
				}
			}
			promise_function();
		} else {
			if (friend_list.length) {
				friend_list = [];
				$("#friends").html("<div class='has-text-centered'>No online friends to send chat requests</div>");
			}
			
		}
	});
	$.get("/getuserchats", function(data) {
		var loaded = "";
		var temp_data4 = [];
		var updated4 = false;
		if (data.chats.Items) {
			if (data.chats.Items.length) {
				for (var i = 0; i < data.chats.Items.length; i++) {
					var chat = data.chats.Items[i];
					var chat_users = data.chat_users[i];
					var is_group_chat = data.group_chats[i];
					if (!chat_list.includes(chat.chat_id.S)) {
						chat_list.push(chat.chat_id.S);
						updated4 = true;
					}
					temp_data4.push(chat.chat_id.S);
					loaded = loaded + "<div onclick=\"location.href='/chats?id=" + chat.chat_id.S + "'\" class='card comment-button curr-chats pt-2'>";
					loaded = loaded + "<div class='card-content'>";
					loaded = loaded + "<div class='content'>";
					loaded = loaded + "<div class='columns is-flex is-vcentered'>"
					
					loaded = loaded + "<div class='column is-11'>"
					for (var j = 0; j < chat_users.length; j++) {
						var chat_user = chat_users[j];
						if (!is_group_chat && j == 0) {
							loaded = loaded + "Private chat with " + chat_user;
						} else if (j == 0) {
							loaded = loaded + "Group chat with " + chat_user;
						} else if (j == 3 && chat_users.length - 3 == 1) {
							loaded = loaded + ", and 1 other";
							break;
						} else if (j == 3) {
							loaded = loaded + ", and " + (chat_users.length - 3) + " others";
							break;
						} else {
							loaded = loaded + ", " + chat_user;
						}
					}
					loaded = loaded + "</div>";
					
					loaded = loaded + "<div class='column is-1'>"
					loaded = loaded + "<i class='icon fas fa-sign-in-alt is-medium send-icon'></i>"
					loaded = loaded + "</div>";
					
					loaded = loaded + "</div>";
					loaded = loaded + "</div>";
					loaded = loaded + "</div>";
					loaded = loaded + "</div>";

				}
				var limit = chat_list.length;
				for (var iter = 0; iter < limit; iter++) {
					if (!temp_data4.includes(chat_list[iter])) {
						chat_list.splice(iter, 1);
						limit = limit - 1;
						updated4 = true;
					}
				}
			}
		} else {
			if (chat_list.length) {
				chat_list = [];
				return $("#chats").html("<div class='has-text-centered'>No current chats</div>");
			}
		}
		if (updated4) {
			$("#chats").html(loaded);
		}
	});
	setTimeout(refresh, 10000);
}

$(document).ready(function() {
	setTimeout(refresh, 10000);
});