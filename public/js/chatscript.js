var socket = io();
var id = "aishaola";
var chat_id = window.location.href.split('id=')[1];

// Called whenever a chat is sent, emits to socket and posts to the database
function sendChat() {
    if ($('#input').val().trim() !== '') {
        const date = new Date(Date.now());
        const timestamp_str = ("00" + (date.getMonth() + 1)).slice(-2) + "/" +
            ("00" + date.getDate()).slice(-2) + "/" +
            date.getFullYear() + " " +
            ("00" + date.getHours()).slice(-2) + ":" +
            ("00" + date.getMinutes()).slice(-2) + ":" +
            ("00" + date.getSeconds()).slice(-2);

        var messageObj = {
            content: $('#input').val().trim(),
            sender: $('#username').text(),
            username: $('#user').text(),
            datetime: timestamp_str,
            room: chat_id,
        }

        $.post("/postMessage", messageObj, function (data, status) {
            if (!data.error) {
                socket.emit('chat message', messageObj);
                $('#input').val('');
                $('#input').focus();
            }
        });
    }
};

$(document).ready(function () {
    socket.emit("join room", {
        sender: id,
        room: chat_id
    });

    // Adds new chat messages to the chat window
    socket.on("chat message", function (msg) {
        var loaded = $("#chatbox").html();
        if ($('#user').text() == msg.username) {
            loaded = loaded + "<div>";
            loaded = loaded + "<article class='message is-info sent'>";
            loaded = loaded + "<div class='message-header'>";
            loaded = loaded + "<figure class='image is-rounded is-48x48'>"
            loaded = loaded + "<img class=\"is-rounded\" src=\"https://g29profilepictures.s3.amazonaws.com/" + msg.username.trim() + "\" onerror=\"this.onerror=null; this.src='https://g29profilepictures.s3.amazonaws.com/default.jpg'\">"
            loaded = loaded + "</figure>"
            loaded = loaded + msg.sender;
            loaded = loaded + "</div>";
            loaded = loaded + "<div class='message-body'>"
            loaded = loaded + msg.content;
            loaded = loaded + "</div>";
            loaded = loaded + "</article>";
            loaded = loaded + "<div class='clear mt-0 pt-0'>"
            loaded = loaded + "<p class='message-date mt-neg'>" + msg.datetime + "</p>"
            loaded = loaded + "</div>";
            loaded = loaded + "</div>";
            console.log(loaded);
        } else {
            loaded = loaded + "<div>";
            loaded = loaded + "<article class='message is-success recieve'>";
            loaded = loaded + "<div class='message-header'>";
            loaded = loaded + "<figure class='image is-rounded is-48x48'>"
            loaded = loaded + "<img class='is-rounded ' src=\"https://g29profilepictures.s3.amazonaws.com/" + msg.username.trim() + "\" onerror=\"this.onerror=null; this.src='https://g29profilepictures.s3.amazonaws.com/default.jpg'\">"
            loaded = loaded + "</figure>"
            loaded = loaded + msg.sender;
            loaded = loaded + "</div>";
            loaded = loaded + "<div class='message-body'>"
            loaded = loaded + msg.content;
            loaded = loaded + "</div>";
            loaded = loaded + "</article>";
            loaded = loaded + "<div class='clear mt-0 pt-0'>"
            loaded = loaded + "<p class='recieve-date mt-neg'>" + msg.datetime + "</p>"
            loaded = loaded + "</div>";
            loaded = loaded + "</div>";
        }
        if ($('#user').text() == msg.username) {
            $('#chatbox').html(loaded);
        } else {
            $('#chatbox').html(loaded);
        }

    });

    // Allows users to send chats using the enter key
    var input = document.getElementById("input");
    input.addEventListener("keypress", function (event) {
        if (event.keyCode === 13) {
            // Cancel the default action
            event.preventDefault();
            document.getElementById("formSubmit").click();
        }
    });
});