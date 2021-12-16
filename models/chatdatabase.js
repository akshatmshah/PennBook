var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();
var documentClient = new AWS.DynamoDB.DocumentClient();
const { v4: uuidv4 } = require('uuid');

var getDateTime = function() {
	var today = new Date();
	var day = today.getDate();
	if (today.getDate() <= 9) {
		day = "0" + day;
	}
	var month = today.getMonth() + 1;
	if (today.getMonth() + 1 <= 9) {
		month = "0" + month;
	}
	var date = today.getFullYear() + "/" + month + "/" + day;
	var minutes = today.getMinutes();
	if (today.getMinutes() <= 9) {
		minutes = "0" + minutes;
	}
	var hours = today.getHours();
	if (today.getHours() <= 9) {
		hours = "0" + hours;
	}
	var seconds = today.getSeconds();
	if (today.getSeconds() <= 9) {
		seconds = "0" + seconds;
	}
	var time = hours + ":" + minutes + ":" + seconds;
	return date + " " + time;
}

// Gets the chat messages in the chat with given chat_id
var myDB_getChatMessages = function(chat_id, callback) {
  	var params = {
      	KeyConditions: {
        	chat_id: {
          	ComparisonOperator: 'EQ',
          	AttributeValueList: [ { S: chat_id } ]
        	}
      	},
      	TableName: "chats"
  	};

  	db.query(params, function(err, data) {
    	callback(err, data);
  	});
}

// Adds a chat message to the chats table for persistent storage
var myDB_postMessage = function(chat_id, sender, content, datetime, username, callback){
  id = uuidv4().toString();
  var params = {
    Item: {
      "chat_id": {S: chat_id},
      "id": {S: uuidv4().toString()},
      ["sender"]: {S: sender},
      ["datetime"]: {S: datetime},
      ["content"]: {S: content},
	  ["username"]: {S: username}
    },
    TableName: "chats"
  };

  db.putItem(params, function(err, data) {
    callback(err, data);
  });
	
}

// Creates a private chat between two users by adding the chat room id to the chatrooms tables
var myDB_createPrivChat = function(user_1, user_2, sender_first, sender_last, first, last, callback) {
  id = uuidv4().toString();
  var items = [ {
    PutRequest: {
      Item: {
        "username": user_1,
        "chat_id": id,
		"first": first,
		"last": last,
		"username_2": user_2,
		"datetime": getDateTime()
      }
  }}, {
    PutRequest: {
      Item: {
        "username": user_2,
        "chat_id": id,
		"first": sender_first,
		"last": sender_last,
		"username_2": user_1,
		"datetime": getDateTime()
      }
  }}];

  var params = {
    RequestItems: {
      'chatrooms_reverse': items
    }
  };

  documentClient.batchWrite(params, function(err, data) {
    if (err) {
        callback(err, null);
    } else {
        var params2 = {
          RequestItems: {
            'chatrooms': items
          }
        };
        documentClient.batchWrite(params2, function(err, data) {
			var params3 = {
		    	Item: {
		      		"chat_id": {S: id},
		     		"group_chat": {BOOL: false}
		    	},
		    	TableName: "group_chat"
		  	};
			// This group_chat table keeps track of whether or not any given chat room is a group chat or not
		  	db.putItem(params3, function(err, data) {
				callback(err, id);
			});
        });
    }
  });
};

// Gets all incoming chat invites for a certain user
var myDB_getChatInvites = function(user_1, callback) {
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: user_1 } ]
      }
    },
    TableName: "chat_invites"
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, data);
    }
  });
}

// Gets all chatrooms a user is currently in
var myDB_getUserChats = function(user_1, callback) {
  var params = {
    KeyConditions: {
      username: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: user_1 } ]
      }
    },
    TableName: "chatrooms_reverse"
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, data);
    }
  });
}

// Deletes an invite from the private chat invites tables
var myDB_deleteInvite = function(username, sender, callback) {
  var params = {
    TableName: "chat_invites",
    Key : {
      "username": username,
      "sender": sender
    }
  };

  documentClient.delete(params, function(err, data) {
    var params2 = {
      TableName: "chat_invites_reverse",
      Key : {
		"sender": sender,
        "username": username
      }
    };
    documentClient.delete(params2, function(err, data) {
      callback(err, null);
    });
  });
};

