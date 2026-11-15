// Login screen: a lock-screen clock, two profiles, and a short "Welcome" before the chosen side opens.
(function () {
  var KEY = 'jv-mode';
  var clock = document.getElementById('clock');
  var date = document.getElementById('date');
  var greet = document.getElementById('greet');
  var welcome = document.getElementById('welcome');
  var welcomeAva = document.getElementById('welcome-ava');
  var cards = [].slice.call(document.querySelectorAll('.profile'));

  function tick() {
    var now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    date.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    var h = now.getHours();
    greet.textContent = h < 5 ? 'Up late?' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }
  tick();
  setInterval(tick, 10000);

  var last = null;
  try { last = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
  cards.forEach(function (card) {
    if (card.dataset.mode === last) {
      var t = document.createElement('span');
      t.className = 'last-tag';
      t.textContent = 'Last time';
      card.appendChild(t);
    }
  });

  function choose(card, e) {
    // Ctrl/Cmd/Shift/middle click: let the browser open it in a new tab as usual
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0)) return;
    if (e) e.preventDefault();
    var mode = card.dataset.mode;
    try { localStorage.setItem(KEY, mode); } catch (err) { /* ignore */ }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { location.href = card.href; return; }
    welcomeAva.src = card.querySelector('img').src;
    welcome.className = 'welcome ' + mode;
    welcome.hidden = false;
    setTimeout(function () { location.href = card.href; }, 650);
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function (e) { choose(card, e); });
  });

  // P / C pick a profile; Enter on the page re-opens the last one
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || !welcome.hidden) return;
    var k = e.key.toLowerCase();
    var pick = k === 'p' ? 'pro' : k === 'c' ? 'casual' : null;
    if (!pick && k === 'enter' && last && document.activeElement === document.body) pick = last;
    if (!pick) return;
    var card = cards.filter(function (c) { return c.dataset.mode === pick; })[0];
    if (card) { e.preventDefault(); card.focus(); choose(card); }
  });

  // Coming back with the Back button can restore this page from the cache with the splash still up.
  window.addEventListener('pageshow', function () { welcome.hidden = true; });
})();
