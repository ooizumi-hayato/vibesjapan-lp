function toggleNav() {
	const body = document.body;
	const hamburger = document.getElementById("js-hamburger");
	const overlay = document.getElementById("js-overlay");
  
	hamburger.addEventListener("click", function () {
		body.classList.toggle("nav-open");
	});
	overlay.addEventListener("click", function () {
		body.classList.remove("nav-open");
	});

}
toggleNav();


