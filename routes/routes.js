var db = require('../models/database.js');
var sjcl = require('sjcl')
var stemmer = require('stemmer')

var maxAge = 60 * 60 * 1000;

// Called when we redirect to "/", loads the login page
var getLogin = function (req, res) {
    // If someone is logged in, shouldn't be able to go to login screen without logging out
    if (req.session.user) {
        res.redirect("/home");
    } else {
        // If, however, no one is logged in, display the login screen, and possibly the appropriate error
        if (!req.query.error) {
            res.render('login.ejs', { message: "" });
        } else if (req.query.error == 1) {
            res.render('login.ejs', { message: "Invalid empty username and password" });
        } else if (req.query.error == 2) {
            res.render('login.ejs', { message: "Invalid empty username" });
        } else if (req.query.error == 3) {
            res.render('login.ejs', { message: "Invalid empty password" });
        } else if (req.query.error == 4) {
            res.render('login.ejs', { message: "Internal database error" });
        } else if (req.query.error == 5) {
            res.render('login.ejs', { message: "Incorrect password" });
        } else {
            res.render('login.ejs', { message: "User with username " + req.query.error + " does not exist" });
        }
    }
};

// Called when we redirect to "/checklogin", checks if user login information was correct
var checkLogin = function (req, res) {
    req.session.username = req.body.username;
    req.session.password = req.body.password;
    req.session.save();
    var username = req.body.username;
    var password = req.body.password;
    var bitArray = sjcl.hash.sha256.hash(password)
    var hash = sjcl.codec.hex.fromBits(bitArray)
    // If any inputs are invalid, meaning they are empty, redirect back to login at "/" with appropriate error, as specified
    if (username.trim() === "" && password.trim() === "") {
        res.redirect("/?error=1");
    } else if (username.trim() === "") {
        res.redirect("/?error=2");
    } else if (password.trim() === "") {
        res.redirect("/?error=3");
    } else {
        db.getUser(username, function (err, data) {
            if (err !== "No results" && err !== null) {
                res.redirect("/?error=4");
            } else if (data) {
                if (data.Items[0].password.S === hash) {
                    req.session.username = undefined;
                    req.session.password = undefined;
                    req.session.birthday = undefined;
                    req.session.email = undefined;
                    req.session.user = username;
                    req.session.first = data.Items[0].first_name.S;
                    req.session.last = data.Items[0].last.S;
                    req.session.affiliation = data.Items[0].affiliation.S;
                    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
                    req.session.save();
                    db.setStatus(username, true, function (err, data) {
                        res.redirect("/home");
                    });
                } else {
                    res.redirect("/?error=5");
                }
            } else {
                // If username already exists in database, redirect with error of username, used to display error message
                res.redirect("/?error=" + username);
            }
        });
    }
};


// Gets the information that the user filled into the form, this is used for form preservation. Although password is stored here,
// it is immediately deleted from the cookies upon reloading the form
var getState = function (req, res) {
    var username = req.session.username;
    var password = req.session.password;
    var affiliation = req.session.affiliation;
    var first = req.session.first;
    var last = req.session.last;
    var birthday = req.session.birthday;
    var email = req.session.email;
    req.session.username = undefined;
    req.session.password = undefined;
    req.session.affiliation = undefined;
    req.session.first = undefined;
    req.session.last = undefined;
    req.session.birthday = undefined;
    req.session.email = undefined;
    res.send({ username: username, password: password, affiliation: affiliation, first: first, last: last, birthday: birthday, email: email });
};

// Gets affiliation and email of current user, this is used to autofill the preferences page
var setState = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var username = req.session.user;
    db.getUser(username, function (err, data) {
        if (err) {
            return res.redirect("/profile");
        }
        if (req.session.affiliation === undefined) {
            req.session.affiliation = data.Items[0].affiliation.S;
        }
        if (req.session.email === undefined) {
            req.session.email = data.Items[0].email.S;
        }
        var affiliation = req.session.affiliation;
        var email = req.session.email;
        req.session.email = undefined;
        res.send({ affiliation: affiliation, email: email });
    });
};

