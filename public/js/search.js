// Maintains a list of the unique features like username and id of the core components of the page, so that these components only
// update when something has actually changed in the tables
var received_request_list = [];
var sent_request_list = [];
var friend_list = [];

$(document).ready(function () {
    $.get('/refreshsearch', function (data, s) {
        // Loads the users that are the result of the search
        var loaded = "";
        var count = 0;
        friend_list = data.friends;
        sent_request_list = data.sent_requests;
        received_request_list = data.requests;
        var loaded = "";
        if (data.data.Items.length) {
            var promise_function = function () {
                var result = data.data.Items[count];
                count = count + 1;
                loaded = loaded + "<div class='card mt-2 card-size has-text-centered'>"
                loaded = loaded + "<div class='card-content pb-0'>";
                loaded = loaded + "<div class='media-content pb-0 mb-0'>";
                loaded = loaded + "<p class='title is-1'>";
                loaded = loaded + "<strong><a href=\"/wall?user=" + result.username.S + "\">" + result.full_name.S + "</a></strong>"
                loaded = loaded + "</p>";
                loaded = loaded + "<footer class='card-footer pt-0 mt-0'>";
                if (!friend_list.includes(result.username.S) && sent_request_list.includes(result.username.S) && result.username.S != data.username) {
                    loaded = loaded + "<form action='/undofriendrequest?user=" + result.username.S + "&type=3' method=\"post\">"
                        + "<input class = 'search-foot comment-button button mt-2 mb-2 is-rounded' type=\"submit\" name=\"friend\" value=\"Undo Friend Request\"></form><br>";
                } else if (!friend_list.includes(result.username.S) && received_request_list.includes(result.username.S) && result.username.S != data.username) {
                    loaded = loaded + "<form action='/acceptrequest?user=" + result.username.S + "&type=3' method=\"post\">"
                        + "<input class = 'accept-reject-foot comment-button button mr-4 pd-2 mt-2 mb-2 is-rounded' type=\"submit\" name=\"friend\" value=\"Accept Friend Request\"></form><br>"
                        + "<form action='/rejectrequest?user=" + result.username.S + "&type=3' method=\"post\">"
                        + "<input class = 'accept-reject-foot comment-button button mt-2 mb-2 is-rounded' type=\"submit\" name=\"friend\" value=\"Reject Friend Request\"></form><br>";
                } else if (!friend_list.includes(result.username.S) && result.username.S != data.username) {
                    loaded = loaded + "<form action='/createfriendrequest?user=" + result.username.S + "&type=3' method=\"post\">"
                        + "<input class = 'search-foot comment-button button mt-2 mb-2 is-rounded' type=\"submit\" name=\"friend\" value=\"Send Friend Request\"></form><br>";
                }
                loaded = loaded + "</footer>";
                loaded = loaded + "</div>";
                loaded = loaded + "</div>";
                loaded = loaded + "</div>";
                if (count == data.data.Items.length) {
                    $("#searches").html(loaded);
                } else {
                    promise_function();
                }
            }
            promise_function();
        } else {
            var loaded = "<div class='subtitle' style = 'margin-left: 9.5em;'>No search results returned</div>";
            $("#searches").html(loaded);
        }
    });
});

