var friend_list = [];
$(document).ready(function () {
    // Gets a list of friends that are online, renders them into buttons that can be used to invite to group chat
    $.get("/getonlinefriendssimple?id=" + $('#chat_id').text(), function (data) {
        if (data.friends.length) {
            var count = 0;
            var loaded = "";
            var promise_function = function () {
                var friend = data.friends[count];
                friend_list.push(friend.username.S);


                loaded = loaded + "<div class='card online-friends-invite comment-button mt-2'>";
                loaded = loaded + "<div class='card-content'>";
                loaded = loaded + "<div class='content'>";

                loaded = loaded + "<div class='columns is-flex is-vcentered'>";

                loaded = loaded + "<div class='column is-10'>";
                loaded = loaded + friend.first_name.S + " " + friend.last.S;
                loaded = loaded + "</div>";

                loaded = loaded + "<div class='column'>";
                loaded = loaded + "<form action='/postgroupchatinvite?chat=" + $('#chat_id').text() + "&user=" + friend.username.S + "' method=\"post\">";
                loaded = loaded + "<button class='hidden-button'>";
                loaded = loaded + "<i class='far fa-paper-plane send-icon send-group icon is-medium'></i>"
                loaded = loaded + "</button>";
                loaded = loaded + "</form>";
                loaded = loaded + "</div>";


                loaded = loaded + "</div>";

                loaded = loaded + "</div>";
                loaded = loaded + "</div>";
                loaded = loaded + "</div>";


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
});

// Called every 10 seconds, checks if anything has changed, if so it updates that specific changed section, if not it does nothing
var refresh = function () {
    $.get("/getonlinefriendssimple?id=" + $('#chat_id').text(), function (data) {
        if (data.friends.length) {
            var count = 0;
            var loaded = "";
            var updated = false;
            var temp_data = [];
            var promise_function = function () {
                var friend = data.friends[count];
                if (!friend_list.includes()) {
                    friend_list.push(friend.username.S);
                    updated = true;
                }
                temp_data.push(friend.username.S);

                loaded = loaded + "<div class='card online-friends-invite comment-button mt-2'>";
                loaded = loaded + "<div class='card-content'>";
                loaded = loaded + "<div class='content'>";

                loaded = loaded + "<div class='columns is-flex is-vcentered'>";

                loaded = loaded + "<div class='column is-10'>";
                loaded = loaded + friend.first_name.S + " " + friend.last.S;
                loaded = loaded + "</div>";

                loaded = loaded + "<div class='column'>";
                loaded = loaded + "<form action='/postgroupchatinvite?chat=" + $('#chat_id').text() + "&user=" + friend.username.S + "' method=\"post\">";
                loaded = loaded + "<button class='hidden-button'>";
                loaded = loaded + "<i class='far fa-paper-plane send-icon icon is-medium'></i>"
                loaded = loaded + "</button>";
                loaded = loaded + "</form>";
                loaded = loaded + "</div>";


                loaded = loaded + "</div>";

                loaded = loaded + "</div>";
                loaded = loaded + "</div>";
                loaded = loaded + "</div>";

                count = count + 1;
                if (count == data.friends.length) {
                    var limit = friend_list.length;
                    for (var iter = 0; iter < limit; iter++) {
                        if (!temp_data.includes(friend_list[iter])) {
                            friend_list.splice(iter, 1);
                            limit = limit - 1;
                            updated = true;
                        }
                    }
                    if (updated) {
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
    setTimeout(refresh, 10000);
}

$(document).ready(function () {
    setTimeout(refresh, 10000);
});