// Called when we redirect to "/signup"
var signup = function (req, res) {
    // Should not be able to go to signup while logged in
    if (req.session.user) {
        res.redirect("/home");
        return;
    }
    if (!req.query.error) {
        res.render('signup.ejs', { message: "" });
    } else if (req.query.error == 1) {
        res.render('signup.ejs', { message: "Invalid empty username" });
    } else if (req.query.error == 2) {
        res.render('signup.ejs', { message: "Invalid empty password" });
    } else if (req.query.error == 3) {
        res.render('signup.ejs', { message: "Invalid empty first name" });
    } else if (req.query.error == 4) {
        res.render('signup.ejs', { message: "Invalid empty last name" });
    } else if (req.query.error == 5) {
        res.render('signup.ejs', { message: "Invalid empty email" });
    } else if (req.query.error == 6) {
        res.render('signup.ejs', { message: "Invalid empty birthday" });
    } else if (req.query.error == 7) {
        res.render('signup.ejs', { message: "Invalid empty affiliation" });
    } else if (req.query.error == 8) {
        res.render('signup.ejs', { message: "Invalid birthday format" });
    } else if (req.query.error == 9) {
        res.render('signup.ejs', { message: "Select at least 2 interests" });
    } else if (req.query.error == 11) {
        res.render('signup.ejs', { message: "Provided username is already taken" });
    }
};

// Called when a user tries to create an account, checks if username doesn't already exist and that all fields non-empty
var createAccount = function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var bitArray = sjcl.hash.sha256.hash(password)
    var hash = sjcl.codec.hex.fromBits(bitArray)
    var first = req.body.first;
    var last = req.body.last;
    var email = req.body.email;
    var birthday = req.body.birthday;
    var affiliation = req.body.affiliation;
    var interests = req.body.interests;
    req.session.username = username;
    req.session.password = password;
    req.session.affiliation = affiliation;
    req.session.first = first;
    req.session.last = last;
    req.session.birthday = birthday;
    req.session.email = email;
    req.session.save();
    if (username.trim() === "") {
        res.redirect("/signup?error=1");
    } else if (password.trim() === "") {
        res.redirect("/signup?error=2");
    } else if (first.trim() === "") {
        res.redirect("/signup?error=3");
    } else if (last.trim() === "") {
        res.redirect("/signup?error=4");
    } else if (email.trim() === "") {
        res.redirect("/signup?error=5");
    } else if (birthday.trim() === "") {
        res.redirect("/signup?error=6");
    } else if (affiliation.trim() === "") {
        res.redirect("/signup?error=7");
    } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(birthday)) {
        // Checks if birthday is of valid format
        res.redirect("/signup?error=8");
    } else if (!Array.isArray(interests)) {
        // Checks if user selected at least 2 interests
        res.redirect("/signup?error=9");
    } else {
        db.addUser(username, hash, first, last, email, birthday, affiliation, interests, function (err, data) {
            if (err) {
                res.redirect("/signup?error=11");
            } else if (data) {
                // Clears out the preserved form data before logging in
                req.session.username = undefined;
                req.session.password = undefined;
                req.session.affiliation = undefined;
                req.session.first = undefined;
                req.session.last = undefined;
                req.session.birthday = undefined;
                req.session.email = undefined;
                req.session.user = username;
                req.session.first = first;
                req.session.last = last;
                req.session.affiliation = affiliation;
                req.session.interests = interests;
                req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
                req.session.save();
                req.session.save();
                db.setStatus(username, true, function (err, data) {
                    db.runJob(function () {
                        res.redirect("/home");
                    })
                });
            }
        });
    }
};

