/* Filters for the deals grid and the releases page.
   Slim toolbar: search · segmented tabs (sliding highlight) · "Filters" panel · sort.
   Active filters show as removable chips. Choices are kept in the URL so views can be shared. */
(function () {
  var bars = document.querySelectorAll(".filters");
  if (!bars.length) return;
  var today = new Date(); today.setHours(0, 0, 0, 0);

  function daysUntil(iso) {
    var p = (iso || "").split("-");
    return Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - today) / 864e5);
  }

  var tests = {
    q: function (c, v) { return (c.dataset.title || "").indexOf(v) > -1; },
    cat: function (c, v) { return c.dataset.cat === v; },
    price: function (c, v) { var p = +c.dataset.price, r = v.split("-"); return p >= +r[0] && (r[1] === "" || p < +r[1]); },
    off: function (c, v) { return +c.dataset.off >= +v; },
    when: function (c, v) { var n = daysUntil(c.dataset.date); return v === "out" ? n < 0 : n >= 0 && n <= +v; },
    ed: function (c, v) { return (" " + (c.dataset.ed || "") + " ").indexOf(" " + v + " ") > -1; }
  };
  var sorts = {
    new: function (a, b) { return (b.dataset.posted || "").localeCompare(a.dataset.posted || "") || (+b.dataset.id || 0) - (+a.dataset.id || 0); },
    off: function (a, b) { return +b.dataset.off - +a.dataset.off; },
    lo: function (a, b) { return +a.dataset.price - +b.dataset.price; },
    hi: function (a, b) { return +b.dataset.price - +a.dataset.price; },
    soon: function (a, b) { return (a.dataset.date || "").localeCompare(b.dataset.date || ""); }
  };
  function each(list, fn) { [].forEach.call(list, fn); }

  each(bars, function (bar) {
    var target = document.querySelector(bar.dataset.target);
    if (!target) return;
    bar.hidden = false;
    var empty = bar.nextElementSibling, input = bar.querySelector("[data-f=q]"), select = bar.querySelector("[data-f=sort]");
    var pop = bar.querySelector(".fpop"), btn = bar.querySelector(".fbtn"), badge = bar.querySelector(".fbadge");
    var cards = [].slice.call(target.querySelectorAll(".deal")), total = cards.length, noun = bar.querySelector(".fcount").dataset.noun;
    var defaults = { q: "", sort: select.value }, popKeys = {};
    each(bar.querySelectorAll(".seg.on"), function (b) { defaults[b.dataset.k] = b.dataset.v; });
    each(pop.querySelectorAll(".seg"), function (b) { popKeys[b.dataset.k] = true; });
    var state = Object.assign({}, defaults), url = new URLSearchParams(location.search);
    Object.keys(defaults).forEach(function (k) { if (url.get(k)) state[k] = url.get(k); });

    function label(k, v) {
      if (k === "q") return "“" + v + "”";
      var b = bar.querySelector('.seg[data-k="' + k + '"][data-v="' + v + '"]');
      return b ? b.textContent : v;
    }

    function slide() {
      each(bar.querySelectorAll(".segctl"), function (ctl) {
        var on = ctl.querySelector(".seg.on"), ind = ctl.querySelector(".ind");
        if (!on || !ind) return;
        ind.style.width = on.offsetWidth + "px";
        ind.style.transform = "translateX(" + on.offsetLeft + "px)";
      });
    }

    function apply(fromUser) {
      var shown = 0, q = state.q.toLowerCase().trim();
      cards.forEach(function (c) {
        var ok = Object.keys(tests).every(function (k) {
          var v = k === "q" ? q : state[k];
          return !v || v === "all" || tests[k](c, v);
        });
        var was = c.classList.contains("fhide");
        c.classList.toggle("fhide", !ok);
        if (ok) { shown++; if (fromUser && was) { c.classList.remove("fin"); void c.offsetWidth; c.classList.add("fin"); } }
      });
      var grids = target.classList.contains("grid") ? [target] : target.querySelectorAll(".grid");
      each(grids, function (g) {
        [].slice.call(g.children).sort(sorts[state.sort] || function () { return 0; }).forEach(function (k) { g.appendChild(k); });
      });
      each(target.querySelectorAll(".fsec"), function (s) { s.hidden = !s.querySelector(".deal:not(.fhide)"); });

      each(bar.querySelectorAll(".seg"), function (b) {
        var on = state[b.dataset.k] === b.dataset.v;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      slide();
      if (input.value !== state.q) input.value = state.q;
      select.value = state.sort;

      // chips for everything except the default values (tabs are visible already, so no chip for them)
      var chips = [], nPop = 0;
      Object.keys(state).forEach(function (k) {
        if (k === "sort" || !state[k] || state[k] === defaults[k]) return;
        if (popKeys[k]) nPop++;
        if (k === "q" || popKeys[k]) chips.push('<button type="button" class="chip-x" data-k="' + k + '">' +
          label(k, state[k]).replace(/</g, "&lt;") + '<span aria-hidden="true">×</span></button>');
      });
      bar.querySelector(".fchips").innerHTML = chips.join("");
      badge.hidden = !nPop; badge.textContent = nPop;
      var active = Object.keys(state).some(function (k) { return state[k] !== defaults[k]; });
      bar.classList.toggle("active", active);
      bar.querySelector(".fcount").textContent = shown === total ? total + " " + noun + (total === 1 ? "" : "s")
        : shown + " of " + total + " " + noun + "s";
      bar.querySelector(".fdone").textContent = "Show " + shown + " " + noun + (shown === 1 ? "" : "s");
      if (empty) empty.hidden = shown > 0;

      if (fromUser) {
        var p = new URLSearchParams();
        Object.keys(state).forEach(function (k) { if (state[k] && state[k] !== defaults[k]) p.set(k, state[k]); });
        history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
      }
    }

    function openPop(open) {
      pop.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      requestAnimationFrame(function () { pop.classList.toggle("open", open); });
    }

    bar.addEventListener("click", function (e) {
      var s = e.target.closest(".seg"), x = e.target.closest(".chip-x");
      if (s) { state[s.dataset.k] = s.dataset.v; apply(true); }
      if (x) { state[x.dataset.k] = defaults[x.dataset.k]; apply(true); }
      if (e.target.closest(".fbtn")) openPop(pop.hidden);
      if (e.target.closest(".fdone")) openPop(false);
    });
    document.addEventListener("click", function (e) { if (!pop.hidden && !e.target.closest(".fpop-wrap")) openPop(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) { openPop(false); btn.focus(); } });
    input.addEventListener("input", function () { state.q = input.value; apply(true); });
    select.addEventListener("change", function () { state.sort = select.value; apply(true); });
    each(document.querySelectorAll(".fclear"), function (b) {
      b.addEventListener("click", function () { state = Object.assign({}, defaults); apply(true); });
    });
    window.addEventListener("resize", slide);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(slide);
    apply(false);
  });
})();