// Called when a user accepts a private chat invite, creates the private chat room by calling the method from above
var myDB_acceptChatInvite = function(username, sender, sender_first, sender_last, first, last, callback) {
  myDB_createPrivChat(username, sender, sender_first, sender_last, first, last, function(err3, new_id) {
    if(err3){
	  callback(err3, null)
	} else {
      myDB_deleteInvite(username, sender, function(err4, data4) {
      	callback(err4, new_id);
  	  });
	}
  });
}

// Called when a user rejects a private chat invite, deletes the invite by calling the method from above
var myDB_rejectChatInvite = function(username, sender, callback) {
  myDB_deleteInvite(username, sender, function(err4, data4) {
  	  callback(err4);
  });
}

// Called when a user accepts a group chat invite, creates a separate group chat room/session for these users if this was from
// a private chat, just adds the user to an existing group chat if not
var myDB_acceptGroupChatInvite = function(username, id, first, last, callback) {
	var dateTime = getDateTime();
	var params = {
    	KeyConditions: {
      		chat_id: {
        		ComparisonOperator: 'EQ',
        		AttributeValueList: [ { S: id } ]
      		}
    	},
    	TableName: "group_chat"
  	};
  	db.query(params, function(err, data) {
		// Checks to see if you are adding to an existing group chat, if not create a new group chat
		if (!data.Items[0].group_chat.BOOL) {
			var new_id = uuidv4().toString();
			var items = [{
				PutRequest: {
		  			Item: {
		    			"username": username,
		    			"chat_id": new_id,
						"first": first,
						"last": last,
						"datetime": dateTime
		  			}
				}
			}];
			var params1 = {
		    	KeyConditions: {
		      		chat_id: {
		        		ComparisonOperator: 'EQ',
		        		AttributeValueList: [ { S: id } ]
		      		}
		    	},
		    	TableName: "chatrooms"
		  	};
		  	db.query(params1, function(err, data) {
				for (const item of data.Items) {
					var push1 = {
			    		PutRequest: {
			      			Item: {
			        			"username": item.username.S,
			        			"chat_id": new_id,
								"first": item.first.S,
								"last": item.last.S,
								"datetime": dateTime
			      			}
			  			}
					};
					items.push(push1);
				}
			  	var params = {
			    	RequestItems: {
			      		'chatrooms_reverse': items
			    	}
			  	};
				documentClient.batchWrite(params, function(err, data) {
				    if (err) {
				        callback(err, null);
				    } else {
				        var params2 = {
				          RequestItems: {
				            'chatrooms': items
				          }
				        };
				        documentClient.batchWrite(params2, function(err, data) {
							var params = {
						    	Item: {
						      		"chat_id": {S: new_id},
						     		"group_chat": {BOOL: true}
						    	},
						    	TableName: "group_chat"
						  	};
						  	db.putItem(params, function(err, data) {
								var params3 = {
							    	Key:{
							       		"chat_id": {S: id},
										"username": {S: username}
							      	},
							      	TableName: "group_chat_invites"
							  	};
								db.deleteItem(params3, function(err, data) {
									var params4 = {
							    		Key:{
											"username": {S: username},
								       		"chat_id": {S: id}
								      	},
								      	TableName: "group_chat_invites_reverse"
								  	};
									db.deleteItem(params4, function(err, data) {
										callback(err, data);
									});
								});
							});
						});
					}
				});
		  	});
		} else {
			var params = {
			    Item: {
			      "username": {S: username},
			      "chat_id": {S: id},
				  ["first"]: {S: first},
				  ["last"]: {S: last},
				  ["datetime"]: {S: dateTime}
			    },
			    TableName: "chatrooms"
			  };
			  db.putItem(params, function(err, data) {
			    var params2 = {
			    Item: {
					"chat_id": {S: id},
			        "username": {S: username},
				    ["first"]: {S: first},
				    ["last"]: {S: last},
					["datetime"]: {S: dateTime}
			      },
			      TableName: "chatrooms_reverse"
			    };
			    db.putItem(params2, function(err2, data2) {
					var params3 = {
				    	Key:{
				       		"chat_id": {S: id},
							"username": {S: username}
				      	},
				      	TableName: "group_chat_invites"
				  	};
					db.deleteItem(params3, function(err, data) {
						var params4 = {
				    		Key:{
								"username": {S: username},
					       		"chat_id": {S: id}
					      	},
					      	TableName: "group_chat_invites_reverse"
					  	};
						db.deleteItem(params4, function(err, data) {
							callback(err, data);
						});
					});
				});
		  });
		}
	});
}