// Loads the profile/preferences page to update your information from
var getProfile = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    db.getInterests(req.session.user, function (err, data) {
        if (err) {
            return res.render({ message: "", interests: [] });
        }
        var interests = [];
        for (const item of data.Items) {
            interests.push(item.interest.S);
        }
        var username = req.session.user;
        if (!req.query.message) {
            res.render('profile.ejs', { message: "", interests: interests, user: username });
        } else if (req.query.message == 1) {
            res.render('profile.ejs', { message: "Cannot change to empty affiliation", interests: interests, user: username });
        } else if (req.query.message == 2) {
            res.render('profile.ejs', { message: "No change to affiliation", interests: interests, user: username });
        } else if (req.query.message == 3) {
            res.render('profile.ejs', { message: "Successfully updated affiliation!", interests: interests, user: username });
        } else if (req.query.message == 4) {
            res.render('profile.ejs', { message: "Cannot change to empty email", interests: interests, user: username });
        } else if (req.query.message == 5) {
            res.render('profile.ejs', { message: "No change to email", interests: interests, user: username });
        } else if (req.query.message == 6) {
            res.render('profile.ejs', { message: "Successfully updated email!", interests: interests, user: username });
        } else if (req.query.message == 7) {
            res.render('profile.ejs', { message: "Cannot change to empty password", interests: interests, user: username });
        } else if (req.query.message == 8) {
            res.render('profile.ejs', { message: "New passwords do not match", interests: interests, user: username });
        } else if (req.query.message == 9) {
            res.render('profile.ejs', { message: "Old password is incorrect", interests: interests, user: username });
        } else if (req.query.message == 10) {
            res.render('profile.ejs', { message: "No change to password", interests: interests, user: username });
        } else if (req.query.message == 11) {
            res.render('profile.ejs', { message: "Successfully updated password!", interests: interests, user: username });
        } else if (req.query.message == 12) {
            res.render('profile.ejs', { message: "No change to visibility", interests: interests, user: username });
        } else if (req.query.message == 13) {
            res.render('profile.ejs', { message: "Successfully updated visibility!", interests: interests, user: username });
        } else if (req.query.message == 14) {
            res.render('profile.ejs', { message: "Select at least 2 interests", interests: interests, user: username });
        } else if (req.query.message == 15) {
            res.render('profile.ejs', { message: "No change to interests", interests: interests, user: username });
        } else if (req.query.message == 16) {
            res.render('profile.ejs', { message: "Successfully updated interests!", interests: interests, user: username });
        } else if (req.query.message == 17) {
            res.render('profile.ejs', { message: "Cannot upload empty profile picture", interests: interests, user: username });
        }
    });
};

// Called when a user changes their affiliation
var updateAffiliation = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var affiliation = req.body.affiliation;
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    req.session.affiliation = affiliation;
    req.session.save();
    var username = req.session.user;
    var first = req.session.first;
    var last = req.session.last;
    if (affiliation.trim() === "") {
        res.redirect("/profile?message=1");
    } else {
        db.updateUser(affiliation, username, first, last, function (err, data) {
            if (err) {
                res.redirect("/profile?message=2");
            } else if (data) {
                req.session.affiliation = affiliation;
                req.session.save();
                res.redirect("/profile?message=3");
            }
        });
    }
};

// Called when a user changes their email
var updateEmail = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var email = req.body.email;
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    req.session.email = email;
    req.session.save();
    var username = req.session.user;
    if (email.trim() === "") {
        res.redirect("/profile?message=4");
    } else {
        db.updateUserEmail(email, username, function (err, data) {
            if (err) {
                res.redirect("/profile?message=5");
            } else if (data) {
                res.redirect("/profile?message=6");
            }
        });
    }
};

// Called when a user changes their password
var updatePassword = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var old_password = req.body.old_password;
    var old_bit_array = sjcl.hash.sha256.hash(old_password);
    var old_hash = sjcl.codec.hex.fromBits(old_bit_array);
    var password1 = req.body.password1;
    var password2 = req.body.password2;
    var bit_array = sjcl.hash.sha256.hash(password1);
    var hash = sjcl.codec.hex.fromBits(bit_array);
    var username = req.session.user;
    if (password1.trim() === "") {
        res.redirect("/profile?message=7");
    } else if (password1 !== password2) {
        res.redirect("/profile?message=8");
    } else {
        db.getUser(username, function (err, data) {
            if (err) {
                return res.redirect("/profile");
            }
            // Checks if the password they entered as their old password was correct
            if (data.Items[0].password.S != old_hash) {
                res.redirect("/profile?message=9");
            } else {
                db.updateUserPassword(hash, username, function (err, data) {
                    if (err) {
                        res.redirect("/profile?message=10");
                    } else if (data) {
                        res.redirect("/profile?message=11");
                    }
                });
            }
        });
    }
};

// Called when a user changes their privacy/visibility settings
var updateVisibility = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var visibility = req.body.visibility;
    var username = req.session.user;
    db.getUser(username, function (err, data) {
        if (err) {
            return res.redirect("/profile");
        }
        if (data.Items[0].visibility.S == visibility) {
            res.redirect("/profile?message=12");
        } else {
            db.updateVisibility(username, visibility, function (err, data) {
                res.redirect("/profile?message=13");
            });
        }
    });
};

