// Doubling Pong, browser edition: a port of my Python + OpenGL GPU stress test.
// Every ball that reaches a paddle is sent back as two, until the device can't keep up.
// Same maths as the desktop version: each ball is aimed so it lands exactly on the other
// paddle's future position, and its position is worked out from its launch, so only the
// balls that reach a paddle need any work.
(function () {
  const canvas = document.getElementById('pong');
  if (!canvas) return;
  const g = canvas.getContext('2d', { alpha: false });
  const $ = id => document.getElementById(id);
  const ui = {
    start: $('pong-start'), reset: $('pong-reset'), balls: $('pong-balls'), hits: $('pong-hits'),
    fps: $('pong-fps'), status: $('pong-status'), best: $('pong-best'),
  };

  // world units (same as the desktop version)
  const W = 1600, H = 900, L = 40, R = W - 40, D = R - L, PH = 18, SPEED = 1200, VP = 400, PHI = 0.6180339887;
  const MAX = 1 << 20;        // never more than 1,048,576 balls
  const SLOW_FPS = 40;        // stay under this for half a second and the doubling stops
  const FADE = 205;           // trail: each frame keeps 205/256 of the last one

  // the picture is drawn pixel by pixel into one image, then copied to the canvas
  const CW = canvas.width, CH = canvas.height, SX = CW / W, SY = CH / H, ROW = CW * 4;
  const img = g.createImageData(CW, CH), px = img.data;
  const clear = () => new Uint32Array(px.buffer).fill(0xff000000);   // opaque black

  // ball colour by generation, like the desktop shader
  const PAL = 100, PR = new Uint8Array(PAL), PG = new Uint8Array(PAL), PB = new Uint8Array(PAL);
  let palAl = -1;
  function palette(al) {
    const ch = (h, o) => {
      const v = Math.abs(((h + o) % 1) * 6 - 3) - 1;
      return 0.3 + 0.7 * Math.min(1, Math.max(0, v));
    };
    for (let k = 0; k < PAL; k++) {
      const h = (k * 0.09 + 0.55) % 1;
      PR[k] = 255 * al * ch(h, 1); PG[k] = 255 * al * ch(h, 2 / 3); PB[k] = 255 * al * ch(h, 1 / 3);
    }
    palAl = al;
  }

  // balls, one typed array per field
  let cap = 0, n = 0;
  let X0, Y0, VX, VY, T0, TH, GEN;
  function grow(size) {
    const keep = (A, B) => { if (A) B.set(A.subarray(0, n)); return B; };
    X0 = keep(X0, new Float64Array(size)); Y0 = keep(Y0, new Float64Array(size));
    VX = keep(VX, new Float64Array(size)); VY = keep(VY, new Float64Array(size));
    T0 = keep(T0, new Float64Array(size)); TH = keep(TH, new Float64Array(size));
    GEN = keep(GEN, new Uint32Array(size));
    cap = size;
  }

  // a point bouncing between 0 and H at constant speed
  const fold = u => { const k = Math.floor(u / H); return (k & 1) ? (k + 1) * H - u : u - k * H; };
  const padL = t => fold(0.2 * H + VP * t);
  const padR = t => fold(0.7 * H - 1.25 * VP * t);

  // aim ball i from a paddle so it arrives exactly where the other paddle will be
  const cand = new Float64Array(18), ord = new Int8Array(18);
  function launch(i, th, xe, y0, dir, gen, c) {
    const T = D / SPEED * (0.8 + 0.5 * (((gen * 2 + c + 1) * PHI) % 1));
    const tgt = dir > 0 ? padR(th + T) : padL(th + T);
    for (let m = -4, j = 0; m <= 4; m++) {
      cand[j++] = (tgt + m * 2 * H - y0) / T;
      cand[j++] = (-tgt + m * 2 * H - y0) / T;
    }
    for (let a = 0; a < 18; a++) ord[a] = a;
    for (let a = 1; a < 18; a++) {           // sort by speed; ties keep their order
      const v = ord[a], key = Math.abs(cand[v]);
      let b = a - 1;
      while (b >= 0 && Math.abs(cand[ord[b]]) > key) { ord[b + 1] = ord[b]; b--; }
      ord[b + 1] = v;
    }
    X0[i] = xe; Y0[i] = y0; VX[i] = dir * D / T; VY[i] = cand[ord[c + 2 * (gen & 1)]];
    T0[i] = th; TH[i] = th + T; GEN[i] = gen;
  }

  let simT = 0, hits = 0, limited = false, why = '', slow = 0;
  let best = 0;
  try { best = +(localStorage.getItem('pong-best') || 0); } catch (e) { /* private mode */ }
  const flashes = [];

  function restart() {
    if (!cap) grow(1024);
    n = 1; hits = 0; simT = 0; limited = false; why = ''; slow = 0; flashes.length = 0;
    launch(0, 0, L, padL(0), 1, 0, 0);
    clear();
  }

  function stopDoubling(reason) {
    if (limited) return;
    limited = true; why = reason;
    saveBest();
  }

  function step(dt) {
    simT += dt;
    const t = simT, n0 = n;
    for (let i = 0; i < n0; i++) {
      if (TH[i] > t) continue;
      const th = TH[i], right = VX[i] > 0;
      const y = right ? padR(th) : padL(th);
      const xe = right ? R : L, dir = right ? -1 : 1, gen = GEN[i] + 1;
      hits++;
      if (flashes.length < 60) flashes.push({ x: xe, y, life: 1 });
      if (!limited && n === cap) { if (cap < MAX) grow(cap * 2); else stopDoubling('cap'); }
      if (!limited) { launch(n, th, xe, y, dir, gen, 1); n++; }
      launch(i, th, xe, y, dir, gen, 0);
    }
    if (n > best) best = n;
  }

  function addRect(x0, x1, yc, r, gg, b) {
    const cx0 = Math.max(0, Math.floor(x0 * SX)), cx1 = Math.min(CW - 1, Math.ceil(x1 * SX));
    const cy0 = Math.max(0, Math.floor((yc - PH) * SY)), cy1 = Math.min(CH - 1, Math.ceil((yc + PH) * SY));
    for (let y = cy0; y <= cy1; y++) {
      for (let x = cx0, o = (y * CW + cx0) * 4; x <= cx1; x++, o += 4) { px[o] += r; px[o + 1] += gg; px[o + 2] += b; }
    }
  }

  function draw(dt) {
    // fade the last frame: that's the trails
    for (let p = 0, len = px.length; p < len; p += 4) {
      px[p] = (px[p] * FADE) >> 8; px[p + 1] = (px[p + 1] * FADE) >> 8; px[p + 2] = (px[p + 2] * FADE) >> 8;
    }
    // dimmer balls when the screen gets crowded, so it doesn't turn into one white blob
    const dens = n * 4 * 0.78 / (CW * CH);
    const al = Math.min(1, Math.max(0.06, 0.6 / Math.max(dens, 0.01)));
    if (Math.abs(al - palAl) > 0.01) palette(al);

    const t = simT;
    for (let i = 0; i < n; i++) {
      const dt0 = t - T0[i];
      let x = X0[i] + VX[i] * dt0;
      x = x < L ? L : x > R ? R : x;
      const u = Y0[i] + VY[i] * dt0;
      const k = Math.floor(u / H);
      const y = (k & 1) ? (k + 1) * H - u : u - k * H;
      let cy = (y * SY) | 0;
      if (cy > CH - 2) cy = CH - 2;
      const o = (cy * CW + ((x * SX) | 0)) << 2;
      const c = GEN[i] % PAL, r = PR[c], gg = PG[c], b = PB[c];
      px[o] += r; px[o + 1] += gg; px[o + 2] += b;
      px[o + 4] += r; px[o + 5] += gg; px[o + 6] += b;
      px[o + ROW] += r; px[o + ROW + 1] += gg; px[o + ROW + 2] += b;
      px[o + ROW + 4] += r; px[o + ROW + 5] += gg; px[o + ROW + 6] += b;
    }
    // coloured paddle glow (it trails too)
    addRect(L - 14, L, padL(t), 26, 140, 230);
    addRect(R, R + 14, padR(t), 230, 51, 153);
    g.putImageData(img, 0, 0);

    // hit flashes and the white paddles on top
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life -= 4.2 * dt;
      if (f.life <= 0) { flashes.splice(i, 1); continue; }
      g.fillStyle = `rgba(255,255,255,${(f.life * 0.5).toFixed(3)})`;
      g.fillRect((f.x < W / 2 ? L - 10 : R) * SX, (f.y - PH) * SY, 10 * SX, 2 * PH * SY);
    }
    g.fillStyle = '#fff';
    g.fillRect((L - 10) * SX, (padL(t) - PH) * SY, 10 * SX, 2 * PH * SY);
    g.fillRect(R * SX, (padR(t) - PH) * SY, 10 * SX, 2 * PH * SY);
  }

  // ---------- loop, score and controls ----------
  let running = false, raf = 0, lastTs = 0, ft = 1 / 60, hudAt = 0, lastStatus = '';
  const fmt = v => v.toLocaleString('en-US');

  function saveBest() {
    try { if (best > +(localStorage.getItem('pong-best') || 0)) localStorage.setItem('pong-best', String(best)); } catch (e) { /* ignore */ }
  }

  function statusText() {
    if (limited && why === 'fps') return `Stopped doubling at ${fmt(n)} balls: that's where this device dropped below ${SLOW_FPS} FPS. They keep flying.`;
    if (limited && why === 'cap') return `${fmt(n)} balls, the most this page allows. Your device is a monster.`;
    if (!running) return hits ? 'Paused.' : 'One ball. Every paddle hit doubles it. Press Start.';
    return 'Doubling…';
  }

  function hud() {
    ui.balls.textContent = fmt(n);
    ui.hits.textContent = fmt(hits);
    ui.fps.textContent = running ? String(Math.round(1 / ft)) : '–';
    const s = statusText();
    if (s !== lastStatus) { ui.status.textContent = s; lastStatus = s; }
    ui.best.textContent = best > 1 ? `Best on this device so far: ${fmt(best)} balls.` : '';
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    let real = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
    lastTs = ts;
    if (real > 0.25) real = 1 / 60;            // the tab was asleep or the browser hiccuped: don't count it
    ft += (real - ft) * 0.08;
    const dt = Math.min(real, 0.05);
    step(dt);
    draw(dt);
    if (!limited && n >= 1024) {
      if (1 / ft < SLOW_FPS) { slow += real; if (slow > 0.5) stopDoubling('fps'); } else slow = 0;
    }
    if (ts - hudAt > 250) { hudAt = ts; hud(); }
  }

  function play() {
    if (running) return;
    running = true; lastTs = 0; ft = 1 / 60; slow = 0;
    ui.start.textContent = '❚❚ Pause';
    raf = requestAnimationFrame(frame);
    hud();
  }
  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    ui.start.textContent = '▶ Resume';
    saveBest();
    hud();
  }
  const toggle = () => (running ? pause() : play());

  ui.start.addEventListener('click', toggle);
  ui.reset.addEventListener('click', () => {
    restart();
    if (!running) { ui.start.textContent = '▶ Start'; draw(0); }
    hud();
  });
  canvas.addEventListener('click', toggle);
  canvas.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); }
    else if (e.key === 'r' || e.key === 'R') ui.reset.click();
  });

  // don't burn the battery when nobody is looking
  document.addEventListener('win:close', e => { if (e.detail === 'arcade') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', saveBest);

  restart();
  draw(0);
  hud();
})();
