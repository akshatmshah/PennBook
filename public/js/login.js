// If login form is submitted unsuccessfully, repopulate the fields from the form so the user doesn't have to retype them
$(document).ready(function(){
	$.get("/getstate", function (data) {
		if (data.username !== undefined) {
			document.getElementById("username").value = data.username;
		}
		if (data.password !== undefined) {
			document.getElementById("password").value = data.password;
		}
		return;
	});
});