// Called when a user changes their interests, calls the newsfeed absorption algorithm
var updateInterests = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var interests = req.body.interests;
    var username = req.session.user;
    if (!Array.isArray(interests)) {
        // Makes sure at least 2 interests were selected
        return res.redirect("/profile?message=14");
    }
    db.getInterests(username, function (err, data) {
        if (err) {
            return res.redirect("/profile");
        }
        var old_interests = [];
        for (const item of data.Items) {
            old_interests.push(item.interest.S);
        }
        var new_interests = [];
        for (const new_interest of interests) {
            if (!old_interests.includes(new_interest)) {
                new_interests.push(new_interest);
            }
        }
        var delete_interests = [];
        for (const old_interest of old_interests) {
            if (!interests.includes(old_interest)) {
                delete_interests.push(old_interest);
            }
        }
        // No change to interests
        if (!new_interests.length && !delete_interests.length) {
            res.redirect("/profile?message=15");
        } else {
            db.addInterests(username, new_interests, 0, function () {
                db.deleteInterests(username, delete_interests, 0, function () {
                    db.statusInterests(username, req.session.first, req.session.last, new_interests, function () {
                        db.refreshRecommendations(username, function () {
                            db.runJob(function () {
                                res.redirect("/profile?message=16");
                            });
                        });
                    });
                })
            });
        }
    });
};

// Loads a user's home page
var getHome = function (req, res) {
    if (!req.session.user) {
        res.redirect("/");
    } else {
        req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
        req.session.save();
        var message = "";
        if (req.query.message == 1) {
            message = "Successfully sent friend request!"
        } else if (req.query.message == 2) {
            message = "Can't post empty comment!";
        } else if (req.query.message == 3) {
            message = "Successfully commented!";
        } else if (req.query.message == 4) {
            message = "Successfully unfriended";
        } else if (req.query.message == 5) {
            message = "Successfully added friend!";
        } else if (req.query.message == 6) {
            message = "Successfully rejected request!";
        } else if (req.query.message == 7) {
            message = "Friend request successfully undone";
        }
        res.render("home.ejs", { message: message, username: req.session.user });
    }
};

// Dynamically refreshes the home page without reloading it, called every 10 seconds
var getRefreshHome = function (req, res) {
    if (!req.session.user) {
        res.redirect("/");
    } else {
        db.getUsersByAffiliation(req.session.affiliation, function (err1, suggestions) {
            if (err1) { return res.send({}); }
            db.getFriends(req.session.user, function (err2, friends) {
                if (err2) { return res.send({}); }
                db.getFriendRequests(req.session.user, function (err3, friend_requests) {
                    if (err3) { return res.send({}); }
                    db.getSentFriendRequests(req.session.user, function (err4, sent_friend_requests) {
                        if (err4) { return res.send({}); }
                        db.getRecommendations(req.session.user, function (err5, recommendations) {
                            if (err5) { return res.send({}); }
                            db.getLikedArticles(req.session.user, function (err6, liked_articles) {
                                if (err6) {
                                    return res.send({});
                                }
                                // Friend suggestsions, users with the same affiliation
                                suggestions_list = [];
                                friends_list = [];
                                friends_item_list = [];
                                friends_list.push(req.session.user);
                                // List of incoming friend requests
                                requests_list = [];
                                // List of outgoing friend requests
                                sent_requests_list = [];
                                // List of liked articles
                                liked_articles_list = [];
                                for (const liked_article of liked_articles) {
                                    liked_articles_list.push(liked_article.articleID.N);
                                }
                                for (const f of friends.Items) {
                                    friends_list.push(f.friendname.S);
                                }
                                for (const u of suggestions.Items) {
                                    if (!friends_list.includes(u.username.S)) {
                                        suggestions_list.push(u);
                                    } else if (u.username.S !== req.session.user) {
                                        friends_item_list.push(u);
                                    }
                                }
                                for (const request of friend_requests.Items) {
                                    requests_list.push(request.requester_username.S);
                                }
                                for (const request2 of sent_friend_requests.Items) {
                                    sent_requests_list.push(request2.username.S);
                                }
                                var recursive_count = 0;
                                var recursive_posts = [];
                                // Gets the post for the home page using the recursive helper function below
                                recursiveHome(friends_list, recursive_posts, recursive_count, function () {
                                    friends_list.splice(0, 1);
                                    db.getFriendUsers(friends_list, function (err, data) {
                                        var smaller_list = [];
                                        var count = 0;
                                        for (const suggestion of suggestions_list) {
                                            // Limiting it to 5 friend suggestions, filtering out friend requests
                                            if (count < 5 && !requests_list.includes(suggestion.username.S) && !sent_requests_list.includes(suggestion.username.S)) {
                                                smaller_list.push(suggestion);
                                                count = count + 1;
                                            }
                                        }
                                        var friend_users = [];
                                        if (!err) {
                                            friend_users = data.Responses.users;
                                        }
                                        // All this sorting is to maintain a strict ordering and avoid weird refresh bugs because of
                                        // the arbitrary returned order of queries
                                        friend_users.sort(function (a, b) { return (a.full_name.S).localeCompare(b.full_name.S); });
                                        smaller_list.sort(function (a, b) { return (a.full_name.S).localeCompare(b.full_name.S); });
                                        friend_requests.Items.sort(function (a, b) { return (a.first.S + a.last.S).localeCompare(b.first.S + b.last.S); });
                                        sent_friend_requests.Items.sort(function (a, b) { return (a.first.S + a.last.S).localeCompare(b.first.S + b.last.S); });
                                        recommendations.sort(function (a, b) { return (a.headline.S).localeCompare(b.headline.S); });
                                        res.send({
                                            data: recursive_posts, friends: friend_users, suggestions: smaller_list,
                                            requests: friend_requests.Items, sent_requests: sent_friend_requests.Items,
                                            recommendations: recommendations, liked_articles: liked_articles_list
                                        });
                                    })
                                });
                            });
                        });
                    });
                });
            });
        });
    }
};

