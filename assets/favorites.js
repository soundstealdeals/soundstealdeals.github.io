/* Favorites: saved in this browser only (localStorage), no account, nothing is sent anywhere.
   Hearts start hidden in the HTML; this script shows them, so without JS nothing looks broken. */
(function () {
  var KEY = "favs", memory = [];
  function load() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return memory.slice(); }
  }
  function save(list) {
    memory = list.slice();
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }
  function has(key) { return load().indexOf(key) > -1; }
  function toggle(key) {
    var list = load(), i = list.indexOf(key);
    if (i > -1) list.splice(i, 1); else list.unshift(key);
    save(list);
    return i === -1;
  }
  function each(sel, fn) { [].forEach.call(document.querySelectorAll(sel), fn); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }

  function paint() {
    var n = load().length;
    each(".fav", function (b) {
      var on = has(b.dataset.fav), t = b.querySelector(".fav-t");
      b.hidden = false;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", (on ? "Remove from" : "Save to") + " favorites");
      if (t) t.textContent = on ? "Saved" : "Save";
    });
    each(".favlink", function (a) {
      var c = a.querySelector(".favn");
      a.hidden = false;
      a.setAttribute("aria-label", "Favorites (" + n + ")");
      c.hidden = !n; c.textContent = n > 99 ? "99+" : n;
    });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest(".fav");
    if (!b) return;
    e.preventDefault();
    var added = toggle(b.dataset.fav);
    b.classList.remove("pop"); void b.offsetWidth; if (added) b.classList.add("pop");
    var card = b.closest(".fav-card");
    if (card && !added) { card.classList.add("gone"); setTimeout(render, 280); }
    paint();
  });
  window.addEventListener("storage", function (e) { if (e.key === KEY) { paint(); render(); } });

  /* ---------- favorites.html ---------- */
  var box = document.getElementById("fav-list"), items = null;
  var liveMs = (+(box && box.dataset.liveDays) || 7) * 864e5;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
  var HEART = (document.querySelector(".favlink svg") || {}).outerHTML || "♥";

  function daysUntil(iso) { var p = iso.split("-"); return Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - today) / 864e5); }
  function when(n) { return n > 1 ? "in " + n + " days" : n === 1 ? "tomorrow" : n === 0 ? "out today" : "out now"; }
  function checked(iso) {
    var d = new Date(iso), p = function (x) { return (x < 10 ? "0" : "") + x; };
    return MONTHS[d.getUTCMonth()] + " " + p(d.getUTCDate()) + ", " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " UTC";
  }
  function money(v) { return "$" + (+v).toFixed(2); }

  function card(it) {
    var key = it.kind + ":" + it.id, live = it.kind === "deal" && it.price != null && Date.now() - Date.parse(it.date) <= liveMs;
    var info, amazon = "";
    if (it.kind === "release") {
      var p = it.date.split("-"), n = daysUntil(it.date);
      info = '<span class="rdate"><b>' + MONTHS[+p[1] - 1] + " " + +p[2] + ", " + p[0] + "</b> · <span>" + when(n) + "</span></span>";
      amazon = '<a class="btn" href="' + esc(it.amazon) + '" rel="sponsored nofollow noopener">' + (n > 0 ? "Pre-order" : "Buy") + " on Amazon →</a>";
    } else if (live) {
      var off = it.old_price > it.price ? Math.round((1 - it.price / it.old_price) * 100) : 0;
      info = '<div class="prices"><span class="price">' + money(it.price) + "</span>" +
        (off ? '<span class="was">' + money(it.old_price) + '</span><span class="save">−' + off + "%</span>" : "") +
        '</div><span class="asof">Price checked ' + checked(it.date) + "; it may have changed.</span>";
      amazon = '<a class="btn" href="' + esc(it.amazon) + '" rel="sponsored nofollow noopener">View on Amazon →</a>';
    } else {
      info = '<span class="ended-tag">Deal ended</span><p class="note">Prices change fast. Open the page to check today\'s price.</p>';
    }
    return '<article class="deal fav-card' + (it.kind === "deal" && !live ? " ended" : "") + '">' +
      '<div class="art" style="--hue:' + (+it.hue || 0) + '" aria-hidden="true"><div class="label"></div></div><div class="body">' +
      '<span class="r-artist">' + esc(it.kind === "release" ? it.artist || "New release" : "Deal") + "</span>" +
      '<h3><a class="stretch" href="' + esc(it.url) + '">' + esc(it.title) + "</a></h3>" + info +
      '<div class="meta"><span class="more">Details →</span><span class="acts"><button type="button" class="fav" data-fav="' +
      key + '" aria-pressed="true">' + HEART + "</button>" + amazon + "</span></div></div></article>";
  }

  function section(title, list) {
    return list.length ? '<section><div class="section-title"><h2>' + title + "</h2><span>" + list.length + " saved</span></div>" +
      '<div class="grid">' + list.map(card).join("") + "</div></section>" : "";
  }

  function render() {
    if (!box || !items) return;
    var byKey = {};
    items.forEach(function (it) { byKey[it.kind + ":" + it.id] = it; });
    var keys = load(), known = keys.filter(function (k) { return byKey[k]; });
    if (known.length !== keys.length) save(known); // drop items that were removed from the site
    var saved = known.map(function (k) { return byKey[k]; });
    var deals = saved.filter(function (it) { return it.kind === "deal"; });
    var rels = saved.filter(function (it) { return it.kind === "release"; });
    box.innerHTML = saved.length ? section("Deals", deals) + section("Releases", rels) :
      '<div class="empty">No favorites yet. Tap the heart on any <a href="index.html">deal</a> or ' +
      '<a href="releases.html">release</a> to save it here.</div>';
    paint();
  }

  if (box) {
    box.innerHTML = '<div class="empty">Loading your favorites…</div>';
    fetch(box.dataset.src).then(function (r) { return r.json(); })
      .then(function (data) { items = data.items || []; render(); })
      .catch(function () { box.innerHTML = '<div class="empty">Couldn\'t load your favorites. Please refresh the page.</div>'; });
  }
  paint();
})();
