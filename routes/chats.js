var db = require('../models/chatdatabase.js');
var db2 = require('../models/database.js');
var sjcl = require('sjcl')
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Renders the chat landing page, which displays online users, existing chats, and chat invites
var getStartChat = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    res.render('startchat.ejs');
};

// Called when a user accepts a private chat invite
var postAcceptChat = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var username = req.session.user;
    var sender = req.query.sender;
    var first = req.session.first;
    var last = req.session.last;
    var sender_first = req.query.first;
    var sender_last = req.query.last;
    db.acceptChatInvite(username, sender, sender_first, sender_last, first, last, function (err, chat_id) {
        if (err) {
            console.log(err);
            res.redirect("/startchat");
        } else {
            res.redirect("/startchat");
        }
    });
};

// Called when a user rejects a private chat invite
var postRejectChat = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var username = req.session.user;
    var sender = req.query.sender;
    db.rejectChatInvite(username, sender, function (err) {
        if (err) {
            console.log(err);
            res.redirect("/startchat");
        } else {
            res.redirect("/startchat");
        }
    });
};

// Called when a user accepts a group chat invite
var postAcceptGroupChat = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var username = req.session.user;
    var id = req.query.id;
    db.acceptGroupChatInvite(username, id, req.session.first, req.session.last, function (err, chat_id) {
        if (err) {
            console.log(err);
            res.redirect("/startchat");
        } else {
            res.redirect("/startchat");
        }
    });
};

// Called when a user rejects a group chat invite
var postRejectGroupChat = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var username = req.session.user;
    var id = req.query.id;
    db.rejectGroupChatInvite(username, id, req.session.first, req.session.last, function (err, chat_id) {
        if (err) {
            console.log(err);
            res.redirect("/startchat");
        } else {
            res.redirect("/startchat");
        }
    });
};

// Gets the messages within a specified chat and load the chat page for a given chat
var getChat = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var chat_id = req.query.id;
    db.getChatMessages(chat_id, function (err, data) {
        if (err) {
            return res.render('chat.ejs', {
                error: err, messages: [], id: chat_id, user: req.session.user,
                username: req.session.first + " " + req.session.last, users: { Items: [] }
            });
        }
        db.getChatUsers(chat_id, function (err2, data2) {
            if (err2) {
                console.log(err2);
                res.render('chat.ejs', {
                    error: err2, messages: [], id: chat_id, user: req.session.user,
                    username: req.session.first + " " + req.session.last, users: { Items: [] }
                });
            } else if (data) {
                var messages = data.Items;
                messages.sort(function (a, b) { return ('' + a.datetime.S).localeCompare(b.datetime.S); });
                res.render('chat.ejs', {
                    error: null, messages: messages, id: chat_id, user: req.session.user,
                    username: req.session.first + " " + req.session.last, users: data2
                });
            } else {
                res.render('chat.ejs', {
                    error: "No messages data", messages: [], id: chat_id, user: req.session.user,
                    username: req.session.first + " " + req.session.last, users: data2
                });
            }
        });
    });
};

// Called when a user sends a message in a chat, adds the message to our database for persistent storage
var postMessage = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var chat_id = req.body.room;
    var sender = req.body.sender;
    var content = req.body.content;
    var datetime = req.body.datetime;
    var username = req.body.username;
    db.postMessage(chat_id, sender, content, datetime, username, function (err, data) {
        if (err) {
            console.log(err);
            res.json({ error: err, data: null });
        } else {
            res.json({ error: null, data: null });
        }
    });
};

// Gets all incoming chat invites for a given user
var getChatInvites = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var user_1 = req.session.user;
    db.getChatInvites(user_1, function (err, data) {
        db.getIncomingGroupChatInvites(user_1, function (err, data2) {
            if (err) {
                console.log(err);
            } else {
                // Sorting is to maintain a strict ordering and avoid weird refresh bugs because of
                // the arbitrary returned order of queries
                data2.Items.sort(function (a, b) { return (a.datetime.S).localeCompare(b.datetime.S); }).reverse();
                res.send({ chat_invites: data.Items, group_chat_invites: data2.Items });
            }
        })
    });
};

// Gets all chats that user is currently in
var getUserChats = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var user_1 = req.session.user;
    db.getUserChats(user_1, function (err, data) {
        if (err) {
            console.log(err);
        } else {
            var chat_list = [];
            data.Items.sort(function (a, b) { return (a.datetime.S).localeCompare(b.datetime.S); }).reverse();
            for (const item of data.Items) {
                chat_list.push(item.chat_id.S);
            }
            if (chat_list.length) {
                db.getListChatUsers(chat_list, 0, [], req.session.first, req.session.last, function (err2, data2) {
                    db.getGroupChatStatus(chat_list, 0, [], function (err3, data3) {
                        var sent1 = [];
                        var sent2 = [];
                        var sent3 = [];
                        if (!err) {
                            sent1 = data;
                        }
                        if (!err2) {
                            sent2 = data2;
                        }
                        if (!err3) {
                            sent3 = data3;
                        }
                        res.send({ chats: sent1, chat_users: sent2, group_chats: sent3 });
                    });
                });
            } else {
                res.send({ chats: [], chat_users: [], group_chats: [] });
            }
        }
    });
};