// Makes queries for the user and all the user's friends to get their posts from the database for the home page
var recursiveHome = function (friends_list, recursive_posts, recursive_count, callback) {
    if (recursive_count >= friends_list.length) {
        recursive_posts.sort(function (a, b) { return ('' + a.datetime.S).localeCompare(b.datetime.S); }).reverse();
        callback();
    } else {
        db.getHomePosts(friends_list[recursive_count], function (err, data) {
            if (err) {
                callback();
            }
            for (const item of data.Items) {
                recursive_posts.push(item);
            }
            recursive_count = recursive_count + 1;
            recursiveHome(friends_list, recursive_posts, recursive_count, callback);
        });
    }
}

// Called to load a user's wall
var getWall = function (req, res) {
    var username = req.session.user;
    if (!req.session.user) {
        return res.redirect("/");
    } else if (!req.query.user) {
        res.redirect("/wall?user=" + username);
    } else {
        req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
        req.session.save();
        var wall_user = req.query.user;
        req.session.wall_user = wall_user;
        req.session.save();
        db.getUser(wall_user, function (err, users) {
            if (err) {
                return res.render("wall.ejs", { message: message, wall_first: "", wall_last: "", wall_user: wall_user });
            }
            wall_first = users.Items[0].first_name.S;
            wall_last = users.Items[0].last.S
            var message = "";
            if (!req.query.message) {
                message = "";
            } else if (req.query.message == 1) {
                message = "Successfully sent friend request!"
            } else if (req.query.message == 2) {
                message = "Can't post empty post!";
            } else if (req.query.message == 3) {
                message = "Can't post empty comment!";
            } else if (req.query.message == 4) {
                message = "Successfully unfriended";
            } else if (req.query.message == 5) {
                message = "Successfully accepted friend request";
            } else if (req.query.message == 6) {
                message = "Successfully rejected friend request";
            } else if (req.query.message == 7) {
                message = "Friend request successfully undone";
            }
            res.render("wall.ejs", { message: message, wall_first: wall_first, wall_last: wall_last, wall_user: wall_user });
        });
    }
};

// Updates a user's wall in jQuery without refreshing the page
var getRefreshWall = function (req, res) {
    var username = req.session.user;
    if (!req.session.user) {
        return res.redirect("/");
    } else {
        var wall_user = req.session.wall_user;
        db.getWall(wall_user, function (err, data) {
            if (err) { return res.send({}) }
            db.getUser(wall_user, function (err2, users) {
                if (err2) { return res.send({}) }
                db.getFriends(wall_user, function (err3, friends) {
                    if (err3) { return res.send({}) }
                    db.getFriendRequests(username, function (err4, friend_requests) {
                        if (err4) { return res.send({}) }
                        db.getSentFriendRequests(username, function (err5, sent_friend_requests) {
                            if (err5) {
                                return res.send({});
                            }
                            friends_list = [];
                            wall_first = users.Items[0].first_name.S;
                            wall_last = users.Items[0].last.S;
                            visibility = users.Items[0].visibility.S;
                            for (const f of friends.Items) {
                                friends_list.push(f.friendname.S);
                            }
                            var friend = false;
                            if (friends_list.includes(username)) {
                                friend = true;
                            }
                            var requests_list = [];
                            var sent_requests_list = [];
                            for (const request of friend_requests.Items) {
                                requests_list.push(request.requester_username.S);
                            }
                            for (const request2 of sent_friend_requests.Items) {
                                sent_requests_list.push(request2.username.S);
                            }
                            var sent_request = sent_requests_list.includes(wall_user);
                            var received_request = requests_list.includes(wall_user);
                            res.send({
                                data: data, user: wall_user, username: username, friend: friend, visibility: visibility,
                                sent_request: sent_request, received_request: received_request
                            });
                        });
                    });
                });
            });
        });
    }
};

