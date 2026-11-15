// Casual side: desktop-style windows (open from the icons, drag by the title bar, close with [x] or Esc),
// YouTube thumbnails that turn into players, click sounds and the photo easter egg.
(function () {
  try { localStorage.setItem('jv-mode', 'casual'); } catch (e) { /* private mode */ }

  let topZ = 100;
  const small = () => window.matchMedia('(max-width: 820px)').matches;

  // --- tiny "pop" click sound, made with WebAudio (no audio files) ---
  let soundOn = localStorage.getItem('sound') !== 'off';
  let ctx;
  function pop(freq) {
    if (!soundOn) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(freq * 1.8, ctx.currentTime + 0.06);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.13);
    } catch (e) { /* sound is optional */ }
  }
  const soundBtn = document.getElementById('sound-btn');
  const paintSound = () => soundBtn.setAttribute('aria-pressed', String(soundOn));
  paintSound();
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    localStorage.setItem('sound', soundOn ? 'on' : 'off');
    paintSound(); pop(520);
  });

  function front(win) { win.style.zIndex = ++topZ; }

  function openWin(id) {
    const win = document.getElementById(id);
    if (!win || !win.classList.contains('win')) return;
    if (win.hidden) {
      win.hidden = false;
      win.dataset.x = 0; win.dataset.y = 0;
      place(win);
      win.classList.remove('pop'); void win.offsetWidth; win.classList.add('pop');
      document.dispatchEvent(new CustomEvent('win:open', { detail: id }));
    }
    front(win);
    pop(420);
    if (small()) document.body.style.overflow = 'hidden';
    win.querySelector('.x').focus({ preventScroll: true });
    history.replaceState(null, '', '#' + id);
  }

  function closeWin(win) {
    win.hidden = true;
    stopVideos(win);
    document.dispatchEvent(new CustomEvent('win:close', { detail: win.id }));
    pop(300);
    if (!document.querySelector('.win:not([hidden])')) {
      document.body.style.overflow = '';
      history.replaceState(null, '', location.pathname);
    }
  }

  function place(win) {
    if (small()) { win.style.transform = ''; return; }
    win.style.transform = `translate(calc(-50% + ${win.dataset.x}px), calc(-50% + ${win.dataset.y}px))`;
  }

  document.querySelectorAll('[data-open]').forEach(el =>
    el.addEventListener('click', e => { e.preventDefault(); openWin(el.dataset.open); }));

  document.querySelectorAll('.win').forEach(win => {
    win.addEventListener('pointerdown', () => front(win));
    win.querySelector('.x').addEventListener('click', () => closeWin(win));

    // drag by the title bar (desktop only)
    const bar = win.querySelector('.win-bar');
    bar.addEventListener('pointerdown', e => {
      if (small() || e.target.closest('.x')) return;
      bar.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY;
      const ox = +win.dataset.x || 0, oy = +win.dataset.y || 0;
      const move = ev => {
        win.dataset.x = ox + ev.clientX - sx;
        win.dataset.y = oy + ev.clientY - sy;
        place(win);
      };
      const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
    });
  });

  // Esc closes the window on top
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.win:not([hidden])')];
    if (!open.length) return;
    open.sort((a, b) => (+b.style.zIndex || 0) - (+a.style.zIndex || 0));
    closeWin(open[0]);
  });

  // --- YouTube: show the thumbnail, load the real player only when clicked ---
  document.querySelectorAll('.yt').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.id}?autoplay=1&rel=0`;
      f.title = btn.getAttribute('aria-label') || 'YouTube video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.dataset.id = btn.dataset.id;
      f._thumb = btn;
      btn.replaceWith(f);
      pop(420);
    });
  });
  // closing a window stops its videos (puts the thumbnails back) so nothing keeps playing out of sight
  function stopVideos(win) {
    win.querySelectorAll('iframe').forEach(f => { if (f._thumb) f.replaceWith(f._thumb); });
  }

  // links like yoursite/casual/#mods open that window, on load or when only the #part changes
  const fromHash = () => {
    const id = location.hash.slice(1);
    if (id && document.getElementById(id)?.classList.contains('win')) openWin(id);
  };
  fromHash();
  window.addEventListener('hashchange', fromHash);

  // easter egg: double-click the photo for the real me
  const photo = document.querySelector('.sticker');
  if (photo) {
    const img = photo.querySelector('img');
    const real = { src: img.src, alt: img.alt };
    new Image().src = '../img/vince-irl.webp'; // preload so the swap is instant
    let timer;
    photo.addEventListener('dblclick', () => {
      clearTimeout(timer);
      img.src = '../img/vince-irl.webp';
      img.alt = 'The real me after finals week';
      photo.classList.remove('irl'); void photo.offsetWidth; photo.classList.add('irl');
      pop(220);
      timer = setTimeout(() => {
        img.src = real.src; img.alt = real.alt;
        photo.classList.remove('irl');
      }, 3500);
    });
  }
})();
