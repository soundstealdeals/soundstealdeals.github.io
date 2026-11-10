/* Turntable page: paste a YouTube link -> a record on deck A (or the free deck in Mix mode). The records
   list is saved on this device (localStorage, max 30). YouTube's player script loads only after the
   first link is added. The "Find it on vinyl" button is an Amazon search link with the site's tag. */
(function () {
  var root = document.getElementById('tt');
  if (!root || !window.TTDeck) return;
  var S = window.TTSfx || {}, tag = root.dataset.tag, KEY = 'ttRecords';
  var list = root.querySelector('.tracks-list'), msg = root.querySelector('.press-msg'), records = [], waiting = [];
  try { records = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(records.slice(0, 30))); } catch (e) {} }

  function parseId(text) {
    var m = String(text || '').trim().match(/(?:youtu\.be\/|[?&]v=|\/(?:shorts|embed|live|v)\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(String(text).trim()) ? String(text).trim() : null);
  }
  function youtube(cb) {
    if (window.YT && window.YT.Player) return cb();
    waiting.push(cb);
    if (waiting.length > 1) return;
    window.onYouTubeIframeAPIReady = function () { waiting.splice(0).forEach(function (f) { f(); }); };
    var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s);
  }
  // "Artist - Song (Official Video)" by "ArtistVEVO" -> artist + song, for the vinyl search.
  function names(item) {
    var t = (item.title || '').replace(/[(\[][^)\]]*(official|video|audio|lyric|visuali[sz]er|remaster|hd|4k|live)[^)\]]*[)\]]/gi, '')
      .replace(/\s+/g, ' ').trim();
    var a = (item.author || '').replace(/vevo$/i, '').replace(/\s*-\s*topic$/i, '').replace(/official/i, '').trim();
    var parts = t.split(/\s+[-–—]\s+/);
    if (parts.length > 1) { a = parts[0]; t = parts.slice(1).join(' - '); }
    return {artist: a, song: t};
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[m]; }); }

  function show(deck, item) {
    var n = names(item), buy = deck.el.querySelector('.buy');
    deck.el.querySelector('.t-title').textContent = n.song || 'Loading…';
    deck.el.querySelector('.t-artist').textContent = n.artist || 'YouTube';
    if (tag && (n.artist || n.song)) {
      buy.href = 'https://www.amazon.com/s?k=' + encodeURIComponent((n.artist + ' ' + n.song + ' vinyl').trim()) + '&tag=' + encodeURIComponent(tag);
      buy.hidden = false;
    }
    render();
  }
  function meta(deck, title, author, dur) {
    var r = records.find(function (x) { return x.id === deck.item.id; });
    if (r && (r.title !== title || !r.dur)) { r.title = title; r.author = author; r.dur = dur; save(); }
    deck.item.title = title; deck.item.author = author; show(deck, deck.item);
  }
  function mix() {
    var x = Number(root.querySelector('.xfade').value) / 100, spinMode = root.dataset.mode === 'spin';
    A.setVolume(spinMode ? 100 : Math.cos(x * Math.PI / 2) * 100);   // equal-power crossfade
    B.setVolume(spinMode ? 0 : Math.sin(x * Math.PI / 2) * 100);
    if (spinMode && B.playing) B.toggle();
    S.crackle && S.crackle(root.querySelector('.crackle input').checked && (A.playing || B.playing));
  }
  var hooks = {youtube: youtube, show: show, meta: meta, change: mix};
  var A = window.TTDeck(root.querySelector('#deckA'), hooks), B = window.TTDeck(root.querySelector('#deckB'), hooks);

  function render() {
    var mixMode = root.dataset.mode === 'mix';
    list.innerHTML = records.map(function (r, i) {
      var on = (A.item && A.item.id === r.id ? ' a' : '') + (B.item && B.item.id === r.id && mixMode ? ' b' : '');
      var dur = r.dur ? Math.floor(r.dur / 60) + ':' + ('0' + Math.floor(r.dur % 60)).slice(-2) : '';
      return '<li class="trk' + on + '" data-i="' + i + '"><span class="n">' + ('0' + (i + 1)).slice(-2) + '</span>' +
        '<img src="https://i.ytimg.com/vi/' + r.id + '/default.jpg" alt="" loading="lazy">' +
        '<span class="tt-name"><b>' + esc(names(r).song || 'New record') + '</b><small>' + esc(names(r).artist) + '</small></span>' +
        '<span class="dur">' + dur + '</span>' + (mixMode ? '<button type="button" data-to="A">A</button><button type="button" data-to="B">B</button>' : '') +
        '<button type="button" class="rm" aria-label="Remove">×</button></li>';
    }).join('');
    root.querySelector('.empty-list').hidden = records.length > 0;
    root.querySelector('.count').textContent = records.length ? records.length + ' record' + (records.length > 1 ? 's' : '') : '';
  }
  list.addEventListener('click', function (e) {
    var li = e.target.closest('.trk'); if (!li) return;
    var r = records[Number(li.dataset.i)];
    if (e.target.classList.contains('rm')) { records.splice(Number(li.dataset.i), 1); save(); render(); return; }
    (e.target.dataset.to === 'B' ? B : A).load(Object.assign({}, r), true);
  });
  root.querySelector('.press').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = root.querySelector('#tt-url'), id = parseId(input.value);
    if (!id) { msg.textContent = 'That doesn’t look like a YouTube link. Try one like https://youtu.be/…'; return; }
    msg.textContent = 'Pressing your record…';
    var r = records.find(function (x) { return x.id === id; }) || {id: id};
    records = [r].concat(records.filter(function (x) { return x.id !== id; })); save();
    var deck = root.dataset.mode === 'mix' && A.item && !B.item ? B : A;
    deck.load(Object.assign({}, r), true);
    input.value = ''; setTimeout(function () { msg.textContent = ''; }, 1800);
  });
  root.querySelectorAll('.modes button').forEach(function (b) {
    b.addEventListener('click', function () {
      root.dataset.mode = b.dataset.mode;
      root.querySelectorAll('.modes button').forEach(function (x) { x.classList.toggle('on', x === b); });
      render(); mix();
    });
  });
  root.querySelector('.xfade').addEventListener('input', mix);
  root.querySelector('.crackle input').addEventListener('change', mix);
  render();
  window.TT = {parseId: parseId, names: names, A: A, B: B};  // for testing in the browser
})();
