/* Dig the crate: 3D record crate. Flip with wheel / swipe / arrow keys, pull the front record out onto
   the turntable. Data comes from <script id="crate-data"> written by website/crate.py. */
(function () {
  var root = document.getElementById('crate'), src = document.getElementById('crate-data');
  if (!root || !src) return;
  var items = JSON.parse(src.textContent), S = window.CrateSound || {};
  var box = root.querySelector('.crate-box');
  var stage = root.querySelector('.crate-stage'), count = root.querySelector('.crate-count');
  var sound = root.querySelector('.crate-sound'), player = document.querySelector('.crate-player');
  document.body.appendChild(player);  // out of <main>, so nothing on the page can draw over it
  var disc = player.querySelector('.pl-disc'), c = 0, open = false, rpm = 33, angle = 0, spin = 0, last = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) {
      return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[m];
    });
  }
  function money(n) { return '$' + Number(n).toFixed(2); }
  function face(it) {
    var tag = it.kind === 'release' ? 'Out ' + it.date : it.off ? '−' + it.off + '%' : money(it.price);
    return '<div class="sl-face p' + (it.hue % 4) + '" style="--h:' + it.hue + '"><span class="sl-artist">' +
      esc(it.artist || it.cat) + '</span><span class="sl-title">' + esc(it.title) + '</span><span class="sl-tag">' +
      esc(tag) + '</span></div>';
  }

  var els = items.map(function (it, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sleeve'; b.innerHTML = face(it);
    b.setAttribute('aria-label', (it.artist ? it.artist + ', ' : '') + it.title);
    b.addEventListener('click', function () { if (i === c) pull(); else go(i); });
    box.appendChild(b);
    return b;
  });

  function layout() {
    els.forEach(function (e, i) {
      var d = i - c, t;
      if (d < 0) t = 'translateZ(150px) translateY(60px) rotateX(-78deg)';  // flipped: falls toward you, fades
      else if (d === 0) t = 'translateY(-104px) translateZ(8px) rotateX(-4deg)';
      else t = 'translateZ(' + (-d * 16) + 'px) translateY(' + (-d * 7) + 'px) rotateX(' + (6 + Math.min(d, 6)) + 'deg)';
      e.style.transform = t;
      e.style.opacity = d < 0 ? 0 : 1; e.style.pointerEvents = d < 0 ? 'none' : '';
      e.style.visibility = d < -2 || d > 16 ? 'hidden' : '';
      e.classList.toggle('cur', d === 0);
      e.tabIndex = -1;
    });
    count.textContent = (c + 1) + ' / ' + items.length;
  }
  function go(n) {
    n = Math.max(0, Math.min(items.length - 1, n));
    if (n === c) return;
    c = n; layout(); if (S.flick) S.flick();
  }

  var acc = 0;
  stage.addEventListener('wheel', function (e) {
    if ((e.deltaY > 0 && c === items.length - 1) || (e.deltaY < 0 && c === 0)) return; // let the page scroll on
    e.preventDefault(); acc += e.deltaY;
    if (Math.abs(acc) > 70) { go(c + (acc > 0 ? 1 : -1)); acc = 0; }
  }, {passive: false});
  var ty = null;
  stage.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, {passive: true});
  stage.addEventListener('touchmove', function (e) {
    if (ty === null) return;
    var dy = ty - e.touches[0].clientY;
    if (Math.abs(dy) > 36) { go(c + (dy > 0 ? 1 : -1)); ty = e.touches[0].clientY; }
    e.preventDefault();
  }, {passive: false});
  stage.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight') { go(c + 1); e.preventDefault(); }
    if (k === 'ArrowUp' || k === 'ArrowLeft') { go(c - 1); e.preventDefault(); }
    if (k === 'Enter' || k === ' ') { pull(); e.preventDefault(); }
  });
  root.querySelectorAll('.crate-nav').forEach(function (b) {
    b.addEventListener('click', function () { go(c + Number(b.dataset.step)); });
  });

  function label() { sound.textContent = S.on ? 'Sound on' : 'Sound off'; sound.setAttribute('aria-pressed', S.on); }
  sound.addEventListener('click', function () {
    if (!S.toggle) return;
    S.toggle(); label();
    if (S.on && open) S.play(items[c].hue, rpm);
  });
  label();

  function info(it) {
    var deal = it.kind === 'deal';
    var price = deal ? '<div class="pl-prices"><span class="pl-price">' + money(it.price) + '</span>' +
      (it.old ? '<span class="was">' + money(it.old) + '</span><span class="save">Save ' + money(it.old - it.price) +
      '</span>' : '') + '</div><p class="pl-asof">Price checked ' + esc(it.when) + ', may change</p>'
      : '<p class="pl-out">Out ' + esc(it.date) + '</p>';
    return '<span class="eyebrow">' + esc(it.artist || it.cat) + '</span><h2>' + esc(it.title) + '</h2>' + price +
      '<div class="pl-rpm" role="group" aria-label="Speed"><button type="button" data-rpm="33" class="on">33⅓</button>' +
      '<button type="button" data-rpm="45">45</button></div><div class="pl-acts"><a class="btn" href="' +
      esc(it.amazon) + '" rel="sponsored nofollow noopener">' + (deal ? 'View on Amazon' : 'Pre-order on Amazon') +
      ' →</a><a class="pl-more" href="' + esc(it.url) + '">Details</a></div>';
  }
  function pull() {
    var it = items[c];
    open = true; rpm = 33;
    player.querySelector('.pl-sleeve').innerHTML = face(it);
    player.querySelector('.pl-info').innerHTML = info(it);
    disc.style.setProperty('--h', it.hue);
    player.hidden = false; player.className = 'crate-player';
    player.querySelectorAll('.pl-rpm button').forEach(function (b) {
      b.addEventListener('click', function () {
        rpm = Number(b.dataset.rpm); if (S.setRpm) S.setRpm(rpm);
        player.querySelectorAll('.pl-rpm button').forEach(function (x) { x.classList.toggle('on', x === b); });
      });
    });
    requestAnimationFrame(function () { player.classList.add('open'); });
    setTimeout(function () { if (open) player.classList.add('out'); }, 450);
    setTimeout(function () { if (open) { player.classList.add('arm'); if (S.play) S.play(it.hue, rpm); } }, 1150);
    player.querySelector('.pl-close').focus();
  }
  function close() {
    if (!open) return;
    open = false; if (S.stop) S.stop();
    player.classList.remove('arm', 'out', 'open');
    setTimeout(function () { if (!open) player.hidden = true; }, 600);
    stage.focus();
  }
  player.querySelector('.pl-close').addEventListener('click', close);
  player.addEventListener('click', function (e) { if (e.target === player) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  // Record spin with real spin-up / spin-down (matches the sound's power-down).
  function tick(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    var target = open && player.classList.contains('arm') ? rpm * 6 : 0;   // degrees per second = rpm * 6
    spin += (target - spin) * Math.min(1, dt * 1.6);
    angle = (angle + spin * dt) % 360;
    disc.style.transform = 'rotate(' + angle + 'deg)';
    requestAnimationFrame(tick);
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(tick);
  layout();
})();
