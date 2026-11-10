/* One turntable deck. The music plays in YouTube's own player (visible in .screen); this only controls it
   (play/pause/seek/speed/volume) and draws the spinning record, tonearm and position bar around it.
   Scratch = drag the record: the video pauses, you hear our scratch sound, and on release it jumps by
   as much as you turned (one turn = 1.8 s at 33 RPM, like a real record). */
(function () {
  var S = window.TTSfx || {};
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function seed(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }

  window.TTDeck = function (el, hooks) {
    var q = function (s) { return el.querySelector(s); };
    var rec = q('.rec'), arm = q('.arm'), wave = q('.wave'), time = q('.time'), play = q('.play');
    var self = {el: el, player: null, item: null, rpm: 33, playing: false, volume: 100};
    var angle = 0, spin = 0, last = 0, running = false, cueAt = 0, drag = null, bars = [];

    function cover(img, id) {  // big thumbnail if YouTube has one, else the standard one (zoomed past its black bars)
      img.hidden = false; img.classList.remove('hq');
      img.onerror = function () { img.onerror = null; img.classList.add('hq'); img.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; };
      img.src = 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg';
    }
    function drawWave(id) {
      var r = seed(id), html = '';
      bars = [];
      for (var i = 0; i < 72; i++) {
        r = Math.imul(r ^ (r >>> 15), 2246822507) >>> 0;
        var h = 18 + (r % 70) * (0.55 + 0.45 * Math.sin(i / 72 * Math.PI));
        html += '<i style="height:' + h.toFixed(0) + '%"></i>';
      }
      wave.innerHTML = html; bars = wave.children;
    }
    function rate() {
      var want = self.rpm === 45 ? 45 / 33.333 : 1, rates = (self.player && self.player.getAvailablePlaybackRates &&
        self.player.getAvailablePlaybackRates()) || [1];
      return rates.reduce(function (a, b) { return Math.abs(b - want) < Math.abs(a - want) ? b : a; }, 1);
    }
    function tick(t) {
      var dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
      if (!drag) {
        var target = self.playing ? self.rpm * 6 : 0;  // degrees per second
        spin += (target - spin) * Math.min(1, dt * 2.2);
        angle = (angle + spin * dt) % 360;
      }
      rec.style.transform = 'rotate(' + angle + 'deg)';
      var p = self.player, d = p && p.getDuration ? p.getDuration() : 0, c = p && p.getCurrentTime ? p.getCurrentTime() : 0;
      if (d) {
        var n = Math.floor(c / d * bars.length);
        for (var i = 0; i < bars.length; i++) bars[i].classList.toggle('on', i < n);
        time.textContent = fmt(c) + ' / ' + fmt(d);
        wave.setAttribute('aria-valuenow', Math.round(c / d * 100));
      }
      if (self.playing || drag || Math.abs(spin) > 0.5) requestAnimationFrame(tick); else running = false;
    }
    function wake() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(tick); } }

    function state(e) {
      var was = self.playing;
      self.playing = e.data === 1;
      el.classList.toggle('spinning', self.playing);
      play.textContent = self.playing ? '❚❚' : '▶';
      play.setAttribute('aria-label', self.playing ? 'Pause' : 'Play');
      if (self.playing && !was && !drag && S.needle) S.needle();
      var v = self.player.getVideoData ? self.player.getVideoData() : {};
      if (v && v.title && hooks.meta) hooks.meta(self, v.title, v.author || '', self.player.getDuration());
      if (hooks.change) hooks.change();
      wake();
    }

    self.load = function (item, autoplay) {
      self.item = item; el.classList.add('loaded');
      cover(q('.label img'), item.id); cover(q('.sleeve img'), item.id);
      drawWave(item.id);
      hooks.show(self, item);
      hooks.youtube(function () {
        if (self.player) { self.player[autoplay ? 'loadVideoById' : 'cueVideoById'](item.id); return; }
        self.player = new YT.Player(q('.screen div'), {host: 'https://www.youtube-nocookie.com', videoId: item.id,
          width: '100%', height: '100%', playerVars: {playsinline: 1, rel: 0, origin: location.origin},
          events: {onReady: function () { self.player.setVolume(self.volume); if (autoplay) self.player.playVideo(); },
                   onStateChange: state}});
      });
    };
    self.setVolume = function (v) { self.volume = Math.round(v); if (self.player && self.player.setVolume) self.player.setVolume(self.volume); };
    self.toggle = function () {
      if (!self.player || !self.player.getPlayerState) return;
      if (self.playing) self.player.pauseVideo();
      else { cueAt = self.player.getCurrentTime(); self.player.setPlaybackRate(rate()); self.player.playVideo(); }
    };

    play.addEventListener('click', self.toggle);
    q('.cue').addEventListener('click', function () { if (self.player && self.player.seekTo) self.player.seekTo(cueAt, true); });
    el.querySelectorAll('.rpm button').forEach(function (b) {
      b.addEventListener('click', function () {
        self.rpm = Number(b.dataset.rpm);
        el.querySelectorAll('.rpm button').forEach(function (x) { x.classList.toggle('on', x === b); });
        if (self.player && self.player.setPlaybackRate) self.player.setPlaybackRate(rate());
        wake();
      });
    });
    wave.addEventListener('click', function (e) {
      var r = wave.getBoundingClientRect(), d = self.player && self.player.getDuration ? self.player.getDuration() : 0;
      if (d) { self.player.seekTo((e.clientX - r.left) / r.width * d, true); wake(); }
    });

    function at(e) { var r = rec.getBoundingClientRect(); return Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180 / Math.PI; }
    rec.addEventListener('pointerdown', function (e) {
      if (!self.player || !self.player.getCurrentTime) return;
      drag = {a: at(e), turned: 0, t: performance.now(), wasPlaying: self.playing, from: self.player.getCurrentTime()};
      rec.setPointerCapture(e.pointerId); el.classList.add('scratching');
      if (self.playing) self.player.pauseVideo();
      if (S.scratchStart) S.scratchStart();
      wake();
    });
    rec.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var a = at(e), d = ((a - drag.a + 540) % 360) - 180, now = performance.now();
      drag.a = a; drag.turned += d; angle += d;
      if (S.scratchMove) S.scratchMove(d / Math.max(0.008, (now - drag.t) / 1000));
      drag.t = now;
    });
    function release() {
      if (!drag) return;
      var secPerTurn = 60 / self.rpm, to = Math.max(0, drag.from + drag.turned / 360 * secPerTurn), was = drag.wasPlaying;
      drag = null; el.classList.remove('scratching');
      if (S.scratchStop) S.scratchStop();
      self.player.seekTo(to, true);
      if (was) self.player.playVideo();
      wake();
    }
    rec.addEventListener('pointerup', release);
    rec.addEventListener('pointercancel', release);
    rec.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); self.toggle(); } });
    return self;
  };
})();