// Loads the same components as above, but also checks to see if any have been updated in the tables, and if so reloads the particular
// component of the page that has been updated
var refresh = function () {
    $.get('/refreshsearch', function (data, s) {
        var loaded = "";
        var count = 0;
        var updated = false;
        var data_list = [];
        var data_list2 = [];
        var data_list3 = [];
        for (const friend of data.friends) {
            if (!friend_list.includes(friend)) {
                friend_list.push(friend);
                updated = true;
            }
            data_list.push(friend);
        }
        for (const sent_request of data.sent_requests) {
            if (!sent_request_list.includes(sent_request)) {
                sent_request_list.push(sent_request);
                updated = true;
            }
            data_list2.push(sent_request);
        }
        for (const request of data.requests) {
            if (!received_request_list.includes(request)) {
                received_request_list.push(request);
                updated = true;
            }
            data_list3.push(request);
        }
        var limit = friend_list.length;
        for (var iter = 0; iter < limit; iter++) {
            if (!data_list.includes(friend_list[iter])) {
                friend_list.splice(iter, 1);
                limit = limit - 1;
                updated = true;
            }
        }
        var limit2 = sent_request_list.length;
        for (var iter2 = 0; iter2 < limit2; iter2++) {
            if (!data_list2.includes(sent_request_list[iter2])) {
                sent_request_list.splice(iter2, 1);
                limit2 = limit2 - 1;
                updated = true;
            }
        }
        var limit3 = received_request_list.length;
        for (var iter3 = 0; iter3 < limit3; iter3++) {
            if (!data_list3.includes(received_request_list[iter3])) {
                received_request_list.splice(iter3, 1);
                limit3 = limit3 - 1;
                updated = true;
            }
        }
        var loaded = "";
        if (data.data.Items.length) {
            var promise_function = function () {
                var result = data.data.Items[count];
                count = count + 1;
                loaded = loaded + "<div class='card mt-2 card-size has-text-centered'>"
                loaded = loaded + "<div class='card-content pb-0'>";
                loaded = loaded + "<div class='media-content pb-0 mb-0'>";
                loaded = loaded + "<p class='title is-1'>";
                loaded = loaded + "<strong><a href=\"/wall?user=" + result.username.S + "\">" + result.full_name.S + "</a></strong>"
                loaded = loaded + "</p>";
                loaded = loaded + "<footer class='card-footer pt-0 mt-0'>";
                if (!friend_list.includes(result.username.S) && sent_request_list.includes(result.username.S) && result.username.S != data.username) {
                    loaded = loaded + "<form action='/undofriendrequest?user=" + result.username.S + "&type=3' method=\"post\">"
                        + "<input class = 'search-foot comment-button button mt-2 mb-2 is-rounded' type=\"submit\" name=\"friend\" value=\"Undo Friend Request\"></form><br>";
                } else if (!friend_list.includes(result.username.S) && received_request_list.includes(result.username.S) && result.username.S != data.username) {
                    loaded = loaded + "<form action='/acceptrequest?user=" + result.username.S + "&type=3' method=\"post\">"
                        + "<input class = 'accept-reject-foot comment-button button mr-4 pd-2 mt-2 mb-2 is-rounded' type=\"submit\" name=\"friend\" value=\"Accept Friend Request\"></form><br>"
                        + "<form action='/rejectrequest?user=" + result.username.S + "&type=3' method=\"post\">"
                        + "<input class = 'accept-reject-foot comment-button button mt-2 mb-2 is-rounded' type=\"submit\" name=\"friend\" value=\"Reject Friend Request\"></form><br>";
                } else if (!friend_list.includes(result.username.S) && result.username.S != data.username) {
                    loaded = loaded + "<form action='/createfriendrequest?user=" + result.username.S + "&type=3' method=\"post\">"
                        + "<input class = 'search-foot comment-button button mt-2 mb-2 is-rounded' type=\"submit\" name=\"friend\" value=\"Send Friend Request\"></form><br>";
                }
                loaded = loaded + "</footer>";
                loaded = loaded + "</div>";
                loaded = loaded + "</div>";
                loaded = loaded + "</div>";
                if (count == data.data.Items.length) {
                    if (updated) {
                        $("#searches").html(loaded);
                    }
                } else {
                    promise_function();
                }
            }
            promise_function();
        } else {
            var loaded = "<div class='subtitle' style = 'margin-left:  9.5em;'>No search results returned</div>";
            $("#searches").html(loaded);
        }
    });
    setTimeout(refresh, 10000);
}

$(document).ready(function () {
    setTimeout(refresh, 10000);
});