// Called when a friend makes a post on another friend's wall, adds the post to the database
var wallPost = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var username = req.session.user;
    var content = req.body.content;
    var user = req.query.user;
    var first = req.session.first;
    var last = req.session.last;
    if (content.trim() === "") {
        res.redirect("/wall?user=" + user + "&message=2");
    } else {
        db.wallPost(username, user, content, first, last, function (err, data) {
            if (req.query.type) {
                res.redirect("/home");
            } else {
                res.redirect("/wall?user=" + user);
            }
        });
    }
};

// Called when a friend makes a comment on another friend's post, adds the comment to the database
var comment = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var id = req.query.id;
    var username = req.session.user;
    var content = req.body.content;
    var user = req.query.user;
    var first = req.session.first;
    var last = req.session.last;
    if (content.trim() === "") {
        if (req.query.type == 1) {
            res.redirect("/home?message=2");
        } else if (req.query.type == 2) {
            res.redirect("/wall?user=" + user + "&message=3");
        }
    } else {
        db.comment(id, username, user, content, first, last, function (err, data) {
            if (req.query.type == 1) {
                res.redirect("/home?message=3");
            } else if (req.query.type == 2) {
                res.redirect("/wall?user=" + user);
            }
        });
    }
};

// Called when we are loading the comments for a particular post, gets all comments for that post from the database
var getComments = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var id = req.query.id;
    db.getComments(id, function (err, data) {
        if (err) {
            return res.send({ comments: { Items: [] } });
        }
        res.send({ comments: data });
    })
}

// Called when a user sends another user a friend request, adds that friend request to the database
var createFriendRequest = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var requester_username = req.session.user;
    var username = req.query.user;
    var first = req.session.first;
    var last = req.session.last;
    var affiliation = req.session.affiliation;
    db.createFriendRequest(username, requester_username, first, last, affiliation, function (err, data) {
        if (req.query.type == 1) {
            res.redirect("/home?message=1");
        } else if (req.query.type == 2) {
            res.redirect("/wall?user=" + username + "&message=1");
        } else if (req.query.type == 3) {
            res.redirect("/search?search=" + req.session.search + "&message=1");
        }
    });
};

// Called when a user undoes a friend request, deletes that friend request from the database
var undoFriendRequest = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var requester_username = req.session.user;
    var username = req.query.user;
    db.undoFriendRequest(username, requester_username, function (err, data) {
        if (req.query.type == 1) {
            res.redirect("/home?message=7");
        } else if (req.query.type == 2) {
            res.redirect("/wall?user=" + username + "&message=7");
        } else if (req.query.type == 3) {
            res.redirect("/search?search=" + req.session.search + "&message=2");
        }
    });
};

// Called when a user unfriends another user, deletes their friend relationship from the database
var unfriend = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var user1 = req.session.user;
    var user2 = req.query.user;
    db.unfriend(user1, user2, function (err, data) {
        if (req.query.type == 1) {
            res.redirect("/home?message=4");
        } else if (req.query.type == 2) {
            res.redirect("/wall?user=" + user2 + "&message=4");
        }
    });
};


// Loads the page that you are redirected to after you search for something
var search = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    } else {
        req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
        req.session.save();
        req.session.search = req.query.search;
        if (!req.query.message) {
            res.render("search.ejs", { message: "" });
        } else if (req.query.message == 1) {
            res.render("search.ejs", { message: "Successfully sent friend request!" });
        } else if (req.query.message == 2) {
            res.render("search.ejs", { message: "Friend request successfully undone" });
        } else if (req.query.message == 3) {
            res.render("search.ejs", { message: "Successfully accepted friend request!" });
        } else if (req.query.message == 4) {
            res.render("search.ejs", { message: "Successfully rejected friend request" });
        }
    }
}