// Called when a user rejects a group chat invite, deletes the invite in the group chat invites tables
var myDB_rejectGroupChatInvite = function(username, id, first, last, callback) {
	var params = {
    	Key:{
       		"chat_id": {S: id},
			"username": {S: username}
      	},
      	TableName: "group_chat_invites"
  	};
	db.deleteItem(params, function(err, data) {
		var params2 = {
    		Key:{
				"username": {S: username},
	       		"chat_id": {S: id}
	      	},
	      	TableName: "group_chat_invites_reverse"
	  	};
		db.deleteItem(params2, function(err, data) {
			callback(err, data);
		});
	});
}

// Called when a user sends an invite to another user for a private chat
var myDB_sendInvitePrivChat = function(username, sender, sender_first, sender_last, first, last, callback) {
  var dateTime = getDateTime();
  var params = {
		KeyConditionExpression: "username = :u and sender = :s",
	    ExpressionAttributeValues: {
	      ':u' : {S: sender},
		  ':s' : {S: username}
	    },
	    TableName: "chat_invites"
  }
  db.query(params, function(err, data) {
	if (!data.Items.length) {
	  var params = {
	    Item: {
	      "username": {S: username},
	      "sender": {S: sender},
	      ["isPriv"]: {BOOL: true},
		  ["first"]: {S: sender_first},
		  ["last"]: {S: sender_last},
		  ["datetime"]: {S: dateTime}
	    },
	    TableName: "chat_invites"
	  };
	
	  db.putItem(params, function(err, data) {
	    var params2 = {
	    Item: {
	        "sender": {S: sender},
	        "username": {S: username},
	        ["isPriv"]: {BOOL: true},
			["first"]: {S: sender_first},
			["last"]: {S: sender_last},
			["datetime"]: {S: dateTime}
	      },
	      TableName: "chat_invites_reverse"
	    };
	    db.putItem(params2, function(err2, data2) {
			callback(err2, data2);
		});
	  });
	} else {
		myDB_acceptChatInvite(sender, username, first, last, sender_first, sender_last, callback);
	}
  });
}

// Called when a user sends an invite to another user for a group chat
var myDB_sendInviteGroupChat = function(id, username, sender, first, last, callback) {
  var dateTime = getDateTime();
  var params = {
    Item: {
      "chat_id": {S: id},
      "username": {S: username},
	  "sender": {S: sender},
	  ["first"]: {S: first},
	  ["last"]: {S: last},
	  ["datetime"]: {S: dateTime}
    },
    TableName: "group_chat_invites"
  };
  db.putItem(params, function(err, data) {
    var params2 = {
    Item: {
        "username": {S: username},
        "chat_id": {S: id},
		"sender": {S: sender},
		["first"]: {S: first},
		["last"]: {S: last},
		["datetime"]: {S: dateTime}	
      },
      TableName: "group_chat_invites_reverse"
    };
    db.putItem(params2, function(err2, data2) {
		callback(err2, data2);
	});
  });
}

// Gets all outgoing chat requests for a user
var myDB_getSentRequests = function(username, callback) {
	var params = {
      KeyConditionExpression: 'sender = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "chat_invites_reverse"
    };
    db.query(params, function(err, data) {
		callback(null, data);
	});
}

// Gets all of the users in a particular chat
var myDB_getChatUsers = function(id, callback) {
  var params = {
    KeyConditions: {
      chat_id: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [ { S: id } ]
      }
    },
    TableName: "chatrooms"
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, data);
    }
  });
}

