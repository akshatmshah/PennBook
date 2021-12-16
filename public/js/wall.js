// Maintains a list of the unique features like username and id of the core components of the page, so that these components only
// update when something has actually changed in the tables
var post_list = [];
var comments_list = [];
var received_request_here = false;
var sent_request_here = false;
var friend_here = false;
var visibility_here = false;
var post_count = 0;
$(document).ready(function () {
    $.get('/refreshwall', function (data, s) {
        // Loads posts and comments
        var loaded = "";
        var count = 0;
        var friend = data.friend;
        var visibility = data.visibility;
        received_request_here = data.received_request;
        sent_request_here = data.sent_request;
        friend_here = data.friend;
        visibility_here = data.visibility;
        if (friend || (!friend && visibility === "public") || data.user == data.username) {
            if (data.data.Items.length) {
                var promise_function = function () {
                    var user = data.user;
                    var post = data.data.Items[count];
                    post_list.push(post.id.S);
                    $.when($.get('/comments?id=' + post.id.S, function (data2, s) {
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
                            if (post.username.S != post.wall_username.S) {
                                loaded = loaded + "<p class='title is-4'>" + post.first.S + " " + post.last.S + " > " + post.wall_first.S + " " + post.wall_last.S + "</p>";
                            } else {
                                loaded = loaded + "<p class='title is-4'>" + post.first.S + " " + post.last.S + "</p>";
                            }
                            loaded = loaded + "<p class='subtitle is-6'>" + post.date.S + " " + post.time.S + "</p>";
                            loaded = loaded + "</div>";
                            loaded = loaded + "</div>";
                        }
                        loaded = loaded + "<div class='content'>";
                        loaded = loaded + "<p>" + post.content.S + "</p>";
                        loaded = loaded + "</div>";
                        for (const comment of data2.comments.Items) {
                            comments_list.push(comment.id.S);
                            loaded = loaded + "<p>";
                            loaded = loaded + post.date.S + " " + post.time.S + "<strong> " + comment.first.S + " " + comment.last.S + "</strong>";
                            loaded = loaded + " " + comment.content.S + "<br>";
                            loaded = loaded + "</p>";
                        }
                        if (friend || data.user == data.username) {
                            loaded = loaded + "<form action=\"/comment?user=" + user + "&id=" + post.id.S + "&type=2\" method=\"post\" class=\"updateform\">"
                            loaded = loaded + "<div class='field'>";
                            loaded = loaded + "<input class = \"mt-1 input is-info\" type=\"text\" name=\"content\" id=\"content" + post_count + "\"></div><input type=\"submit\" class= \"comment-button input\" value=\"Comment\">"
                            loaded = loaded + "</div>";
                        }
                        loaded = loaded + "</form>";
                        loaded = loaded + "</div>";
                        loaded = loaded + "</div>";
                    })).then(function () {
                        count = count + 1;
                        if (count >= data.data.Items.length) {
                            $("#posts").html(loaded);
                        } else {
                            promise_function();
                        }
                    });
                }
                promise_function();
            } else {
                loaded = "No posts yet!";
                $("#posts").html(loaded);
            }
        } else {
            loaded = "This user's profile is set to private. Friend them to see their posts!";
            $("#posts").html(loaded);
        }
        // Loads form where you can write a post if you are a friend or the user of the wall
        if (friend || data.user == data.username) {
            var loaded2 = "<form action=\"/wallpost?user=" + data.user + "\" method=\"post\" class=\"updateform\">"
            loaded2 = loaded2 + "<div class='columns'>";
            loaded2 = loaded2 + "<div class='column is-10 is-offset-1'>";
            loaded2 = loaded2 + "<textarea class ='textarea mt-4 text-wall' placeholder='Write your post' type='text' name='content' id='content'></textarea>";
            loaded2 = loaded2 + "<footer class='card-footer'>";
            loaded2 = loaded2 + "<input type='submit' class='input post-home comment-button' value='Post'>";
            loaded2 = loaded2 + "</footer>";
            loaded2 = loaded2 + "</form>";
            loaded2 = loaded2 + "</div>";
            loaded2 = loaded2 + "</div>";
            $("#writepost").html(loaded2);
        }
        // Loads either the friend, unfriend, accept/reject friend request, or undo friend request, or none of them, depending on your
        // relationship with the wall user at the moment
        var loaded3 = "";
        if (friend) {
            loaded3 = loaded3 + "<form action='/unfriend?user=" + data.user + "&type=2' method=\"post\"><input class ='mt-1 button is-dark is-rounded' "
                + "type=\"submit\" name=\"friend\" value=\"Unfriend\"></form>";
        } else {
            if (data.received_request) {
                loaded3 = "<form action='/acceptrequest?user=" + data.user + "&type=2' method=\"post\">"
                    + "<input class = 'button is-dark is-rounded' type=\"submit\" name=\"friend\" value=\"Accept Friend Request\"></form>"
                    + "<form action='/rejectrequest?user=" + data.user + "&type=2' method=\"post\">"
                    + "<input class = 'button is-dark is-rounded' type=\"submit\" name=\"friend\" value=\"Reject Friend Request\"></form>";
            } else if (data.user != data.username && !data.sent_request) {
                loaded3 = "<form action='/createfriendrequest?user=" + data.user + "&type=2' method=\"post\">"
                    + "<input class = 'button is-dark is-rounded' type=\"submit\" name=\"friend\" value=\"Send Friend Request\"></form>";
            } else if (data.sent_request) {
                loaded3 = "<form action='/undofriendrequest?user=" + data.user + "&type=2' method=\"post\">"
                    + "<input class = 'button is-dark is-rounded' type=\"submit\" name=\"friend\" value=\"Undo Friend Request\"></form>";
            }
        }
        $("#friendbutton").html(loaded3);

        $.get('/getimage?user=' + data.user, function (data2, s) {
            var load = "";
            if (data2.picture) {
                load = load + "<figure class='ml-3 image is-600x600'>";
                load = load + "<img class='is-rounded' src=\"https://g29profilepictures.s3.amazonaws.com/" + data.user + "\">";
                load = load + "</figure>";
            } else {
                load = load + "<figure class='ml-3 is-centered image is-600x600'>";
                load = load + "<img class='is-rounded' src=\"https://g29profilepictures.s3.amazonaws.com/default.jpg\">";
                load = load + "</figure>";
            }
            $('#image').html(load);
        })
    });


});