// Called to dynamically reload the friend requesting buttons in the search page without reloading the page
var refreshSearch = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var username = req.session.user;
    var search = req.session.search;
    db.getUsersByName(search, function (err, data) {
        if (err) { return res.send({}) }
        db.getFriends(username, function (err2, friends) {
            if (err2) { return res.send({}) }
            db.getFriendRequests(username, function (err3, friend_requests) {
                if (err3) { return res.send({}) }
                db.getSentFriendRequests(username, function (err4, sent_friend_requests) {
                    if (err4) {
                        return res.send({})
                    }
                    var requests_list = [];
                    var sent_requests_list = [];
                    var friends_list = [];
                    for (const f of friends.Items) {
                        friends_list.push(f.friendname.S);
                    }
                    for (const request of friend_requests.Items) {
                        requests_list.push(request.requester_username.S);
                    }
                    for (const request2 of sent_friend_requests.Items) {
                        sent_requests_list.push(request2.username.S);
                    }
                    data.Items.sort(function (a, b) { return (a.full_name.S).localeCompare(b.full_name.S); });
                    res.send({ data: data, friends: friends_list, username: username, requests: requests_list, sent_requests: sent_requests_list });
                });
            });
        });
    });
}

// Called whenever a user lifts up a key in the autocomplete, queries prefix table to get list of autocomplete words for the search bar
var getAutocomplete = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    } else {
        req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
        req.session.save();
        db.getUsersByName(req.query.search, function (err, data) {
            if (err) {
                return res.send({ users: [] });
            }
            var suggestion_list = [];
            for (const user of data.Items) {
                suggestion_list.push(user.full_name.S);
            }
            res.send({ users: suggestion_list });
        })
    }
}

// Called when the user logs out, destroys the session
var logout = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    } else {
        var user = req.session.user;
        req.session.destroy();
        db.setStatus(user, false, function (err, data) {
            res.redirect("/");
        });
    }
};

// Called when a user uploads a profile picture, uploads the picture to S3
var upload = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    if (req.file === undefined) {
        return res.redirect("/profile?message=17")
    }
    db.uploadImage(req.session.user, req.file, function (err, data) {
        res.redirect("/profile");
    })
};

// Checks if user has a profile picture in S3
var getImage = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var user = req.query.user;
    db.getUser(user, function (err, data) {
        if (err) {
            return res.send({ picture: false });
        }
        res.send({ picture: data.Items[0].picture.BOOL });
    })
}

// Loads the visualizer page
var friendVisualizer = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    res.render('friendvisualizer.ejs');
}

// Sends the user so we know what to query for below
var sendVisualizer = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    res.send({ user: req.session.wall_user });
}

var original_friends = [];
// Loads the initial graph based on the user (need to get the initial user's name, maybe just store it as a cookie for ease)
var friendVisualization = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    db.getUser(req.query.user, function (err, user) {
        if (err) { return res.send({}) }
        db.getVisualizerFriends(req.query.user, user.Items[0].affiliation.S, function (err1, err2, data1, data2) {
            if (err1 || err2) {
                return res.send({})
            }
            var json = {
                "id": req.query.user, "name": user.Items[0].first_name.S + " " + user.Items[0].last.S, "children": [],
                "data": []
            };
            original_friends = [];
            original_affiliation = user.Items[0].affiliation.S;
            for (const friend of data1.Items) {
                original_friends.push(friend.friendname.S);
                json.children.push({
                    "id": friend.friendname.S,
                    "name": friend.first.S + " " + friend.last.S,
                    "data": {},
                    "children": []
                });
            }
            res.send(json);
        });
    });
}

// Loads friends of the clicked user and updates the visualizer
var getVisualizerFriends = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var clicked_user = req.params.user;
    db.getUser(clicked_user, function (err, user) {
        if (err) { return res.send({}) }
        db.getVisualizerFriends(clicked_user, user.Items[0].affiliation.S, function (err1, err2, data1, data2) {
            if (err1 || err2) { return res.send({}) }
            db.getUsersByAffiliation(req.session.affiliation, function (err3, data3) {
                if (err3) {
                    return res.send({})
                }
                var json = {
                    "id": clicked_user, "name": user.Items[0].first_name.S + " " + user.Items[0].last.S, "children": [],
                    "data": []
                };
                var affiliation_list = [];
                for (const item of data3.Items) {
                    affiliation_list.push(item.username.S);
                }
                for (const friend of data1.Items) {
                    if (affiliation_list.includes(friend.friendname.S) || original_friends.includes(friend.friendname.S)) {
                        json.children.push({
                            "id": friend.friendname.S,
                            "name": friend.first.S + " " + friend.last.S,
                            "data": {},
                            "children": []
                        });
                    }
                }
                res.send(json);
            });
        });
    });
}