// Gets all invites to a certain chat
var myDB_getGroupChatInvites = function(chat_id, callback) {
	var params = {
	    KeyConditions: {
	      chat_id: {
	        ComparisonOperator: 'EQ',
	        AttributeValueList: [ { S: chat_id } ]
	      }
	    },
	    TableName: "group_chat_invites"
	};
	
	db.query(params, function(err, data) {
	    if (err) {
	      callback(err, null);
	    } else {
	      callback(null, data);
	    }
	});
}

// Gets all incoming group chat invites for a certain user
var myDB_getIncomingGroupChatInvites = function(username, callback) {
	var params = {
	    KeyConditions: {
	      username: {
	        ComparisonOperator: 'EQ',
	        AttributeValueList: [ { S: username } ]
	      }
	    },
	    TableName: "group_chat_invites_reverse"
	};
	
	db.query(params, function(err, data) {
	    if (err) {
	      callback(err, null);
	    } else {
	      callback(null, data);
	    }
	});
}

// Recursive function that gets all the users from each of the chats in chat_list, and returns a list of lists
var myDB_getListChatUsers = function(chat_list, count, return_list, first, last, callback) {
	var params = {
	    KeyConditions: {
	      chat_id: {
	        ComparisonOperator: 'EQ',
	        AttributeValueList: [ { S: chat_list[count] } ]
	      }
	    },
	    TableName: "chatrooms"
	};
	db.query(params, function(err, data) {
		var temp_list = [];
		for (const item of data.Items) {
			if (item.first.S + " " + item.last.S != first + " " + last) {
				temp_list.push(item.first.S + " " + item.last.S);
			}
		}
		return_list.push(temp_list);
	    if (count == chat_list.length - 1) {
			callback(null, return_list);
		} else {
			myDB_getListChatUsers(chat_list, count + 1, return_list, first, last, callback);
		}
	});
}

// Returns whether a chat is a group chat or a private chat
var myDB_getGroupChatStatus = function(chat_list, count, return_list, callback) {
	if (chat_list.length == 0) {
		return callback(null, return_list);
	}
	var params = {
	    KeyConditions: {
	      chat_id: {
	        ComparisonOperator: 'EQ',
	        AttributeValueList: [ { S: chat_list[count] } ]
	      }
	    },
	    TableName: "group_chat"
	};
	db.query(params, function(err, data) {
		if (err || data == null) {
			return callback(err, return_list);
		}
		return_list.push(data.Items[0].group_chat.BOOL);
	    if (count == chat_list.length - 1) {
			callback(null, return_list);
		} else {
			myDB_getGroupChatStatus(chat_list, count + 1, return_list, callback);
		}
	});
}

