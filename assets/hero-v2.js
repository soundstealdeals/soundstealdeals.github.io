/* Hero "v2" (default): 3D tilt that follows the mouse + chip cycling through live deals. */
(function () {
  var art = document.querySelector(".hero-art.v2");
  if (!art) return;
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tilt = art.querySelector(".tilt");
  if ("IntersectionObserver" in window) {  // pause every hero animation while it's off screen
    new IntersectionObserver(function (es) { art.classList.toggle("paused", !es[0].isIntersecting); }).observe(art);
  }

  if (!calm && tilt && window.matchMedia("(pointer: fine)").matches) {
    art.addEventListener("mousemove", function (e) {
      var r = art.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.setProperty("--rx", (-y * 12).toFixed(2) + "deg");
      tilt.style.setProperty("--ry", (x * 14).toFixed(2) + "deg");
      tilt.style.setProperty("--sheen", (x * 40).toFixed(1) + "deg");
    });
    art.addEventListener("mouseleave", function () {
      ["--rx", "--ry", "--sheen"].forEach(function (k) { tilt.style.setProperty(k, "0deg"); });
    });
  }

  var chip = art.querySelector(".chip-cycle");
  if (!chip) return;
  var deals = [];
  try { deals = JSON.parse(chip.dataset.deals || "[]"); } catch (e) {}
  if (deals.length < 2 || calm) return;
  var i = 0, off = chip.querySelector(".chip-off"), t = chip.querySelector(".t"), idx = chip.querySelector(".idx");
  setInterval(function () {
    chip.classList.add("out");
    setTimeout(function () {
      i = (i + 1) % deals.length;
      off.textContent = "−" + deals[i].off + "%";
      t.textContent = deals[i].t;
      idx.textContent = (i + 1) + "/" + deals.length;
      chip.classList.remove("out");
    }, 380);
  }, 3400);
})();
