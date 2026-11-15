// Professional side: remember the choice, résumé printing, copy-email button, and the section highlight in the top bar.
(function () {
  try { localStorage.setItem('jv-mode', 'pro'); } catch (e) { /* private mode */ }

  var printBtn = document.getElementById('print-btn');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  var copyBtn = document.getElementById('copy-email');
  if (copyBtn) {
    var label = copyBtn.textContent;
    copyBtn.addEventListener('click', function () {
      var email = copyBtn.dataset.email;
      var done = function () {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('done');
        setTimeout(function () { copyBtn.textContent = label; copyBtn.classList.remove('done'); }, 1800);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(email).then(done, function () { location.href = 'mailto:' + email; });
      } else {
        location.href = 'mailto:' + email;
      }
    });
  }

  // top bar: a hairline once you scroll, and the link of the section you're reading
  var nav = document.getElementById('nav');
  var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var links = [].slice.call(document.querySelectorAll('.links a'));
  if ('IntersectionObserver' in window && links.length) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      var current = null;
      Object.keys(byId).forEach(function (id) { if (!current && visible[id]) current = id; });
      if (current || window.scrollY < 200) links.forEach(function (a) { a.classList.toggle('on', a === byId[current]); });
    }, { rootMargin: '-35% 0px -55% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
})();