// Called when a user leaves a room, deletes their record of being in the room, if this is a private chat this room is deleted,
// if this is a group chat this room is deleted only if that user was the last user in the group chat
var myDB_leaveRoom = function(id, username, callback) {
	var params = {
    	Key:{
       		"chat_id": {S: id},
			"username": {S: username}
      	},
      	TableName: "chatrooms"
  	}
	db.deleteItem(params, function(err, data) {
		var params2 = {
    		Key:{
				"username": {S: username},
	       		"chat_id": {S: id}
	      	},
	      	TableName: "chatrooms_reverse"
	  	};
		db.deleteItem(params2, function(err, data) {
			var params3 = {
			    KeyConditions: {
			      chat_id: {
			        ComparisonOperator: 'EQ',
			        AttributeValueList: [ { S: id } ]
			      }
			    },
			    TableName: "group_chat"
			};
			db.query(params3, function(err, data) {
				var itemsArray = [];
				if (!data.Items[0].group_chat.BOOL) {
					var params = {
				      	KeyConditions: {
				        	chat_id: {
				          	ComparisonOperator: 'EQ',
				          	AttributeValueList: [ { S: id } ]
				        	}
				      	},
				      	TableName: "chats"
				  	};
				
				  	db.query(params, function(err, chats) {
						if (err) {
							callback(err, null);
						}
						for (const chat of chats.Items){
							var item = {
							    DeleteRequest : {
							        Key : {
							            'chat_id' : id,
										'id' : chat.id.S, 
							        }
						   		}
							};
							itemsArray.push(item);
						}
						var params4 = {
						    RequestItems : {
						        'chats' : itemsArray
						    }
						};
						documentClient.batchWrite(params4, function(err, data) {
							var params5 = {
							    KeyConditions: {
							      chat_id: {
							        ComparisonOperator: 'EQ',
							        AttributeValueList: [ { S: id } ]
							      }
							    },
							    TableName: "chatrooms"
							};
							db.query(params5, function(err, data){
								var other_user = data.Items[0].username.S;
								var params6 = {
						    		Key:{
										"username": {S: other_user},
							       		"chat_id": {S: id}
							      	},
							      	TableName: "chatrooms_reverse"
							  	};
								db.deleteItem(params6, function(err, data){
									var params7 = {
							    		Key:{
											"chat_id": {S: id},
											"username": {S: other_user}
								      	},
								      	TableName: "chatrooms"
								  	};
									db.deleteItem(params7, function(err, data){
										var params8 = {
								    		Key:{
												"username": {S: username},
									       		"chat_id": {S: id}
									      	},
									      	TableName: "chatrooms_reverse"
									  	};
										db.deleteItem(params8, function(err, data){
											var params9 = {
									    		Key:{
										       		"chat_id": {S: id}
										      	},
										      	TableName: "group_chat"
										  	};
											db.deleteItem(params9, function(err, data){
												callback(err, data);
											})
										})
									});
								});
								
							})
						});
					});
				} else {
					var params4 = {
					    KeyConditions: {
					      chat_id: {
					        ComparisonOperator: 'EQ',
					        AttributeValueList: [ { S: id } ]
					      }
					    },
					    TableName: "chatrooms"
					};
					db.query(params4, function(err, data) {
						if (data.Items.length == 0) {
							var params5 = {
					    		Key:{
						       		"chat_id": {S: id}
						      	},
						      	TableName: "group_chat"
						  	};
							db.deleteItem(params5, function(err, data){
								var params6 = {
							      	KeyConditions: {
							        	chat_id: {
							          	ComparisonOperator: 'EQ',
							          	AttributeValueList: [ { S: id } ]
							        	}
							      	},
							      	TableName: "chats"
							  	};
							
							  	db.query(params6, function(err, chats) {
									if (err) {
										callback(err, null);
									}
									for (const chat of chats.Items){
										var item = {
										    DeleteRequest : {
										        Key : {
										            'chat_id' : id,
													'id' : chat.id.S, 
										        }
									   		}
										};
										itemsArray.push(item);
									}
									var params7 = {
									    RequestItems : {
									        'chats' : itemsArray
									    }
									};
									documentClient.batchWrite(params7, function(err, data) {
										callback(err, data);
									});
								});
							})
						} else {
							callback(err, data);
						}
					});
					
				}
			});
		});
	});
}

var database = {
  getChatMessages: myDB_getChatMessages,
  postMessage: myDB_postMessage,
  createPrivChat: myDB_createPrivChat,
  getChatInvites: myDB_getChatInvites, 
  getUserChats: myDB_getUserChats,
  acceptChatInvite: myDB_acceptChatInvite,
  rejectChatInvite: myDB_rejectChatInvite,
  acceptGroupChatInvite: myDB_acceptGroupChatInvite,
  rejectGroupChatInvite: myDB_rejectGroupChatInvite,
  deleteInvite: myDB_deleteInvite, 
  sendInvitePrivChat: myDB_sendInvitePrivChat,
  sendInviteGroupChat: myDB_sendInviteGroupChat,
  getSentRequests: myDB_getSentRequests,
  getChatUsers: myDB_getChatUsers, 
  getGroupChatInvites: myDB_getGroupChatInvites,
  getIncomingGroupChatInvites: myDB_getIncomingGroupChatInvites,
  getListChatUsers: myDB_getListChatUsers,
  getGroupChatStatus: myDB_getGroupChatStatus,
  leaveRoom: myDB_leaveRoom
}

module.exports = database;