// Called when friend requests get accepted, adds friend relationship and deletes friend request in the database
var acceptRequest = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var username = req.session.user;
    var requester_username = req.query.user;
    var first = req.session.first;
    var last = req.session.last;
    var affiliation = req.session.affiliation;
    db.acceptFriendRequest(username, requester_username, first, last, affiliation, function (err, data) {
        if (req.query.type == 1) {
            res.redirect("/home?message=5");
        } else if (req.query.type == 2) {
            res.redirect("/wall?user=" + requester_username + "&message=5");
        } else if (req.query.type == 3) {
            res.redirect("/search?search=" + req.session.search + "&?message=3");
        }
    });
}

// Called when friend requests get rejected, deletes friend request in the database
var rejectRequest = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var username = req.session.user;
    var requester_username = req.query.user;
    db.rejectFriendRequest(username, requester_username, function (err, data) {
        if (req.query.type == 1) {
            res.redirect("/home?message=6");
        } else if (req.query.type == 2) {
            res.redirect("/wall?user=" + requester_username + "&message=6");
        } else if (req.query.type == 3) {
            res.redirect("/search?search=" + req.session.search + "&?message=4");
        }
    });
}

// Called when a user searches for an article in the search bar
var articleSearch = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var searchWords = req.query.articlesearch.trim().split(" ");
    for (const searchWord of searchWords) {
        if (searchWord == "a" || searchWord == "all" || searchWord == "any" || searchWord == "but"
            || searchWord == "the") {
            searchWords.splice(searchWords.indexOf(searchWord), 1);
        }
    }
    for (let i = 0; i < searchWords.length; i++) {
        searchWords[i] = stemmer(searchWords[i]).toLowerCase();
    }
    db.articleSearch(searchWords, req.session.user, function (err, data) {
        if (err) {
            return res.render("articlesearch.ejs", { data: { Items: [] }, liked_articles: [], article_search: req.query.articlesearch });
        }
        db.getLikedArticles(req.session.user, function (err2, liked_articles) {
            if (err2) {
                return res.render("articlesearch.ejs", { data: data, liked_articles: [], article_search: req.query.articlesearch });
            }
            liked_articles_list = [];
            for (const item of liked_articles) {
                liked_articles_list.push(item.articleID.N);
            }
            res.render("articlesearch.ejs", { data: data, liked_articles: liked_articles_list, article_search: req.query.articlesearch });
        });
    })
}

// Called when a user likes an article
var articleLike = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var articleId = req.query.articleId;
    db.articleLike(req.session.user, articleId, function (err, data) {
        if (req.query.type == 1) {
            res.redirect("/home");
        } else if (req.query.type == 2) {
            res.redirect("/articlesearch?articlesearch=" + req.query.search);
        }
    })
}

// Called every minute from the header, which is on every page, to check if the user has been inactive for an hour
var checkInactive = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    } else {
        res.send({ sessionTime: req.session.time, now: new Date() });
    }
};

// Called every hour, triggers the news recommendation algorithm to run
var newsAlgorithm = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    } else {
        db.refreshRecommendations(req.session.user, function () {
            db.runJob(function () {
                res.send({ message: "Started job" });
            });
        });
    }
}


var routes = {
    get_login: getLogin,
    check_login: checkLogin,
    get_state: getState,
    set_state: setState,
    signup: signup,
    create_account: createAccount,
    get_profile: getProfile,
    update_affiliation: updateAffiliation,
    update_email: updateEmail,
    update_password: updatePassword,
    update_visibility: updateVisibility,
    update_interests: updateInterests,
    get_home: getHome,
    get_refresh_home: getRefreshHome,
    get_wall: getWall,
    get_refresh_wall: getRefreshWall,
    wall_post: wallPost,
    comment: comment,
    get_comments: getComments,
    create_friend_request: createFriendRequest,
    undo_friend_request: undoFriendRequest,
    unfriend: unfriend,
    search: search,
    refresh_search: refreshSearch,
    get_autocomplete: getAutocomplete,
    logout: logout,
    upload: upload,
    get_image: getImage,
    friend_visualizer: friendVisualizer,
    send_visualizer: sendVisualizer,
    friend_visualization: friendVisualization,
    get_friends: getVisualizerFriends,
    accept_request: acceptRequest,
    reject_request: rejectRequest,
    article_search: articleSearch,
    article_like: articleLike,
    check_inactive: checkInactive,
    news_algorithm: newsAlgorithm
};

module.exports = routes;