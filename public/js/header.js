// Called whenever the user types a letter into the user search bar, gets the autocomplete suggestions from the prefix table
var getSuggestions = function () {
    $.get("/getautocomplete?search=" + document.getElementById("search").value, function (d, s) {
        var users = d.users;
        $("#search").autocomplete({
            source: users
        });
    });
}

// Checks every minute if the user has been inactive for an hour, if so it logs the user out, and if not it does nothing
var refresh_status = function () {
    $.get('/checkinactive', function (d, s) {
        if (d.sessionTime <= d.now) {
            $.get('/logout', function (d, s) { });
        }
    });
    setTimeout(refresh_status, 60 * 1000);
}

// Calls the newsfeed algorithm job every hour
var newsfeed = function () {
    $.get('/newsalgorithm', function (d, s) { });
    setTimeout(newsfeed, 60 * 60 * 1000);
}

$(document).ready(function () {
    setTimeout(refresh_status, 60 * 1000);
    setTimeout(newsfeed, 60 * 60 * 1000);
});