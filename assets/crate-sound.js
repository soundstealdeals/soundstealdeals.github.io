/* Crate sounds, made live with the Web Audio API: no audio files, no copyrighted music.
   flick()      cardboard sleeve flick while digging
   play(hue)    needle drop + crackle + a little lo-fi loop; the key comes from the record's colour
   setRpm(r)    33 or 45: pitch AND tempo change together, like a real turntable
   stop()       power-down: the pitch sinks and fades, like pressing stop
   Off by default; the choice is remembered on this device. */
(function () {
  var ctx = null, on = false, master = null, rpmBus = null, run = null;
  try { on = localStorage.getItem('crateSound') === '1'; } catch (e) {}
  var PROG = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]]; // Imaj7 vi7 IVmaj7 V7
  var CENTS45 = 1200 * Math.log2(45 / 33.333);

  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      var comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0.55;
      master.connect(comp); comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noise(sec, pops) {
    var n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) {
      d[i] = (Math.random() * 2 - 1) * (pops ? 0.02 : 1);
      if (pops && Math.random() < 0.0007) {
        var a = (0.3 + Math.random() * 0.7) * (Math.random() < 0.5 ? -1 : 1);
        for (var k = 0; k < 50 && i + k < n; k++) d[i + k] += a * Math.exp(-k / 5);
      }
    }
    return b;
  }
  function env(g, t, peak, len) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  }
  function burst(t, freq, type, peak, len, out) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(len + 0.02); f.type = type; f.frequency.value = freq; f.Q.value = 0.8;
    env(g, t, peak, len); s.connect(f); f.connect(g); g.connect(out || master); s.start(t); s.stop(t + len + 0.02);
  }

  function flick() {
    if (!on || !ac()) return;
    burst(ctx.currentTime, 1600 + Math.random() * 1800, 'bandpass', 0.3, 0.07);
  }

  function tone(t, midi, len, out) {
    [-7, 7].forEach(function (det) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); o.detune.value = det;
      rpmBus.connect(o.detune); run.wow.connect(o.detune);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.012, t + len * 0.9); g.gain.linearRampToValueAtTime(0, t + len);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05);
    });
  }
  function kick(t, out) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    rpmBus.connect(o.detune); env(g, t, 0.55, 0.32); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
  }

  function schedule() {
    var r = run, speed = r.rpm === 45 ? 45 / 33.333 : 1, beat = 60 / 74 / speed;
    while (r.next < ctx.currentTime + 0.15) {
      var t = r.next, step = r.step, chord = PROG[Math.floor(step / 4) % 4];
      if (step % 4 === 0) chord.forEach(function (n) { tone(t, r.root + n, beat * 4, r.bus); });
      if (step % 4 === 0 || step % 4 === 2 && Math.random() < 0.5) kick(t, r.bus);
      if (step % 4 === 2) burst(t, 1800, 'bandpass', 0.12, 0.09, r.bus);           // soft snare
      burst(t + beat / 2, 7000, 'highpass', 0.05, 0.04, r.bus);                     // off-beat hat
      if (Math.random() < 0.35) tone(t + beat / 2, r.root + 12 + chord[(step + 1) % 4], beat * 0.9, r.bus);
      r.step++; r.next += beat;
    }
  }

  function play(hue, rpm) {
    if (!on || !ac()) return;
    stop(true);
    var t = ctx.currentTime, bus = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1500; bus.connect(lp); lp.connect(master);
    rpmBus = ctx.createConstantSource(); rpmBus.offset.value = rpm === 45 ? CENTS45 : 0; rpmBus.start(t);
    var lfo = ctx.createOscillator(), wow = ctx.createGain(); lfo.frequency.value = 0.55; wow.gain.value = 9;
    lfo.connect(wow); lfo.start(t);
    var cr = ctx.createBufferSource(), cg = ctx.createGain();
    cr.buffer = noise(4, true); cr.loop = true; cg.gain.value = 0.5; cr.connect(cg); cg.connect(bus); cr.start(t);
    burst(t, 380, 'lowpass', 0.5, 0.18, bus);                                         // needle drop
    run = {bus: bus, lp: lp, wow: wow, lfo: lfo, cr: cr, rpm: rpm, root: 48 + (hue % 12), step: 0, next: t + 0.6};
    run.timer = setInterval(schedule, 40);
  }
  function setRpm(rpm) {
    if (!run) return;
    run.rpm = rpm;
    rpmBus.offset.setTargetAtTime(rpm === 45 ? CENTS45 : 0, ctx.currentTime, 0.25);
    run.cr.playbackRate.setTargetAtTime(rpm === 45 ? 1.35 : 1, ctx.currentTime, 0.25);
  }
  function stop(now) {
    if (!run) return;
    var r = run, t = ctx.currentTime, len = now ? 0.05 : 1.4;
    run = null; clearInterval(r.timer);
    rpmBus.offset.cancelScheduledValues(t); rpmBus.offset.setValueAtTime(rpmBus.offset.value, t);
    rpmBus.offset.linearRampToValueAtTime(-2400, t + len);                         // power-down pitch sink
    r.cr.playbackRate.linearRampToValueAtTime(0.2, t + len);
    r.lp.frequency.exponentialRampToValueAtTime(200, t + len);
    r.bus.gain.setValueAtTime(1, t); r.bus.gain.linearRampToValueAtTime(0, t + len);
    setTimeout(function () { try { r.cr.stop(); r.lfo.stop(); r.bus.disconnect(); } catch (e) {} }, len * 1000 + 100);
  }
  function toggle() {
    on = !on;
    try { localStorage.setItem('crateSound', on ? '1' : '0'); } catch (e) {}
    if (on) ac(); else stop();
    return on;
  }
  window.CrateSound = {flick: flick, play: play, setRpm: setRpm, stop: stop, toggle: toggle,
                       get on() { return on; }, get playing() { return !!run; }};
})();
