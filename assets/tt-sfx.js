/* Turntable sound effects, made live with Web Audio (no files): vinyl crackle under the music, a needle
   drop, and the scratch sound while you drag a record. The music itself plays in YouTube's player. */
(function () {
  var ctx = null, crackle = null, scr = null;

  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noise(sec, pops) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) {
      d[i] = (Math.random() * 2 - 1) * (pops ? 0.02 : 1);
      if (pops && Math.random() < 0.0006) {
        var a = (0.3 + Math.random() * 0.7) * (Math.random() < 0.5 ? -1 : 1);
        for (var k = 0; k < 50 && i + k < n; k++) d[i + k] += a * Math.exp(-k / 5);
      }
    }
    return b;
  }

  function setCrackle(on) {
    if (!on) {
      if (crackle) { crackle.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2); var c = crackle; crackle = null;
        setTimeout(function () { try { c.s.stop(); } catch (e) {} }, 800); }
      return;
    }
    if (crackle || !ac()) return;
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(4, true); s.loop = true; f.type = 'lowpass'; f.frequency.value = 5000;
    g.gain.value = 0; g.gain.setTargetAtTime(0.35, ctx.currentTime, 0.3);
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start();
    crackle = {s: s, g: g};
  }

  function needle() {
    if (!ac()) return;
    var t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(0.25); f.type = 'lowpass'; f.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(t); s.stop(t + 0.25);
  }

  // Scratch: filtered noise whose pitch and loudness follow how fast the record is moved.
  function scratchStart() {
    if (scr || !ac()) return;
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(2); s.loop = true; f.type = 'bandpass'; f.Q.value = 6; f.frequency.value = 600; g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(ctx.destination); s.start();
    scr = {s: s, f: f, g: g};
  }
  function scratchMove(speed) {  // speed in degrees per second
    if (!scr) return;
    var v = Math.min(1, Math.abs(speed) / 900), t = ctx.currentTime;
    scr.f.frequency.setTargetAtTime(300 + v * 2600, t, 0.02);
    scr.g.gain.setTargetAtTime(v * 0.55, t, 0.02);
  }
  function scratchStop() {
    if (!scr) return;
    var s = scr; scr = null;
    s.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(function () { try { s.s.stop(); } catch (e) {} }, 300);
  }

  window.TTSfx = {crackle: setCrackle, needle: needle, scratchStart: scratchStart, scratchMove: scratchMove,
                  scratchStop: scratchStop};
})();
