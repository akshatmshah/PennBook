var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();
const { v4: uuidv4 } = require('uuid');
var s3 = new AWS.S3();
const { exec } = require("child_process");

// Gets information for a user with the given username
var myDB_getUser = function(username, callback) {
  var params = {
      KeyConditions: {
        username: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: username } ]
        }
      },
      TableName: "users"
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else if (data.Items.length == 0) {
	  callback("No results", null);
	} else {
      callback(err, data);
    }
  });
}

// Gets interests for a user with the given username
var myDB_getInterests = function(username, callback) {
  var params = {
      KeyConditions: {
        username: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: username } ]
        }
      },
      TableName: "interests"
  };

  db.query(params, function(err, data) {
    if (err) {
      callback(err, null);
    } else {
      callback(err, data);
    }
  });
}

// Adds a user to the database during signup
var myDB_addUser = function(username, password, first, last, email, birthday, affiliation, interests, callback) {
	var params = {
      KeyConditions: {
        username: {
          ComparisonOperator: 'EQ',
          AttributeValueList: [ { S: username } ]
        }
      },
      TableName: "users"
    };
    // Check to see if user with provided username already exists in table
    db.query(params, function(err, data) {
	  if (err) {
		return ("Database error", null);
	  }
	  if (data.Items.length != 0) {	
		return callback("User with username " + username + " already exists", null);
	  } else {
		var params2 = {
        Item: {
          "username": {S: username},
          ["password"]: {S: password},
          ["first_name"]: {S: first},
		  ["last"]: {S: last},
		  ["full_name"]: {S: first + " " + last},
		  ["email"]: {S: email},
		  ["birthday"]: {S: birthday},
		  ["affiliation"]: {S: affiliation},
		  ["stat"]: {BOOL: true},
		  ["picture"]: {BOOL: false},
		  ["visibility"]: {S: "public"}
        },
        TableName: "users"
      };
      db.putItem(params2, function(err, data2){
        if (err) {
          callback(err, null);
        }
        else {
          var params3 = {
	        Item: {
	          "username": {S: username},
			  "affiliation": {S: affiliation},
	          ["password"]: {S: password},
	          ["first_name"]: {S: first},
			  ["last"]: {S: last},
			  ["full_name"]: {S: first + " " + last},
			  ["email"]: {S: email},
			  ["birthday"]: {S: birthday},
			  ["stat"]: {BOOL: true},
			  ["picture"]: {BOOL: false},
			  ["visibility"]: {S: "public"}
	        },
	        TableName: "users_affiliation"
	      };
	      db.putItem(params3, function(err, data3){
	        if (err) {
	          callback(err, null);
	        } else {
			  var count = 1;
			  var full_name = first + " " + last;
			  // Calls the recursive helper function below to populate the prefix table used for searching
			  prefix_add(first.toLowerCase() + " " + last.toLowerCase(), count, username, full_name, function(){
				// Calls the recursive helper function below to add each of the interests to the interests table
				addInterests(username, interests, 0, function() {
					callback(null, 'Successfully registered user with username ' + username);
				})
			  });
	        }
	      });
        }
      });
	}
  });	
}

// Populates the prefix table with all prefixes of the current user's full name
var prefix_add = function(prefix, count, username, full_name, callback) {
	var add_prefix = prefix.substring(0, count);
	var params = {
		KeyConditions: {
			prefix: {
				ComparisonOperator: 'EQ',
				AttributeValueList: [ { S:add_prefix} ]
			}
		},
		TableName: "users_prefix"
	}
	db.query(params, function(err, data){
		// We only maintain 10 users per prefix, as per Piazza
		if (data.Items.length >= 10) {
			return callback();
		} else {
			var params2 = {
				Item: {
					"prefix": {S: add_prefix},
					"username": {S: username},
					["full_name"]: {S: full_name}
				},
				TableName: "users_prefix"
			};
			db.putItem(params2, function(err, data){
				if (count >= prefix.length) {
					callback();
				} else {
					prefix_add(prefix, count + 1, username, full_name, callback);
				}
			});
		}
	})
}

// Adds each of the interests of a user to the interests table
var addInterests = function(username, interests, count, callback){
	if (!interests.length) {
		return callback();
	}
	var params = {
      Item: {
        "username": {S: username},
		"interest" : {S : interests[count]}
      },
      TableName: "interests"
    };
	db.putItem(params, function(err, data){
		if (count == interests.length - 1) {
			callback();
		} else {
			addInterests(username, interests, count + 1, callback);
		}
	});
}

// Deletes interests in the provided list from the table, used when updating a user's interests
var myDB_deleteInterests = function(username, interests, count, callback){
	if (!interests.length) {
		return callback();
	}
	var params = {
      TableName: "interests",
	  Key:{
	    "username": {S: username},
		"interest" : {S : interests[count]}
	  }
    };
	db.deleteItem(params, function(err, data){
		if (count == interests.length - 1) {
			callback();
		} else {
			myDB_deleteInterests(username, interests, count + 1, callback);
		}
	});
}