// Get a list of all friends who are currently online, to be displayed on the chat landing page so we can invite them to priv chats
var getOnlineFriends = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    user = req.session.user;
    var friends_list = [];
    var friends_online_list = [];
    db2.getFriends(user, function (err, data) {
        if (err) {
            console.log(err);
            return res.send({ friends: [] });
        } else {
            data.Items.forEach(element => {
                friends_list.push(element.friendname.S);
            });
            db2.getFriendUsers(friends_list, function (err2, data2) {
                if (err2) { return res.send({ friends: [] }); }
                db.getSentRequests(user, function (err3, sent) {
                    if (err3) { return res.send({ friends: [] }); }
                    db.getChatInvites(user, function (err4, received) {
                        if (err4) { return res.send({ friends: [] }); }
                        db.getUserChats(user, function (err5, chats) {
                            if (err5) {
                                return res.send({ friends: [] });
                            } else {
                                var sent_requests = [];
                                for (const sent_request of sent.Items) {
                                    sent_requests.push(sent_request.username.S);
                                }
                                var received_requests = [];
                                for (const received_request of received.Items) {
                                    received_requests.push(received_request.sender.S);
                                }
                                var chat_list = [];
                                for (const chat of chats.Items) {
                                    if (chat.username_2) {
                                        chat_list.push(chat.username_2.S);
                                    }
                                }
                                for (const friend of data2.Responses.users) {
                                    if (friend.stat.BOOL && !sent_requests.includes(friend.username.S)
                                        && !received_requests.includes(friend.username.S) && !chat_list.includes(friend.username.S)) {
                                        friends_online_list.push(friend);
                                    }
                                }
                                // Sorting is to maintain a strict ordering and avoid weird refresh bugs because of the arbitrary
                                // returned order of queries
                                friends_online_list.sort(function (a, b) { return (a.full_name.S).localeCompare(b.full_name.S); });
                                res.send({ friends: friends_online_list });
                            }
                        })
                    });
                });
            });
        }
    });
}

// Render the group chat invite page
var getGroupChatInvite = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    var chat = req.query.id;
    res.render("groupchatinvite.ejs", { chat: chat });
}

// Gets the friends to display on the group chat invite page
var getOnlineFriendsSimple = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    user = req.session.user;
    var friends_list = [];
    var friends_online_list = [];
    db2.getFriends(user, function (err, data) {
        if (err) { return res.send({ friends: [] }); }
        db.getChatUsers(req.query.id, function (err2, data2) {
            if (err2) { return res.send({ friends: [] }); }
            db.getGroupChatInvites(req.query.id, function (err3, data3) {
                if (err3) {
                    console.log(err3);
                    return res.send({ friends: [] });
                } else {
                    data.Items.forEach(element => {
                        friends_list.push(element.friendname.S);
                    });
                    var chat_users = [];
                    for (const user of data2.Items) {
                        chat_users.push(user.username.S);
                    }
                    var received_invites = [];
                    for (const received_invite of data3.Items) {
                        received_invites.push(received_invite.username.S);
                    }
                    db2.getFriendUsers(friends_list, function (err5, data5) {
                        if (err5) {
                            //console.log(err5);
                        } else {
                            for (const friend of data5.Responses.users) {
                                if (friend.stat.BOOL && !chat_users.includes(friend.username.S)
                                    && !received_invites.includes(friend.username.S)) {
                                    friends_online_list.push(friend);
                                }
                            }
                            res.send({ friends: friends_online_list });
                        }
                    });
                }
            });
        });
    });
}

// Called whenever a user invites another user to a private chat
var postChatInvite = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var sender = req.session.user;
    var username = req.query.user;
    var first = req.query.first;
    var last = req.query.last;
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    db.sendInvitePrivChat(username, sender, req.session.first, req.session.last, first, last, function (err, data) {
        res.redirect("/startchat");
    });
}

// Called whenever someone is invited to a group chat
var postGroupChatInvite = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var username = req.query.user;
    var sender = req.session.user;
    var id = req.query.chat;
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    db.sendInviteGroupChat(id, username, sender, req.session.first, req.session.last, function (err, data) {
        res.redirect("/chats?id=" + id);
    });
}

// Called whenever someone leaves a room
var leaveRoom = function (req, res) {
    if (!req.session.user) {
        return res.redirect("/");
    }
    var id = req.query.id;
    req.session.time = new Date((new Date()).getTime() + 60 * 60 * 1000);
    req.session.save();
    db.leaveRoom(id, req.session.user, function (err, data) {
        res.redirect("/startchat");
    });
}

var routes = {
    get_startchat: getStartChat,
    get_chat: getChat,
    post_message: postMessage,
    get_chat_invites: getChatInvites,
    get_user_chats: getUserChats,
    post_accept_chat: postAcceptChat,
    post_reject_chat: postRejectChat,
    post_accept_group_chat: postAcceptGroupChat,
    post_reject_group_chat: postRejectGroupChat,
    get_online_friends: getOnlineFriends,
    get_group_chat_invite: getGroupChatInvite,
    get_online_friends_simple: getOnlineFriendsSimple,
    post_chat_invite: postChatInvite,
    post_group_chat_invite: postGroupChatInvite,
    leave_room: leaveRoom
};

module.exports = routes;