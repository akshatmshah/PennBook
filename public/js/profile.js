// Autofills the affiliation and email fields by getting them from the database and also preserves upon unsuccessful form submission
$(document).ready(function(){
	$.get("/setstate", function (data) {
		if (data.affiliation !== undefined) {
			document.getElementById("affiliation").value = data.affiliation;
		}
		if (data.email !== undefined) {
			document.getElementById("email").value = data.email;
		}
		return;
	});
});