// Called whenever a user adds new interests table, creates a status post for this event
var myDB_statusInterests = function(username, first, last, new_interests, callback) {
	if (!first.length) {
		return callback();
	}
	var added_interests = first + " " + last + " is now interested in";
	for (var i = 0; i < new_interests.length; i++) {
		if (i == new_interests.length - 1 && new_interests.length >= 3) {
			added_interests = added_interests + ", and " + new_interests[i].toLowerCase() + "!";
		} else if (i == new_interests.length - 1 && new_interests.length == 2) {
			added_interests = added_interests + " and " + new_interests[i].toLowerCase() + "!";
		} else if (i == new_interests.length - 1 && new_interests.length == 1) {
			added_interests = added_interests + " " + new_interests[i].toLowerCase() + "!";
		} else if (i == 0) {
			added_interests = added_interests + " " + new_interests[i].toLowerCase();
		} else {
			added_interests = added_interests + ", " + new_interests[i].toLowerCase();
		}
		
	}
	var uuid = uuidv4().toString();
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
	var ampm = "";
	if (Math.floor(today.getHours() / 12) == 0) {
		ampm = "AM"
	} else {
		ampm = "PM"
	}
	var dateTime = date + " " + time;
  	var params = {
    	Item: {
		  "username": {S: username},
          "id": {S: uuid},
          ["wall_username"]: {S: username},
		  ["datetime"]: {S: dateTime},
		  ["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
		  ["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
		  ["content"]: {S: added_interests},
		  ["first"]: {S: first},
		  ["last"]: {S: last},
		  ["wall_first"]: {S: first},
		  ["wall_last"]: {S: last},
		  ["type"] : {S: "status"}	
        },
        TableName: "posts_username"
    };
    db.putItem(params, function(err, data){
        if (err) {
          callback(err, null);
        }
        else {
		  	var params4 = {
	        	Item: {
			  		"wall_username": {S: username},
	          		"id": {S: uuid},
	          		["username"]: {S: username},
			  		["datetime"]: {S: dateTime},
			  		["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
			  		["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
			  		["content"]: {S: added_interests},
			  		["first"]: {S: first},
			  		["last"]: {S: last},
			  		["wall_first"]: {S: first},
			  		["wall_last"]: {S: last},
			  		["type"] : {S: "status"}	
	        	},
	        	TableName: "posts_wall_username"
	      	};
	      	db.putItem(params4, function(err, data){
	        	callback(null, "Done");
			});
		}
	});
}

// Updates user affiliation in both users tables
var myDB_updateUser = function(affiliation, username, first, last, callback) {
	var params = {
      KeyConditionExpression: 'username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "users"
    };
    // Check to see if affiliation is the same as the one in the table
    db.query(params, function(err1, data1) {
	  if (err1) {
		return callback("Database error", null);
	  }
	  if (data1.Items[0].affiliation.S === affiliation) {
		return callback("Same affiliation", null);
	  } else {
	  var params2 = {
        TableName: "users",
    	Key:{
          "username": {S: username}
    	},
		UpdateExpression: "set affiliation = :a",
		ExpressionAttributeValues: {
            ":a": {S: affiliation}
        }
      };
	  // Updates affiliation in main users table, primary keyed by username
      db.updateItem(params2, function(err2, data2){
        if (err2) {
          callback(err, null);
        }
        else {
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
		  var ampm = "";
		  if (Math.floor(today.getHours() / 12) == 0) {
			ampm = "AM"
		  } else {
			ampm = "PM"
		  }
		  var dateTime = date + " " + time;
		  var uuid = uuidv4().toString();
		  // Creates the status posts for the updated affiliation
      	  var params3 = {
	        Item: {
			  "username": {S: username},
	          "id": {S: uuid},
	          ["wall_username"]: {S: username},
			  ["datetime"]: {S: dateTime},
			  ["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
			  ["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
			  ["content"]: {S: first + " " + last + " has updated their affiliation to " + affiliation},
			  ["first"]: {S: first},
			  ["last"]: {S: last},
			  ["wall_first"]: {S: first},
			  ["wall_last"]: {S: last},
			  ["type"] : {S: "status"}	
	        },
	        TableName: "posts_username"
	      };
	      db.putItem(params3, function(err3, data3){
	        if (err3) {
	          callback(err, null);
	        }
	        else {
			  var params4 = {
		        Item: {
				  "wall_username": {S: username},
		          "id": {S: uuid},
		          ["username"]: {S: username},
				  ["datetime"]: {S: dateTime},
				  ["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
				  ["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
				  ["content"]: {S: first + " " + last + " has updated their affiliation to " + affiliation},
				  ["first"]: {S: first},
				  ["last"]: {S: last},
				  ["wall_first"]: {S: first},
				  ["wall_last"]: {S: last},
				  ["type"] : {S: "status"}	
		        },
		        TableName: "posts_wall_username"
		      };
		      db.putItem(params4, function(err4, data4){
		        if (err4) {
		          callback(err, null);
		        }
		        else {
		          var params5 = {
			        TableName: "users_affiliation",
			    	Key:{
					  "affiliation": {S: data1.Items[0].affiliation.S},
			          "username": {S: username}
			    	}
			      };
				  // Deletes the user in the affiliation table, and then adds them back again with the new affiliation
			      db.deleteItem(params5, function(err5, data5){
					var params6 = {
				        Item: {
				          "username": {S: data1.Items[0].username.S},
						  "affiliation": {S: affiliation},
				          ["password"]: {S: data1.Items[0].password.S},
				          ["first_name"]: {S: data1.Items[0].first_name.S},
						  ["last"]: {S: data1.Items[0].last.S},
						  ["full_name"]: {S: data1.Items[0].full_name.S},
						  ["email"]: {S: data1.Items[0].email.S},
						  ["birthday"]: {S: data1.Items[0].birthday.S},
						  ["stat"]: {BOOL: data1.Items[0].stat.BOOL},
						  ["visibility"]: {S: data1.Items[0].visibility.S}
				        },
				        TableName: "users_affiliation"
				      };
				      db.putItem(params6, function(err6, data6){
						  callback(null, "Successfully changed affiliation");
					  });
				  });
		        }
		      });
	        }
	      });
    	}
      });
	}
  });	
}

// Updates user email
var myDB_updateUserEmail = function(email, username, callback) {
	var params = {
      KeyConditionExpression: 'username = :u',
	  FilterExpression: 'email =:e',
 	  ExpressionAttributeValues: {
        ':u' : {S: username},
		':e' : {S: email}
      },
      TableName: "users"
    };
    // Check to see if email is the same as the one in the table
    db.query(params, function(err, data) {
	  if (err) {
		return callback("Database error", null);
	  }
	  if (data.Items.length != 0) {
		return callback("Same email", null);
	  } else {
		  var params2 = {
	        TableName: "users",
	    	Key:{
	          "username": {S: username}
	    	},
			UpdateExpression: "set email = :e",
			ExpressionAttributeValues: {
	            ":e": {S: email}
	        }
	      };
	      db.updateItem(params2, function(err, data){
	        if (err) {
	          callback(err, null);
	        }
	        else {
			  callback(null, "Email Updated");
	    	}
     	  });
	  }
  });	
}

// Updates user password
var myDB_updateUserPassword = function(password, username, callback) {
	var params = {
      KeyConditionExpression: 'username = :u',
	  FilterExpression: 'password =:p',
 	  ExpressionAttributeValues: {
        ':u' : {S: username},
		':p' : {S: password}
      },
      TableName: "users"
    };
    // Check to see if password is the same as the one in the table
    db.query(params, function(err, data) {
	  if (err) {
		return callback("Database error", null)
	  }
	  if (data.Items.length != 0) {
		return callback("Same email", null);
	  } else {
	  var params2 = {
        TableName: "users",
    	Key:{
          "username": {S: username}
    	},
		UpdateExpression: "set password = :p",
		ExpressionAttributeValues: {
            ":p": {S: password}
        }
      };
      db.updateItem(params2, function(err, data){
        if (err) {
          callback(err, null);
        }
        else {
		  callback(null, "Email Updated");
    	}
      });
	}
  });	
}

// Updates the user's visibility
var myDB_updateVisibility = function(username, visibility, callback) {
  var params = {
    TableName: "users",
	Key:{
      "username": {S: username}
	},
	UpdateExpression: "set visibility = :v",
	ExpressionAttributeValues: {
        ":v": {S: visibility}
    }
  };
  db.updateItem(params, function(err, data){
    if (err) {
      callback(err, null);
    }
    else {
	  callback(null, "Visibility Updated");
	}
  });
}

// Gets all users of a particular affiliation for the visualizer and friend suggestions
var myDB_getUsersByAffiliation = function(affiliation, callback) {
  var params = {
	KeyConditionExpression: 'affiliation = :a',
	ExpressionAttributeValues: {
		':a' : {S: affiliation}
	},
	TableName: "users_affiliation"
  };
  db.query(params, function(err, data){
	  return callback(err, data);
  });   
}

// Gets all of the friends of a particular user from the friends table
var myDB_getFriends = function(username, callback) {
	var params = {
      KeyConditionExpression: 'username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "friends"
    };
    db.query(params, function(err, data) {
        callback(err, data);
    });
}

// Gets the user items for each of the friends in the list provided
var myDB_getFriendUsers = function(friend_list, callback) {
	var params = {
		RequestItems: {
			"users" : {
				"Keys" : []
			}
		}
	}
	for (const friend of friend_list) {
		params.RequestItems["users"]["Keys"].push({"username" : { "S" : friend }});
	}
	if (friend_list.length) {
		db.batchGetItem(params, function(err, data) {
			callback(err, data);
		})
	} else {
		callback("No friends", null);
	}
}

// Gets a list of friends and users with the same affiliation for the visualizer
var myDB_getVisualizerFriends = function(username, affiliation, callback) {
	var params = {
      KeyConditionExpression: 'username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "friends"
    };
    db.query(params, function(err1, data1) {
		var params2 = {
      		KeyConditionExpression: 'affiliation = :a',
 	  		ExpressionAttributeValues: {
        		':a' : {S: affiliation}
      		},
      		TableName: "users_affiliation"
    	};
		db.query(params2, function(err2, data2){
			return callback(err1, err2, data1, data2);
		});   
    });
}


// Gets all posts on a user's wall
var myDB_getWall = function(username, callback) {
  var params = {
      KeyConditionExpression: 'wall_username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "posts_wall_username"
  };
  db.query(params, function(err, data) {
	  if (err) {
		return callback(err, data);
	  }
	  data.Items.sort(function(a, b){return (a.datetime.S).localeCompare(b.datetime.S);}).reverse();
  	  callback(err, data);
  });
}

// Gets all posts on a user's home page
var myDB_getHomePosts = function(friend, callback) {
  var params = {
      TableName: "posts_username",
	  KeyConditionExpression: "username = :f",
	  ExpressionAttributeValues: {
		":f" : {S: friend}
	  }
  };
  db.query(params, function(err, data) {
	if (err) {
		return callback(err, data);
	}
	data.Items.sort(function(a, b){return ('' + a.datetime.S).localeCompare(b.datetime.S);}).reverse();
    callback(err, data);
  });
}

// Creates a post on a user's wall
var myDB_wallPost = function (poster, wall_user, content, first, last, callback)  {
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
  var ampm = "";
  if (Math.floor(today.getHours() / 12) == 0) {
	ampm = "AM"
  } else {
	ampm = "PM"
  }
  var dateTime = date + " " + time;
  var params = {
      KeyConditionExpression: 'username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: wall_user}
      },
      TableName: "users"
  };
  // Gets information about the user with the wall the post was made to
  db.query(params, function(err, wall_data){
    if (err) {
      callback(err, null);
    }
    else {
	  var wall_first = wall_data.Items[0].first_name.S;
	  var wall_last = wall_data.Items[0].last.S;
	  var uuid = uuidv4().toString();
	  var params = {
	    Item: {
		  "username": {S: poster},
	      "id": {S: uuid},
		  ["datetime"]: {S: dateTime},
		  ["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
		  ["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
	      ["wall_username"]: {S: wall_user},
		  ["content"]: {S: content}, 
		  ["first"]: {S: first},
		  ["last"]: {S: last},
		  ["wall_first"]: {S: wall_first},
		  ["wall_last"]: {S: wall_last},
		  ["type"]: {S: "post"}
	    },
	    TableName: "posts_username"
	  };
	  db.putItem(params, function(err, data){
	    if (err) {
	      callback(err, null);
	    }
	    else {
		  var params2 = {
		    Item: {
		      "wall_username": {S: wall_user},			  
		      "id": {S: uuid},
			  ["username"]: {S: poster},
			  ["datetime"]: {S: dateTime},
			  ["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
			  ["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
			  ["content"]: {S: content}, 
			  ["first"]: {S: first},
			  ["last"]: {S: last},
			  ["wall_first"]: {S: wall_first},
			  ["wall_last"]: {S: wall_last},
			  ["type"]: {S: "post"}
		    },
		    TableName: "posts_wall_username"
		  };
		  db.putItem(params2, function(err, data2){
			  var params3 = {
			    Item: {
			      "wall_username": {S: poster},			  
			      "id": {S: uuid},
				  ["username"]: {S: wall_user},
				  ["datetime"]: {S: dateTime},
				  ["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
				  ["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
				  ["content"]: {S: content}, 
				  ["first"]: {S: first},
				  ["last"]: {S: last},
				  ["wall_first"]: {S: wall_first},
				  ["wall_last"]: {S: wall_last},
				  ["type"]: {S: "post"}
			    },
			    TableName: "posts_wall_username"
			  };
			  db.putItem(params3, function(err, data3){
				  callback(null, "Added status update");
			  })
		  })
	    }
	  });
    }
  });
}

// Adds a user's comment to the database
var myDB_comment = function (status_id, poster, wall_user, content, first, last, callback)  {
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
  	var ampm = "";
  	if (Math.floor(today.getHours() / 12) == 0) {
		ampm = "AM"
  	} else {
		ampm = "PM"
  	}
  	var dateTime = date + " " + time;
  	var params = {
      	KeyConditionExpression: 'username = :u',
 	  	ExpressionAttributeValues: {
        	':u' : {S: wall_user}
      	},
      	TableName: "users"
  	};
  	var params = {
    	Item: {
	  	"status_update": {S: status_id},
     	"id": { S: uuidv4().toString()},
	  	["datetime"]: {S: dateTime},
	  	["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
	  	["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
      	["username"]: {S: poster},
      	["wall_username"]: {S: wall_user},
	  	["content"]: {S: content }, 
	  	["first"]: {S: first},
	  	["last"]: {S: last}
    	},
    	TableName: "comments",
    	ReturnValues: 'NONE'
  	};
  	db.putItem(params, function(err, data){
    	if (err) {
      		callback(err, null);
    	}
    	else {
      		callback(null, "Added status update");
    	}
  	});
}

// Gets all of the comments for a post of a particular id
var myDB_getComments = function(id, callback) {
  	var params = {
      	TableName: "comments",
	  	KeyConditionExpression: 'status_update = :i',
 	  	ExpressionAttributeValues: {
        	':i' : {S: id}
      	}
  	};
  	db.query(params, function(err, data) {
		if (err) {
			return callback(err, data);
		}
	  	data.Items.sort(function(a, b){return ('' + a.datetime.S).localeCompare(b.datetime.S);}).reverse();
      	callback(err, data);
  	});
}

// Creates a friendship between user 1 and user 2, also creates a status post for them
var myDB_createFriendship = function (user1, user2, first, last, affiliation, callback)  {
	var params = {
      	KeyConditionExpression: 'username = :u',
 	  	ExpressionAttributeValues: {
        	':u' : {S: user2}
      	},
      	TableName: "users"
  	};
  	// Gets information about the friend from the users table
  	db.query(params, function(err, data) {
	  	if (err) {
			return callback(err, data);
	  	}
	  	var friend_first = data.Items[0].first_name.S;
	  	var friend_last = data.Items[0].last.S;
	  	var friend_affiliation = data.Items[0].affiliation.S;
	  	var params = {
	    	Item: {
	      		"username": {S: user1},
	      		["friendname"]: {S: user2}, 
	      		["first"]: {S: friend_first}, 
	      		["last"]: {S: friend_last}, 
		  		["affiliation"]: {S: friend_affiliation}, 
	    	},
	    	TableName: "friends",
	    	ReturnValues: 'NONE'
	  	};
	  	db.putItem(params, function(err, data){
	    	if (err) {
	      		callback(err, null);
	    	} else {
		  		var params2 = {
		    		Item: {
		      			"username": {S: user2},
		      			["friendname"]: {S: user1},
		      			["first"]: {S: first},
		      			["last"]: {S: last},
			  			["affiliation"]: {S: affiliation}
		    		},
		    		TableName: "friends",
		    		ReturnValues: 'NONE'
		  		};
		  		db.putItem(params2, function(err, data){
					if (err) {
				  		callback(err, null);
					} else {
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
					  	var ampm = "";
					  	if (Math.floor(today.getHours() / 12) == 0) {
							ampm = "AM"
					  	} else {
							ampm = "PM"
					  	}
					  	var uuid = uuidv4().toString();
					  	var dateTime = date + " " + time;
				  		var params3 = {
				    		Item: {
					  			"username": {S: user1},
						      	"id": {S: uuid},
							  	["datetime"]: {S: dateTime},
							  	["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
							  	["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
						      	["wall_username"]: {S: user2},
							  	["content"]: {S: first + " " + last + " is now friends with " + friend_first + " " + friend_last + "!"}, 
							  	["first"]: {S: first},
							  	["last"]: {S: last},
							  	["wall_first"]: {S: friend_first},
							  	["wall_last"]: {S: friend_last},
							  	["type"]: {S: "friend"}
						    	},
						    TableName: "posts_username"
						};
			 	 		db.putItem(params3, function(err, data){
				    		if (err) {
				      			callback(err, null);
				    		}
				    		else {
								var params5 = {
						    		Item: {
								      	"wall_username": {S: user1},			  
								      	"id": {S: uuid},
									  	["username"]: {S: user2},
									  	["datetime"]: {S: dateTime},
									  	["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
									  	["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
									  	["content"]: {S: first + " " + last + " is now friends with " + friend_first + " " + friend_last + "!"}, 
									  	["first"]: {S: first},
									  	["last"]: {S: last},
									  	["wall_first"]: {S: friend_first},
									  	["wall_last"]: {S: friend_last},
									  	["type"]: {S: "friend"}
						    		},
						    		TableName: "posts_wall_username"
						  		};
						  		db.putItem(params5, function(err, data){
							  		var params6 = {
							    		Item: {
									      	"wall_username": {S: user2},			  
									      	"id": {S: uuid},
										  	["username"]: {S: user1},
										  	["datetime"]: {S: dateTime},
										  	["date"]: {S: month + "/" + day + "/" + today.getFullYear()},
										  	["time"]: {S: (hours % 12) + ":" + minutes + " " + ampm},
										  	["content"]: {S: first + " " + last + " is now friends with " + friend_first + " " + friend_last + "!"}, 
										  	["first"]: {S: first},
										  	["last"]: {S: last},
										  	["wall_first"]: {S: friend_first},
										  	["wall_last"]: {S: friend_last},
											["type"]: {S: "friend"}
							    		},
							    		TableName: "posts_wall_username"
							  		};
							  		db.putItem(params6, function(err, data){
										callback(null, "Added friendship");
					  				})
				  				})
							}
						});
					}
				});
			}
		});
	});
}

// Called when a user unfriends another user, deletes the relationship from the friends table
var myDB_unfriend = function (user1, user2, callback)  {
  var params = {
      Key:{
        "username": {S: user1},
		"friendname": {S: user2}
      },
      TableName: "friends"
  };
  db.deleteItem(params, function(err, data) {
	  var params2 = {
	      Key:{
	        "username": {S: user2},
			"friendname": {S: user1}
	      },
	      TableName: "friends"
	  };
	  db.deleteItem(params2, function(err, data){
		callback(err, null);
	  });
  });
}

// Called when a user logs on or off, changes their status in the users table
var myDB_setStatus = function(username, status, callback) {
  var params = {
    TableName: "users",
	Key:{
      "username": {S: username}
	},
	UpdateExpression: "set stat = :s",
	ExpressionAttributeValues: {
        ":s": {BOOL: status}
    }
  };
  db.updateItem(params, function(err, data){
    if (err) {
      callback(err, null);
    }
    else {
	  callback(null, "Status Updated");
	}
  });
}

// Called whenever a user types something into the search bar, gets all users with prefix equal to what is in the search bar
var myDB_getUsersByName = function(search, callback) {
	var params = {
      KeyConditionExpression: 'prefix = :s',
 	  ExpressionAttributeValues: {
        ':s' : {S: search.toLowerCase()}
      },
      TableName: "users_prefix"
    };
    db.query(params, function(err, data) {
		callback(err, data);
	});
}

// Called when a user creates a friend request, adds this request to the friend request tables. If a friend request already exists
// from the receiver to the sender, just creates a friendship between these two users
var myDB_createFriendRequest = function(username, requester_username, first, last, affiliation, callback) {
	var params = {
	    TableName: "users",
		KeyConditionExpression: "username = :u",
		ExpressionAttributeValues: {
			":u" : {S: username}
		}
	};
	db.query(params, function(err1, data1) {
		if (err1) {
			return callback(err, data1);
		}
		var requested_first = data1.Items[0].first_name.S;
		var requested_last = data1.Items[0].last.S;
		var params2 = {
		    TableName: "friend_requests",
			KeyConditionExpression: "username = :u and requester_username = :r",
			ExpressionAttributeValues: {
				":u" : {S: requester_username},
				":r" : {S: username}
			}
		};
		db.query(params2, function(err2, data2) {
			if (err2) {
				return callback(err2, data2);
			}
			if (data2.Items.length) {
				var params3 = {
			      Key:{
			        "username": {S: requester_username},
					"requester_username": {S: username}
			      },
			      TableName: "friend_requests"
			    };
			    db.deleteItem(params3, function(err, data) {
					var params4 = {
				      Key:{
						"requester_username": {S: username},
				        "username": {S: requester_username}
				      },
				      TableName: "friend_requests_reverse"
				    };
					db.deleteItem(params4, function(err, data) {
						myDB_createFriendship(username, requester_username, requested_first, requested_last, affiliation, callback);
					});
				});
			} else {
				var params3 = {
				  Item: {
				      "username": {S: username},
				      "requester_username": {S: requester_username}, 
				      ["first"]: {S: first}, 
				      ["last"]: {S: last}
				  },
			      TableName: "friend_requests"
			    };
			    db.putItem(params3, function(err, data) {
					var params4 = {
					  Item: {
					      "requester_username": {S: requester_username},
					      "username": {S: username}, 
						  ["first"]: {S: requested_first},
						  ["last"]: {S: requested_last}
					  },
				      TableName: "friend_requests_reverse"
				    };
			 		db.putItem(params4, function(err, data) {
						callback(err, data);
					});
				});
			}
		});
	});
}

// Called when a user undoes a friend request, deletes that friend request from the request tables
var myDB_undoFriendRequest = function(username, requester_username, callback) {
	var params = {
      Key:{
        "username": {S: username},
		"requester_username": {S: requester_username}
      },
      TableName: "friend_requests"
    };
    db.deleteItem(params, function(err, data) {
		var params2 = {
      	  Key:{
			"requester_username": {S: requester_username},
	        "username": {S: username}
	      },
	      TableName: "friend_requests_reverse"
	    };
		db.deleteItem(params2, function(err, data) {
			callback(err, "Friend request undone");
		});
	});
}

// Called when a user accepts a friend request, deletes the friend request from the friend requests tables and
// creates a friendship between the two users by calling that function from above
var myDB_acceptFriendRequest = function(username, requester_username, first, last, affiliation, callback) {
	var params = {
      Key:{
        "username": {S: username},
		"requester_username": {S: requester_username}
      },
      TableName: "friend_requests"
    };
    db.deleteItem(params, function(err, data) {
		var params2 = {
	      Key:{
			"requester_username": {S: requester_username},
	        "username": {S: username}
	      },
	      TableName: "friend_requests_reverse"
	    };
		db.deleteItem(params2, function(err, data) {
			myDB_createFriendship(username, requester_username, first, last, affiliation, callback);
		});
	});
}

// Called when a user rejects a friend request, deletes that friend request from the request tables
var myDB_rejectFriendRequest = function(username, requester_username, callback) {
	var params = {
      Key:{
        "username": {S: username},
		"requester_username": {S: requester_username}
      },
      TableName: "friend_requests"
    };
    db.deleteItem(params, function(err, data) {
		var params2 = {
      	  Key:{
			"requester_username": {S: requester_username},
	        "username": {S: username}
	      },
	      TableName: "friend_requests_reverse"
	    };
		db.deleteItem(params2, function(err, data) {
			callback(err, "Friend request rejected");
		});
	});
}

// Gets the incoming friend requests for a given user
var myDB_getFriendRequests = function(username, callback) {
	var params = {
      KeyConditionExpression: 'username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "friend_requests"
    };
    db.query(params, function(err, data) {
		callback(err, data);
	});
}

// Gets the outgoing friend requests for a given user
var myDB_getSentFriendRequests = function(username, callback) {
	var params = {
      KeyConditionExpression: 'requester_username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "friend_requests_reverse"
    };
    db.query(params, function(err, data) {
		callback(err, data);
	});
}

// Called whenever a user uploads a profile picture, uploads the image to S3
var myDB_uploadImage = function(username, file, callback) {
	var params = {
		Bucket: 'g29profilepictures',
		Key: username,
		Body: file.buffer
	};
	s3.putObject(params, function(err, data) {
		var params2 = {
        	TableName: "users",
    		Key:{
        		"username": {S: username}
    		},
			UpdateExpression: "set picture = :p",
			ExpressionAttributeValues: {
            	":p": {BOOL: true}
        	}
		};
		db.updateItem(params2, function(err2, data2){
			callback(err, data);
		});
	});
}

// Checks if a user has an image in the database for the wall display, if not a default picture will be displayed
var myDB_getImage = function(username, callback) {
	var params = {
		Bucket: 'g29profilepictures',
		Key: username
	};
	s3.getObject(params, function(err, data) {
		callback(err, data);
	});
}

// Called whenever a user searches for articles by keyword, queries inverted and gets the articles out of the articles table
var myDB_articleSearch = function(searchWords, username, callback) {
	var frequencyMap = new Map();
	var firstResults = [];	
    // Creates parameters for each searchword, which are stored in a list and accessed while querying below
	var paramsList = [];
	for (let i = 0; i < searchWords.length; i++) {
		var params = {
			TableName : "inverted",
			KeyConditionExpression: "#wd = :wwww",
			ExpressionAttributeNames:{
				"#wd": "keyword"
			},
			ExpressionAttributeValues: {
				":wwww": {S : searchWords[i]}
			}
		}
		paramsList.push(params);
	}
	
	// Function that runs after each query has completed, pushes the article URL's for each query into a list
	var queryFunction = function(data) {
		for (const item of data.Items) {
			if (frequencyMap.has(item.url.S)) {
				frequencyMap.set(item.url.S, frequencyMap.get(item.url.S) + 1);
			} else {
				frequencyMap.set(item.url.S, 1);
			}
			firstResults.push(item.url.S);
		}
	};
	
	// Creates promises for each query, which ensures we start to query articles only after all queries have completed
	var promiseList = [];
	for (let i = 0 ; i < paramsList.length; i++) {
		promiseList.push(db.query(paramsList[i]).promise().then(queryFunction));
	}
	
	// After all promises have finished running, so all queries to inverted have completed, query articles
  	Promise.all(promiseList).then(() => {
		var resultsMap = new Map();
		var paramsList2 = [];
		var promiseList2 = [];
		for (const article of firstResults) {
			var params = {
				TableName : "articles",
				KeyConditionExpression: "#wd = :wwww",
				ExpressionAttributeNames:{
					"#wd": "url"
				},
				ExpressionAttributeValues: {
					":wwww": {S: article}
				}
			}
			paramsList2.push(params);
			var queryFunction = function(data) {
				for (const item of data.Items) {					
					resultsMap.set(item.url.S, item);
				}
			};
		}	
		for (let i = 0; i < paramsList2.length; i++) {
			promiseList2.push(db.query(paramsList2[i]).promise().then(queryFunction));
		}
		// Only render results after all queries complete
		Promise.all(promiseList2).then(() => {
			// Sort results by the number of search words they match and then the number of views they have
			finalResults = sortByScore(resultsMap, frequencyMap, username, callback);
		});
	});
}

// Uses a map of search word map frequency and a map of item results from our query and sorts them first by the number of search
// words they match, and then breaks ties in this using score
var sortByScore = function(resultsMap, frequencyMap, username, callback) {
	// Sorting by search word match frequency
	var sortedByFrequency = [];
	var frequencies = [];
	// At most 15 results per search word
	while (sortedByFrequency.length < 15 && frequencyMap.size > 0) {
		var maxFrequency = 0;
		var maxID = "";
		for (let [key, value] of frequencyMap) {
			if (value > maxFrequency) {
				maxFrequency = value;
				maxID = key;
			}
		}
		sortedByFrequency.push(resultsMap.get(maxID));
		frequencies.push(maxFrequency);
		frequencyMap.delete(maxID);
	}
	var params = {
      KeyConditionExpression: 'username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "userArticleScores"
    };
	var scoreMap = new Map();
    db.query(params, function(err, data) {
		var sortByScore = [];
		for (const item of data.Items) {
			scoreMap.set(item.articleID.N, item.score.N);
		}
		for (let [key, value] of resultsMap) {
			if (scoreMap.get(value.articleID.N) === undefined) {
				scoreMap.set(value.articleID.N, '0');
			}
		}
		var counter = 0;
		while (counter < sortedByFrequency.length) {
			var sameList = [];
			var frequency = frequencies[counter];
			while (true) {
				if (frequencies[counter] != frequency) {
					break;
				}
				sameList.push(sortedByFrequency[counter]);
				counter = counter + 1;
			}
			sameList.sort(function(a, b){return (scoreMap.get(a.articleID.N)).localeCompare(scoreMap.get(b.articleID.N));}).reverse();
			var today = new Date();
			var day = today.getDate();
		    if (today.getDate() <= 9) {
			  day = "0" + day;
		    }
		    var month = today.getMonth() + 1;
		    if (today.getMonth() + 1 <= 9) {
		  	  month = "0" + month;
		    }
			var date = today.getFullYear() + "-" + month + "-" + day;
			for (var i = 0; i < sameList.length; i++) {
				if (sameList[i].date.S <= date) {
					sortByScore.push(sameList[i]);
				}
			}
		}
		callback(null, sortByScore);
	});
}

// This is called right before the Livy job runs, adds the current top 5 scored articles for a user to the list of
// articles that has already been recommended to them, since we shouldn't see these 5 articles again
var myDB_refreshRecommendations = function(username, callback) {
	var params = {
      KeyConditionExpression: 'username = :u',
 	  ExpressionAttributeValues: {
        ':u' : {S: username}
      },
      TableName: "userArticleScores"
    };
    db.query(params, function(err, data) {
		if (err) {
			return callback(err, data);
		}
		var params2 = {
			KeyConditionExpression: 'username = :u',
	 	    ExpressionAttributeValues: {
	          ':u' : {S: username}
	        },
	        TableName: "already_recommended"
		}
		db.query(params2, function(err2, data2){
			if (err2) {
				return callback(err2, data2);
			}
			var today = new Date();
		    var day = today.getDate();
		    if (today.getDate() <= 9) {
			  day = "0" + day;
		    }
		    var month = today.getMonth() + 1;
		    if (today.getMonth() + 1 <= 9) {
		  	  month = "0" + month;
		    }
			var already_recommended = [];
			for (const i of data2.Items) {
				already_recommended.push(i.articleID.N);
			}
			var recommendations = [];
		    var date = today.getFullYear() + "-" + month + "-" + day;
			for (const item of data.Items) {
				if (item.date) {
					if (item.date.S == date) {
						recommendations.push(item);
					}
				}
			}
			recommendations.sort(function(a, b){return (a.score.N).localeCompare(b.score.N);});
			query_recommendations = [];
			var count = 0;
			// Just gets out the top 5 recommendations
			if (recommendations.length) {
				while (query_recommendations.length < 5 && count <= recommendations.length) {
					if (recommendations[count].url && !already_recommended.includes(recommendations[count].articleID.N)) {
						query_recommendations.push(recommendations[count]);
					}
					count = count + 1;
				}
			}
			recursivePutItem(username, query_recommendations, 0, function() {
				callback();
			});
		})
	});
}

// Makes queries for the user and all the user's friends to get their posts from the database for the home page
var recursivePutItem = function(username, query_recommendations, count, callback) {
	if (count >= query_recommendations.length) {
		return callback();
	} else {
		var params = {
			Item: {
			  	"username": {S: username},
	          	"articleID": {N: query_recommendations[count].articleID.N}
			},
			TableName: "already_recommended"
		}
		db.putItem(params, function(err, data) {
			count = count + 1;
			recursivePutItem(username, query_recommendations, count, callback);
		});
	}
}

// Gets the article recommendations for a given user from the corresponding table
myDB_getRecommendations = function(username, callback) {
	var params = {
		KeyConditionExpression: "username = :u",
	    ExpressionAttributeValues: {
	      ':u' : {S: username}
	    },
	    TableName: "userArticleScores"
	}
	db.query(params, function(err, data) {
		if (err) {
			return callback(err, data);
		}
		var params2 = {
			KeyConditionExpression: 'username = :u',
	 	    ExpressionAttributeValues: {
	          ':u' : {S: username}
	        },
	        TableName: "already_recommended"
		}
		db.query(params2, function(err2, data2){
			if (err2) {
				return callback(err2, data2);
			}
			var already_recommended = [];
			for (const i of data2.Items) {
				already_recommended.push(i.articleID.N);
			}
			var today = new Date();
			var recommendations = [];
			var day = today.getDate();
		    if (today.getDate() <= 9) {
			  day = "0" + day;
		    }
		    var month = today.getMonth() + 1;
		    if (today.getMonth() + 1 <= 9) {
		  	  month = "0" + month;
		    }
			var date = today.getFullYear() + "-" + month + "-" + day;
			for (const item of data.Items) {
				if (item.date) {
					if (item.date.S == date) {
						recommendations.push(item);
					}
				}
			}
			recommendations.sort(function(a, b){return (a.score.N).localeCompare(b.score.N);});
			query_recommendations = [];
			var count = 0;
			// Just gets out the top 5 recommendations
			if (recommendations.length) {
				while (query_recommendations.length < 5 && count < recommendations.length) {
					if (recommendations[count].url && !already_recommended.includes(recommendations[count].articleID.N)) {
						query_recommendations.push(recommendations[count]);
					}
					count = count + 1;
				}
			}
			recursiveRecommend(query_recommendations, [], 0, function(err, return_list) {
				callback(err, return_list);
			});
		});
	})
}

// Makes queries for the user and all the user's friends to get their posts from the database for the home page
var recursiveRecommend = function(query_recommendations, return_list, count, callback) {
	if (count >= query_recommendations.length) {
		return callback(null, return_list);
	} else {
		var params = {
      		KeyConditions: {
        		url: {
          			ComparisonOperator: 'EQ',
          			AttributeValueList: [ { S: query_recommendations[count].url.S } ]
        		}
      		},
      		TableName: "articles"
  		};
		db.query(params, function(err, data) {
			if (err) {
				return callback(err, []);
			}
			for (const item of data.Items) {
				return_list.push(item);
			}
			count = count + 1;
			recursiveRecommend(query_recommendations, return_list, count, callback);
		});
	}
}

// Called when a user likes an article, adds this like to the articleLikes table
myDB_articleLike = function(username, articleId, callback) {
	var params = {
		KeyConditionExpression: "username = :u and articleID = :i",
		ExpressionAttributeValues: {
			":u" : {S: username},
			":i" : {N: articleId}
		},
	    TableName: "articleLikes"
	}
	db.query(params, function(err, data) {
		if (data.Items.length) {
			var params2 = {
				Key:{
				  "username": {S: username},
		          "articleID": {N: articleId}
		    	},
		        TableName: "articleLikes"
			};
		    db.deleteItem(params2, function(err, data){
				callback(err, data);
			});
		} else {
			var params2 = {
		        Item: {
		          "username": {S: username},
		          "articleID": {N: articleId}
		        },
		        TableName: "articleLikes"
			};
		    db.putItem(params2, function(err, data){
				callback(err, data);
			});
		}
	})
}

// Gets all of the articles a user has liked
myDB_getLikedArticles = function(username, callback) {
	var params = {
		KeyConditionExpression: "username = :u",
	    ExpressionAttributeValues: {
	      ':u' : {S: username}
	    },
	    TableName: "articleLikes"
	}
	db.query(params, function(err, data) {
		return callback(err, data.Items);
	})
}

// Runs the newsfeed algorithm job
// Note that the commands for the job to run don't work locally, they are there to install maven on EC2
var myDB_runJob = function(callback) {
	// Callback so that the page can load when we refresh interests, even though the job is still running
	callback();
	var exec_string = "cd newsfeed && "
		+ "sudo wget http://repos.fedorapeople.org/repos/dchen/apache-maven/epel-apache-maven.repo -O /etc/yum.repos.d/epel-apache-maven.repo"
		+ " && sudo sed -i s/\\$releasever/6/g /etc/yum.repos.d/epel-apache-maven.repo && sudo yum install -y apache-maven"
		+ " && mvn compile && mvn package && mvn exec:java@loader";
	console.log(exec_string);
	exec(exec_string, (error, stdout, stderr)=> {
		console.log(stdout);
		if (error) {
			console.log(error);
		}
		if (stderr) {
			console.log(error);
		}
		return;
	});
}

var database = {
  getUser: myDB_getUser,
  getInterests: myDB_getInterests,
  addUser: myDB_addUser,
  updateUser: myDB_updateUser,
  updateUserEmail: myDB_updateUserEmail,
  updateUserPassword: myDB_updateUserPassword,
  updateVisibility: myDB_updateVisibility,
  addInterests: addInterests,
  deleteInterests: myDB_deleteInterests,
  statusInterests: myDB_statusInterests,
  updateVisibility: myDB_updateVisibility,
  getUsersByAffiliation: myDB_getUsersByAffiliation,
  getFriends: myDB_getFriends,
  getFriendUsers: myDB_getFriendUsers,
  getVisualizerFriends: myDB_getVisualizerFriends,
  getWall: myDB_getWall,
  getHomePosts: myDB_getHomePosts,
  wallPost: myDB_wallPost,
  comment: myDB_comment,
  getComments: myDB_getComments,
  createFriendship: myDB_createFriendship,
  unfriend: myDB_unfriend,
  setStatus: myDB_setStatus,
  getUsersByName: myDB_getUsersByName,
  createFriendRequest: myDB_createFriendRequest,
  undoFriendRequest: myDB_undoFriendRequest,
  acceptFriendRequest: myDB_acceptFriendRequest,
  rejectFriendRequest: myDB_rejectFriendRequest,
  getFriendRequests: myDB_getFriendRequests,
  getSentFriendRequests: myDB_getSentFriendRequests,
  uploadImage: myDB_uploadImage,
  getImage: myDB_getImage,
  articleSearch: myDB_articleSearch,
  getRecommendations: myDB_getRecommendations,
  refreshRecommendations: myDB_refreshRecommendations,
  articleLike: myDB_articleLike,
  getLikedArticles: myDB_getLikedArticles,
  runJob: myDB_runJob
};

module.exports = database;