// Loads the same components as above, but also checks to see if any have been updated in the tables, and if so reloads the particular
// component of the page that has been updated. Note here that if a user is typing a comment, even if a new post comes in, the posts
// don't reload, since that would clear out the comment, the page only reloads if the comment is posted or deleted
var refresh = function () {
    $.get('/refreshwall', function (data, s) {
        var loaded = "";
        var count = 0;
        var updated = false;
        var num_posts = 0;
        var visibility = data.visibility;
        if (visibility_here != visibility) {
            visibility_here = visibility;
            updated = true;
        }
        var friend = data.friend;
        if (friend_here != friend) {
            friend_here = friend;
            updated = true;
        }
        if (received_request_here != data.received_request) {
            received_request_here = data.received_request;
            updated = true;
        }
        if (sent_request_here != data.sent_request) {
            sent_request_here = data.sent_request;
            updated = true;
        }
        if (friend || (!friend && visibility === "public") || data.user == data.username) {
            if (data.data.Items.length) {
                var data_list = [];
                var data_list2 = [];
                var promise_function = function () {
                    var post = data.data.Items[count];
                    var friend = data.friend;
                    var user = data.user;
                    if (!post_list.includes(post.id.S)) {
                        post_list.push(post.id.S);
                        updated = true;
                    }
                    data_list.push(post.id.S);
                    $.when($.get('/comments?id=' + post.id.S, function (data2, s) {
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
                            if (post.username.S != post.wall_username.S) {
                                loaded = loaded + "<p class='title is-4'>" + post.first.S + " " + post.last.S + " > " + post.wall_first.S + " " + post.wall_last.S + "</p>";
                            } else {
                                loaded = loaded + "<p class='title is-4'>" + post.first.S + " " + post.last.S + "</p>";
                            }
                            loaded = loaded + "<p class='subtitle is-6'>" + post.date.S + " " + post.time.S + "</p>";
                            loaded = loaded + "</div>";
                            loaded = loaded + "</div>";
                        }
                        loaded = loaded + "<div class='content'>";
                        loaded = loaded + "<p>" + post.content.S + "</p>";
                        loaded = loaded + "</div>";
                        for (const comment of data2.comments.Items) {
                            comments_list.push(comment.id.S);
                            loaded = loaded + "<p>";
                            loaded = loaded + post.date.S + " " + post.time.S + "<strong> " + comment.first.S + " " + comment.last.S + "</strong>";
                            loaded = loaded + " " + comment.content.S + "<br>";
                            loaded = loaded + "</p>";
                        }
                        if (friend || data.user == data.username) {
                            loaded = loaded + "<form action=\"/comment?user=" + user + "&id=" + post.id.S + "&type=2\" method=\"post\" class=\"updateform\">"
                            loaded = loaded + "<div class='field'>";
                            loaded = loaded + "<input class = \"mt-1 input is-info\" type=\"text\" name=\"content\" id=\"content" + num_posts + "\"></div><input type=\"submit\" class= \"comment-button input\" value=\"Comment\">"
                            loaded = loaded + "</div>";
                        }
                        loaded = loaded + "</form>";
                        loaded = loaded + "</div>";
                        loaded = loaded + "</div>";
                    })).then(function () {
                        count = count + 1;
                        if (count >= data.data.Items.length) {
                            var limit = post_list.length;
                            for (var iter = 0; iter < limit; iter++) {
                                if (!data_list.includes(post_list[iter])) {
                                    post_list.splice(iter, 1);
                                    limit = limit - 1;
                                    updated = true;
                                }
                            }
                            var limit2 = comments_list.length;
                            for (var iter2 = 0; iter2 < limit2; iter2++) {
                                if (!data_list2.includes(comments_list[iter])) {
                                    comments_list.splice(iter2, 1);
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
                loaded = "No posts yet!";
                post_list = [];
                post_count = 0;
                if (updated) {
                    $("#posts").html(loaded);
                }
            }
        } else {
            loaded = "This user's profile is set to private. Friend them to see their posts!";
            $("#posts").html(loaded);
        }
        if (friend || data.user == data.username) {
            var loaded2 = "<form action=\"/wallpost?user=" + data.user + "\" method=\"post\" class=\"updateform\">"
            loaded2 = loaded2 + "<div class='columns'>";
            loaded2 = loaded2 + "<div class='column is-10 is-offset-1'>";
            loaded2 = loaded2 + "<textarea class ='textarea mt-4 text-wall' placeholder='Write your post' type='text' name='content' id='content'></textarea>";
            loaded2 = loaded2 + "<footer class='card-footer'>";
            loaded2 = loaded2 + "<input type='submit' class='input post-home comment-button' value='Post'>";
            loaded2 = loaded2 + "</footer>";
            loaded2 = loaded2 + "</form>";
            loaded2 = loaded2 + "</div>";
            loaded2 = loaded2 + "</div>";
            if (updated) {
                $("#writepost").html(loaded2);
            }
        } else {
            var loaded2 = "";
            if (updated) {
                $("#writepost").html(loaded2);
            }
        }
        var loaded3 = "";
        if (friend) {
            loaded3 = loaded3 + "<form action='/unfriend?user=" + data.user + "&type=2' method=\"post\"><input class ='mt-1 button is-dark is-rounded' "
                + "type=\"submit\" name=\"friend\" value=\"Unfriend\"></form>";
        } else {
            if (data.received_request) {
                loaded3 = "<form action='/acceptrequest?user=" + data.user + "&type=2' method=\"post\">"
                    + "<input class = 'button is-dark is-rounded' type=\"submit\" name=\"friend\" value=\"Accept Friend Request\"></form>"
                    + "<form action='/rejectrequest?user=" + data.user + "&type=2' method=\"post\">"
                    + "<input class = 'button is-dark is-rounded' type=\"submit\" name=\"friend\" value=\"Reject Friend Request\"></form>";
            } else if (data.user != data.username && !data.sent_request) {
                loaded3 = "<form action='/createfriendrequest?user=" + data.user + "&type=2' method=\"post\">"
                    + "<input class = 'button is-dark is-rounded' type=\"submit\" name=\"friend\" value=\"Send Friend Request\"></form>";
            } else if (data.sent_request) {
                loaded3 = "<form action='/undofriendrequest?user=" + data.user + "&type=2' method=\"post\">"
                    + "<input class = 'button is-dark is-rounded' type=\"submit\" name=\"friend\" value=\"Undo Friend Request\"></form>";
            }
        }
        if (updated) {
            $("#friendbutton").html(loaded3);
        }
    });
    setTimeout(refresh, 10000);
}

$(document).ready(function () {
    setTimeout(refresh, 10000);
});