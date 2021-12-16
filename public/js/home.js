// Maintains a list of the unique features like username and id of the core components of the page, so that these components only
// update when something has actually changed in the tables
var post_list = [];
var comments_list = [];
var friend_list = [];
var suggestion_list = [];
var requests_list = [];
var sent_requests_list = [];
var recommendations = [];
var friendMap = new Map();
var post_count = 0;
$(document).ready(function() {
	$.get('/refreshhome', function(data, s) {
		// Loads posts on the home page
  	    var loaded = "";
  	    var count = 0;
		post_count = 0;
  	    if (data.data.length) {
			var promise_function = function() {
				var post = data.data[count];
				post_list.push(post.id.S);
				$.when($.get('/comments?id=' + post.id.S, function(data, s) {
					post_count = post_count + 1;
					loaded = loaded + "<div class='columns mt-2 pt-6 pb-2'>";
					loaded = loaded + "<div class='has-background-info-light card is-10 is-offset-1 column main-posts is-centered'>";
					if (post.type.S === "post") {
						loaded = loaded + "<div class='media'>";
						loaded = loaded + "<div class='media-left'>";
						loaded = loaded + "<figure class='image is-48x48'>";
						loaded = loaded + "<img class='is-rounded' src='https://g29profilepictures.s3.amazonaws.com/"  
						+ post.username.S + "' onerror=\"this.onerror=null; this.src='https://g29profilepictures.s3.amazonaws.com/default.jpg'\">";
						loaded = loaded + "</figure>";
						loaded = loaded + "</div>";
						loaded = loaded + "<div class='media-content'>";
						if (post.username.S != post.wall_username.S){
							loaded = loaded + "<p class='title is-4'>"+ post.first.S + " " + post.last.S + " > " + post.wall_first.S + " " + post.wall_last.S+"</p>";
						} else{
							loaded = loaded + "<p class='title is-4'>"+ post.first.S + " " + post.last.S+"</p>";	
						}
						loaded = loaded + "<p class='subtitle is-6'>"+ post.date.S +" " + post.time.S+"</p>";
						loaded = loaded + "</div>";
						loaded = loaded + "</div>";
					}
					loaded = loaded + "<div class='content'>";
					loaded = loaded + "<p>"+ post.content.S +"</p>";
					loaded = loaded + "</div>";
					for (const comment of data.comments.Items) {
						comments_list.push(comment.id.S);
						loaded = loaded + "<p>";
						loaded = loaded + post.date.S + " " + post.time.S + "<strong> "+ comment.first.S + " " + comment.last.S +"</strong>";
						loaded = loaded + " "+comment.content.S+"<br>";
						loaded = loaded + "</p>";
					}
					loaded = loaded + "<form action=\"/comment?user=" + post.wall_username.S + "&id=" + post.id.S + "&type=1\" method=\"post\" class=\"updateform\" id='updateform'>"
					loaded = loaded + "<div class='field'>";
					loaded = loaded + "<input class = \"mt-1 input is-info\" type=\"text\" name=\"content\" id=\"content" + post_count + "\"></div><input type=\"submit\" class= \"comment-button input\" value=\"Comment\">"
					loaded = loaded + "</div>";
					loaded = loaded + "</form>";
					loaded = loaded + "</div>";
					loaded = loaded + "</div>";
				})).then(function() {
					count = count + 1;
					if (count == data.data.length) {
						$("#posts").html(loaded);
					} else {
						promise_function();
					}
				});
			}
			promise_function();
		} else {
			$("#posts").html("<div class='has-text-centered'>No posts yet</div>");
		}
		if (data.friends.length) {
			// Loads friends on the home page, along with an indicator of whether or not they are online
			var count2 = 0;
			var loaded2 = "";
  	    	var promise_function2 = function() {
				var friend = data.friends[count2];
				friendMap.set(friend.username.S, friend.stat.BOOL);
				friend_list.push(friend.username.S);
				loaded2 = loaded2 + "<div class= \"panel-block columns pl-0 mt-0 mb-0 pt-0 pb-0 pr-0 rem-hov friend-suggestion\"><div class=\" rem-hov pl-0 column is-10\">";
				loaded2 = loaded2 + "<a href=\"/wall?user=" + friend.username.S + "\" class = 'rem-hov panel-block friend-suggestion'>";
				if (friend.stat.BOOL) {
					loaded2 = loaded2 + "<span class='panel-icon online-icon'><i class=\"fas fa-circle\"></i></span>" + friend.first_name.S 
						+ " " + friend.last.S;
				} else {
					loaded2 = loaded2 + "<span class='panel-icon offline-icon'><i class=\"fas fa-circle\"></i></span>" + friend.first_name.S 
						+ " " + friend.last.S;
				}
				loaded2 = loaded2 + "</div>";
				loaded2 = loaded2 + "<div class='pl-4 hidden-button rem-hov'>";
				loaded2 = loaded2 + "<form action='/unfriend?user=" + friend.username.S + "&type=1' method=\"post\">";
				loaded2 = loaded2 + "<button class='hidden-button'>"+"<i class=\"fas fa-user-minus remove-user-icon icon is-medium pt-1 pb-1 mr-1\"></i>"+"</button>";
				loaded2 = loaded2 + "</form>";
				loaded2 = loaded2 + "</div>";
				loaded2 = loaded2 + "</div>";
				count2 = count2 + 1;
				if (count2 == data.friends.length) {	
					$("#friends").html(loaded2);
				} else {
					promise_function2();
				}
			}
			promise_function2();
		} else {
			$("#friends").html("<div class='ml-2'>No friends yet</div>");
		}
		if (data.suggestions.length) {
			// Loads friend suggestions based on same affiliation
			var count3 = 0;
			var loaded3 = "";
  	    	var promise_function3 = function() {
				var suggestion = data.suggestions[count3];
				suggestion_list.push(suggestion.username.S);
				loaded3 = loaded3 + "<div class= \"panel-block columns mt-0 mb-0 pt-0 pb-0 friend-suggestion\"><div class=\" pl-0 column is-10\">"
					+ "<a class= 'sugg-names' href=\"/wall?user=" + suggestion.username.S + "\">" + suggestion.first_name.S + " " + suggestion.last.S + "</a></div>"
					+ "<div class=\"column add-user-icon\"><form action='/createfriendrequest?user=" + suggestion.username.S + "&type=1' method=\"post\">"
					+ "<button type=\"submit\" id=\"completed-task\" class=\"pl-5 hidden-button\" name=\"friend\" value=\"Add " + suggestion.first_name.S + " " + suggestion.last.S + "\">"
					+ "<i class=\"fas fa-user-plus add-user-icon icon is-medium pt-1 mr-1\"></i></button></form></div></div>";
				count3 = count3 + 1;
				if (count3 == data.suggestions.length) {
					$("#suggestions").html(loaded3);
				} else {
					promise_function3();
				}
			}
			promise_function3();
		} else {
			$("#suggestions").html("<span class='ml-2 mt-2'>No suggested users of the same affiliation</span>");
		}
		if (data.requests.length) {
			// Loads incoming friend requests, with the option to accept or reject them
			var count4 = 0;
			var loaded4 = "";
  	    	var promise_function4 = function() {
				var request = data.requests[count4];
				requests_list.push(request.requester_username.S);
				loaded4 = loaded4 + "<div class= \"panel-block columns mt-0 mb-0 pl-0 pt-0 pb-0 friend-suggestion\"><div class=\"column is-9\">"
					+ "<a class='sugg-names' href=\"/wall?user=" + request.requester_username.S + "\">" + request.first.S + " " + request.last.S + "</a></div>"
					+ "<div class=\"column is-2 add-user-icon\">"
				loaded4 = loaded4 + "<form action='/acceptrequest?user=" + request.requester_username.S + "&type=1' method=\"post\">"
					+ "<button type=\"submit\" id=\"completed-task\" class=\"pl-5 hidden-button\" name=\"friend\">"
					+ "<i class=\"fas fa-user-plus add-user-icon icon is-medium pt-1 mr-1\"></i></button></form>";
				loaded4 = loaded4 + "</div><div class='column is-2'><form action='/rejectrequest?user=" + request.requester_username.S + "&type=1' method=\"post\">"
					+ "<button class='hidden-button'>"+"<i class=\"fas fa-user-minus remove-user-icon icon is-medium pt-1 mr-1\"></i>"+"</button></form></div></div>";
				count4 = count4 + 1;
				if (count4 == data.requests.length) {
					$("#requests").html(loaded4);
				} else {
					promise_function4();
				}
			}
			promise_function4();
		} else {
			$("#requests").html("<span class='ml-2 mt-2'>No friend requests</span>");
		}
		if (data.sent_requests.length) {
			// Loads outgoing friend requests, with the option to unsend them
			var count5 = 0;
			var loaded5 = "";
  	    	var promise_function5 = function() {
				var sent_request = data.sent_requests[count5];
				sent_requests_list.push(sent_request.username.S);
				loaded5 = loaded5 + "<div class= \"panel-block columns mt-0 mb-0 pr-0 pt-0 pb-0 friend-suggestion\"><div class=\"pl-0 column is-10\">"
					+ "<a class= 'sugg-names' href=\"/wall?user=" + sent_request.username.S + "\">" + sent_request.first.S + " " + sent_request.last.S + "</a>";
				loaded5 = loaded5 + "</div>";
				loaded5 = loaded5 + "<div class='column pl-4 ml-2 pr-0 hidden-button rem-hov'>";
				loaded5 = loaded5 + "<form action='/undofriendrequest?user=" + sent_request.username.S + "&type=1' method=\"post\">";
				loaded5 = loaded5 + "<button class='hidden-button'>"+"<i class=\"fas fa-user-minus remove-user-icon icon is-medium pt-1 pb-1 mr-1\"></i>"+"</button></form>";
				loaded5 = loaded5 + "</div>";
				loaded5 = loaded5 + "</div>";
				count5 = count5 + 1;
				if (count5 == data.sent_requests.length) {
					$("#sent_requests").html(loaded5);
				} else {
					promise_function5();
				}
			}
			promise_function5();
		} else {
			$("#sent_requests").html("<span class='ml-2 mt-2'>No outgoing friend requests</span>");
		}
		if (data.recommendations.length) {
			// Loads article recommendations based on the absorption news algorithm
			var count6 = 0;
			var loaded6 = "";
  	    	var promise_function6 = function() {
				var recommendation = data.recommendations[count6];
				recommendations.push(recommendation.articleID.N);
				loaded6 = loaded6 + "<div class='card mt-2'>"
				loaded6 = loaded6 + "<div class='card-content pb-0'>";
				loaded6 = loaded6 + "<div class='content'>";
				loaded6 = loaded6 + "<a href='" + recommendation.url.S + "'>" + recommendation.headline.S + "</a><br>";
				loaded6 = loaded6 + "<footer class='card-footer mt-1 '>";
				if (!data.liked_articles.includes(recommendation.articleID.N)) {
					loaded6 = loaded6 + "<form action='/articlelike?articleId=" + recommendation.articleID.N + "&type=1' method='post'>";
					loaded6 = loaded6 + "<button class='hidden-button'>"+"<i class=\"fas fa-heart unlike remove-user-icon icon is-medium pt-1 pb-1 mr-1\"></i>"+"</button>";
					loaded6 = loaded6 + "</form>";
				} else {
					loaded6 = loaded6 + "<form action='/articlelike?articleId=" + recommendation.articleID.N + "&type=1' method='post'>";
					loaded6 = loaded6 + "<button class='hidden-button'>"+"<i class=\"fas fa-heart like remove-user-icon icon is-medium pt-1 pb-1 mr-1\"></i>"+"</button>";
					loaded6 = loaded6 + "</form>";
				}
				loaded6 = loaded6 + "</footer>";
				loaded6 = loaded6 + "</div>";
				loaded6 = loaded6 + "</div>";
				loaded6 = loaded6 + "</div>";
				count6 = count6 + 1;
				if (count6 == data.recommendations.length) {
					$("#recommendations").html(loaded6);
				} else {
					promise_function6();
				}
			}
			promise_function6();
		} else {
			$("#recommendations").html("<span class='ml-2 mt-2'>No recommended articles for today</span>");
		}
    });
});

