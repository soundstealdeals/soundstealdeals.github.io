/* Theme switch, glass header on scroll, scroll-reveal animations. No tracking. */
(function () {
  var root = document.documentElement;

  var btn = document.querySelector(".theme");
  if (btn) btn.addEventListener("click", function () {
    var next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    btn.setAttribute("aria-label", next === "dark" ? "Switch to light mode" : "Switch to dark mode");
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  var top = document.querySelector(".top");
  function onScroll() { if (top) top.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var items = [].slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  // Release countdowns: recompute from the visitor's clock so they never go stale.
  var today = new Date(); today.setHours(0, 0, 0, 0);
  [].slice.call(document.querySelectorAll("[data-release]")).forEach(function (el) {
    var p = el.dataset.release.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var n = Math.round((d - today) / 864e5);
    var t = n > 1 ? "in " + n + " days" : n === 1 ? "tomorrow" : n === 0 ? "out today" : "out now";
    el.textContent = el.classList.contains("countdown") ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  });

  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add("ready"); });
  });
})();
