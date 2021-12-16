// Used to refill form content if the form submissionw as unsuccessful
$(document).ready(function(){
	$.get("/getstate", function (data) {
		if (data.username !== undefined) {
			document.getElementById("username").value = data.username;
		}
		if (data.password !== undefined) {
			document.getElementById("password").value = data.password;
		}
		if (data.first !== undefined) {
			document.getElementById("first").value = data.first;
		}
		if (data.last !== undefined) {
			document.getElementById("last").value = data.last;
		}
		if (data.birthday !== undefined) {
			document.getElementById("birthday").value = data.birthday;
		}
		if (data.email !== undefined) {
			document.getElementById("email").value = data.email;
		}
		if (data.affiliation !== undefined) {
			document.getElementById("affiliation").value = data.affiliation;
		}
		return;
	});
});