// Loads the same components as above, but also checks to see if any have been updated in the tables, and if so reloads the particular
// component of the page that has been updated. Note here that if a user is typing a comment, even if a new post comes in, the posts
// don't reload, since that would clear out the comment, the page only reloads if the comment is posted or deleted
var refresh = function() {
    $.get('/refreshhome', function(data, s) {
  	    var loaded = "";
  	    var count = 0;
  	    var updated = false;
		var temp_post_list = [];
		var temp_comment_list = [];
		var num_posts = 0;
  	    if (data.data.length) {
			var promise_function = function() {
				var post = data.data[count];
				if (!post_list.includes(post.id.S)) {
					post_list.push(post.id.S);
					updated = true;
				}
				temp_post_list.push(post.id.S);
				$.when($.get('/comments?id=' + post.id.S, function(data, s) {
					num_posts = num_posts + 1;
					loaded = loaded + "<div class='columns mt-2 pt-6 pb-2'>";
					loaded = loaded + "<div class='has-background-info-light card is-10 is-offset-1 column main-posts is-centered'>";
					if (post.type.S === "post") {
						loaded = loaded + "<div class='media'>";
						loaded = loaded + "<div class='media-left'>";
						loaded = loaded + "<figure class='image is-48x48'>";
						loaded = loaded + "<img class='is-rounded' src='https://g29profilepictures.s3.amazonaws.com/"  
							+ post.username.S + "' onerror=\"this.onerror=null; this.src='https://g29profilepictures.s3.amazonaws.com/default.jpg'\">";
						loaded = loaded + "</figure>";
						loaded = loaded + "</div>";
						loaded = loaded + "<div class='media-content'>";
						if (post.username.S != post.wall_username.S){
							loaded = loaded + "<p class='title is-4'>"+ post.first.S + " " + post.last.S + " > " + post.wall_first.S + " " + post.wall_last.S+"</p>";
						} else {
							loaded = loaded + "<p class='title is-4'>"+ post.first.S + " " + post.last.S+"</p>";	
						}
						loaded = loaded + "<p class='subtitle is-6'>"+ post.date.S +" " + post.time.S+"</p>";
						loaded = loaded + "</div>";
						loaded = loaded + "</div>";
					}
					loaded = loaded + "<div class='content'>";
					loaded = loaded + "<p>"+ post.content.S +"</p>";
					loaded = loaded + "</div>";
					for (const comment of data.comments.Items) {
						if (!comments_list.includes(comment.id.S)) {
							comments_list.push(comment.id.S);
							updated = true;
						}
						temp_comment_list.push(comment.id.S);
						loaded = loaded + "<p>";
						loaded = loaded + post.date.S + " " + post.time.S + "<strong> "+ comment.first.S + " " + comment.last.S +"</strong>";
						loaded = loaded + " "+comment.content.S+"<br>";
						loaded = loaded + "</p>";
					}
					loaded = loaded + "<form action=\"/comment?user=" + post.wall_username.S + "&id=" + post.id.S + "&type=1\" method=\"post\" class=\"updateform\">"
					loaded = loaded + "<div class='field'>";
					loaded = loaded + "<input class = \"mt-1 input is-info\" type=\"text\" name=\"content\" id=\"content" + num_posts + "\"></div><input type=\"submit\" class= \"comment-button input\" value=\"Comment\">"
					loaded = loaded + "</div>";
					loaded = loaded + "</form>";
					loaded = loaded + "</div>";
					loaded = loaded + "</div>";
				})).then(function() {
					count = count + 1;
					if (count == data.data.length) {
						var limit = post_list.length;
						for (var iter = 0; iter < limit; iter++) {
							if (!temp_post_list.includes(post_list[iter])) {
								post_list.splice(iter, 1);
								limit = limit - 1;
								updated = true;
							}
						}
						var limit2 = comments_list.length;
						for (var iter = 0; iter < limit2; iter++) {
							if (!temp_comment_list.includes(comments_list[iter])) {
								comments_list.splice(iter, 1);
								limit2 = limit2 - 1;
								updated = true;
							}
						}
						if (updated) {
							post_count = num_posts;
							$("#posts").html(loaded);
						}
					} else {
						promise_function();
					}
				});
			}
			// Checks every comment box to make sure there isn't a comment in the box, if there is then we don't refresh
			var call_refresh = true;
			for (var i = 1; i <= post_count; i++) {
				var content = "#content" + i;
				if ($(content).val() !== "") {
					call_refresh = false;
				}
			}
			if (call_refresh) {
				promise_function();
			}
		} else {
			post_list = [];
			post_count = 0;
			$("#posts").html("<div class='has-text-centered'>No posts yet</div>");
		}
		if (data.friends.length) {
			var count2 = 0;
			var loaded2 = "";
			var updated2 = false; 
			var data_list = [];
  	    	var promise_function2 = function() {
				var friend = data.friends[count2];
				if (!friend_list.includes(friend.username.S)) {
					friend_list.push(friend.username.S);
					updated2 = true;
				}
				if (friendMap.get(friend.username.S) === undefined) {
					friendMap.set(friend.username.S, friend.stat.BOOL);
					updated2 = true;
				} else if (friendMap.get(friend.username.S) != friend.stat.BOOL) {
					friendMap.set(friend.username.S, friend.stat.BOOL);
					updated2 = true;
				}
				data_list.push(friend.username.S);
				loaded2 = loaded2 + "<div class= \"panel-block columns pl-0 mt-0 mb-0 pt-0 pb-0 pr-0 rem-hov friend-suggestion\"><div class=\" rem-hov pl-0 column is-10\">";
				loaded2 = loaded2 + "<a href=\"/wall?user=" + friend.username.S + "\" class = 'rem-hov panel-block friend-suggestion'>";
				if (friend.stat.BOOL) {
					loaded2 = loaded2 + "<span class='panel-icon online-icon'><i class=\"fas fa-circle\"></i></span>" + friend.first_name.S 
						+ " " + friend.last.S;
				} else {
					loaded2 = loaded2 + "<span class='panel-icon offline-icon'><i class=\"fas fa-circle\"></i></span>" + friend.first_name.S 
						+ " " + friend.last.S;
				}
					"<input class = 'is-dark' type=\"submit\" name=\"unfriend\" value=\"Unfriend\"></form></a>";
				loaded2 = loaded2 + "</div>";
				loaded2 = loaded2 + "<div class='pl-4 hidden-button rem-hov'>";
				loaded2 = loaded2 + "<form action='/unfriend?user=" + friend.username.S + "&type=1' method=\"post\">";
				loaded2 = loaded2 + "<button class='hidden-button'>"+"<i class=\"fas fa-user-minus remove-user-icon icon is-medium pt-1 pb-1 mr-1\"></i>"+"</button>";
				loaded2 = loaded2 + "</form>";
				loaded2 = loaded2 + "</div>";
				loaded2 = loaded2 + "</div>";
				count2 = count2 + 1;
				if (count2 == data.friends.length) {
					var limit = friend_list.length;
					for (var iter = 0; iter < limit; iter++) {
						if (!data_list.includes(friend_list[iter])) {
							friend_list.splice(iter, 1);
							friendMap.delete(friend_list[iter]);
							limit = limit - 1;
							updated2 = true;
						}
					}
					if (updated2) {
						$("#friends").html(loaded2);
					}
				} else {
					promise_function2();
				}
			}
			promise_function2();
		} else {
			friend_list = [];
			$("#friends").html("<div class='ml-2'>No friends yet</div>");
		} 
		if (data.suggestions.length) {
			var count3 = 0;
			var loaded3 = "";
			var data_list3 = [];
			var updated3 = false;
  	    	var promise_function3 = function() {
				var suggestion = data.suggestions[count3];
				if (!suggestion_list.includes(suggestion.username.S)) {
					suggestion_list.push(suggestion.username.S);
					updated3 = true;
				}
				data_list3.push(suggestion.username.S);
				loaded3 = loaded3 + "<div class= \"panel-block columns mt-0 mb-0 pt-0 pb-0 friend-suggestion\"><div class=\"column is-10\">"
					+ "<a class='sugg-names'href=\"/wall?user=" + suggestion.username.S + "\">" + suggestion.first_name.S + " " + suggestion.last.S + "</a></div>"
					+ "<div class=\"column add-user-icon\"><form action='/createfriendrequest?user=" + suggestion.username.S + "&type=1' method=\"post\">"
					+ "<button type=\"submit\" id=\"completed-task\" class=\"pl-5 hidden-button\" name=\"friend\" value=\"Add " + suggestion.first_name.S + " " + suggestion.last.S + "\">"
					+ "<i class=\"fas fa-user-plus add-user-icon icon is-medium pt-1 mr-1\"></i></button></form></div></div>";
				count3 = count3 + 1;
				if (count3 == data.suggestions.length) {
					var limit3 = suggestion_list.length;
					for (var iter3 = 0; iter3 < limit3; iter3++) {
						if (!data_list3.includes(suggestion_list[iter3])) {
							suggestion_list.splice(iter3, 1);
							limit3 = limit3 - 1;
							updated3 = true;
						}
					}
					if (updated3) {
						$("#suggestions").html(loaded3);
					}
				} else {
					promise_function3();
				}
			}
			promise_function3();
		} else {
			suggestion_list = [];
			$("#suggestions").html("<span class='ml-2 mt-2'>No suggested users of the same affiliation</span>");
		}
		if (data.requests.length) {
			var count4 = 0;
			var loaded4 = "";
			var updated4 = false;
			var data_list4 = [];
  	    	var promise_function4 = function() {
				var request = data.requests[count4];
				if (!requests_list.includes(request.requester_username.S)) {
					requests_list.push(request.requester_username.S);
					updated4 = true;
				}
				data_list4.push(request.requester_username.S);
				loaded4 = loaded4 + "<div class= \"panel-block columns mt-0 mb-0 pl-0 pt-0 pb-0 friend-suggestion\"><div class=\"column is-9\">"
					+ "<a class='sugg-names'href=\"/wall?user=" + request.requester_username.S + "\">" + request.first.S + " " + request.last.S + "</a></div>"
					+ "<div class=\"column is-2 add-user-icon\">"
				loaded4 = loaded4 + "<form action='/acceptrequest?user=" + request.requester_username.S + "&type=1' method=\"post\">"
					+ "<button type=\"submit\" id=\"completed-task\" class=\"pl-5 hidden-button\" name=\"friend\">"
					+ "<i class=\"fas fa-user-plus add-user-icon icon is-medium pt-1 mr-1\"></i></button></form>";
				loaded4 = loaded4 + "</div><div class='column is-2'><form action='/rejectrequest?user=" + request.requester_username.S + "&type=1' method=\"post\">"
					+ "<button class='hidden-button'>"+"<i class=\"fas fa-user-minus remove-user-icon icon is-medium pt-1 mr-1\"></i>"+"</button></form></div></div>";
				count4 = count4 + 1;
				if (count4 == data.requests.length) {
					var limit4 = requests_list.length;
					for (var iter4 = 0; iter4 < limit4; iter4++) {
						if (!data_list4.includes(requests_list[iter4])) {
							requests_list.splice(iter4, 1);
							limit4 = limit4 - 1;
							updated4 = true;
						}
					}
					if (updated4) {
						$("#requests").html(loaded4);
					}
				} else {
					promise_function4();
				}
			}
			promise_function4();
		} else {
			requests_list = [];
			$("#requests").html("<span class='ml-2 mt-2'>No friend requests</span>");
		}
		if (data.sent_requests.length) {
			var count5 = 0;
			var loaded5 = "";
			var updated5 = false;
			var data_list5 = [];
  	    	var promise_function5 = function() {
				var sent_request = data.sent_requests[count5];
				if (!sent_requests_list.includes(sent_request.username.S)) {
					updated5 = true;
					sent_requests_list.push(sent_request.username.S);
				}
				data_list5.push(sent_request.requester_username.S);
				loaded5 = loaded5 + "<div class= \"panel-block columns mt-0 mb-0 pr-0 pt-0 pb-0 friend-suggestion\"><div class=\"pl-0 column is-10\">"
					+ "<a class= 'sugg-names' href=\"/wall?user=" + sent_request.username.S + "\">" + sent_request.first.S + " " + sent_request.last.S + "</a>";
				loaded5 = loaded5 + "</div>";
				loaded5 = loaded5 + "<div class='column pl-4 ml-2 pr-0 hidden-button rem-hov'>";
				loaded5 = loaded5 + "<form action='/undofriendrequest?user=" + sent_request.username.S + "&type=1' method=\"post\">";
				loaded5 = loaded5 + "<button class='hidden-button'>"+"<i class=\"fas fa-user-minus remove-user-icon icon is-medium pt-1 pb-1 mr-1\"></i>"+"</button></form>";
				loaded5 = loaded5 + "</div>";
				loaded5 = loaded5 + "</div>";
				count5 = count5 + 1;
				if (count5 == data.sent_requests.length) {
					var limit5 = sent_requests_list.length;
					for (var iter5 = 0; iter5 < limit5; iter5++) {
						if (!data_list5.includes(sent_requests_list[iter5])) {
							sent_requests_list.splice(iter5, 1);
							limit5 = limit5 - 1;
							updated5 = true;
						}
					}
					if (updated5) {
						$("#sent_requests").html(loaded5);
					}
				} else {
					promise_function5();
				}
			}
			promise_function5();
		} else {
			sent_requests_list = [];
			$("#sent_requests").html("<span class='ml-2 mt-2'>No outgoing friend requests</span>");
		}
		if (data.recommendations.length) {
			var count6 = 0;
			var loaded6 = "";
			var updated6 = false;
			var previously_recommended = "";
  	    	var promise_function6 = function() {
				var recommendation = data.recommendations[count6];
				
				/*<div class="card">
				  <div class="card-content">
				    <div class="content">
				      Lorem ipsum leo risus, porta ac consectetur ac, vestibulum at eros. Donec id elit non mi porta gravida at eget metus. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Cras mattis consectetur purus sit amet fermentum.
				    </div>
				  </div>
				</div>*/
				if (!recommendations.includes(recommendation.articleID.N)) {
					previously_recommended = recommendations[0];
					recommendations = [];
					recommendations.push(recommendation.articleID.N);
				}
				loaded6 = loaded6 + "<div class='card mt-2'>"
				loaded6 = loaded6 + "<div class='card-content pb-0'>";
				loaded6 = loaded6 + "<div class='content'>";
				loaded6 = loaded6 + "<a href='" + recommendation.url.S + "'>" + recommendation.headline.S + "</a><br>";
				loaded6 = loaded6 + "<footer class='card-footer mt-1 '>";
				if (!data.liked_articles.includes(recommendation.articleID.N)) {
					loaded6 = loaded6 + "<form action='/articlelike?articleId=" + recommendation.articleID.N + "&type=1' method='post'>";
					loaded6 = loaded6 + "<button class='hidden-button'>"+"<i class=\"fas fa-heart unlike remove-user-icon icon is-medium pt-1 pb-1 mr-1\"></i>"+"</button>";
					loaded6 = loaded6 + "</form>";
				} else {
					loaded6 = loaded6 + "<form action='/articlelike?articleId=" + recommendation.articleID.N + "&type=1' method='post'>";
					loaded6 = loaded6 + "<button class='hidden-button'>"+"<i class=\"fas fa-heart like remove-user-icon icon is-medium pt-1 pb-1 mr-1\"></i>"+"</button>";
					loaded6 = loaded6 + "</form>";
				}
				loaded6 = loaded6 + "</footer>";
				loaded6 = loaded6 + "</div>";
				loaded6 = loaded6 + "</div>";
				loaded6 = loaded6 + "</div>";
				
				count6 = count6 + 1;
				if (count6 == data.recommendations.length) {
					if (updated6) {
						$.get("/alreadyrecommend?articleId=" + previously_recommended, function(data, s) {
							$("#recommendations").html(loaded6);
						});
					}
				} else {
					promise_function6();
				}
			}
			promise_function6();
		} else {
			$("#recommendations").html("<span class='ml-2 mt-2'>No recommended articles for today</span>");
		}
    });
	setTimeout(refresh, 10000);
}

$(document).ready(function() {
	setTimeout(refresh, 10000);
});