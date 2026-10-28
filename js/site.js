/* Sanya — site script
   - mobile navigation and scroll progress
   - scroll-driven fly-in for screenshots (perspective entrance)
   - pinned scenes with step-by-step focus
   - accessible tabs, click-to-load video
   Without JavaScript every page stays fully readable; with reduced motion or on narrow screens
   the pinned scenes fall back to a simple stacked layout. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia('(max-width: 899px), (max-height: 620px)');
  var clamp = function (n, a, b) { return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, n)); };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ---------- navigation + page section quick-jumps ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  var quickMenu = document.getElementById('nav-section-menu');
  var compactNav = window.matchMedia('(max-width: 1020px)');

  function closeNavMenus(returnFocus) {
    if (links) links.classList.remove('open');
    if (quickMenu) quickMenu.classList.remove('open');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      if (returnFocus) toggle.focus();
    }
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      if (compactNav.matches && links) {
        var mobileOpen = !links.classList.contains('open');
        links.classList.toggle('open', mobileOpen);
        if (quickMenu) quickMenu.classList.remove('open');
        toggle.setAttribute('aria-expanded', mobileOpen ? 'true' : 'false');
      } else if (quickMenu) {
        var menuOpen = !quickMenu.classList.contains('open');
        quickMenu.classList.toggle('open', menuOpen);
        toggle.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
      }
    });
  }
  if (links) {
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNavMenus(false);
    });
  }
  if (quickMenu) {
    quickMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeNavMenus(false);
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('.nav-toggle, .nav-links, .nav-quick-menu')) return;
    if ((links && links.classList.contains('open')) || (quickMenu && quickMenu.classList.contains('open'))) closeNavMenus(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ((links && links.classList.contains('open')) || (quickMenu && quickMenu.classList.contains('open')))) closeNavMenus(true);
  });
  if (compactNav.addEventListener) compactNav.addEventListener('change', function () { closeNavMenus(false); });
  else if (compactNav.addListener) compactNav.addListener(function () { closeNavMenus(false); });
  var bar = document.querySelector('.scroll-bar');

  /* ---------- motion state ---------- */
  var scenes = [].map.call(document.querySelectorAll('[data-scene]'), function (el) {
    return {
      el: el,
      copy: el.querySelector('.scene-copy'),
      frame: el.querySelector('[data-flyin]'),
      steps: [].slice.call(el.querySelectorAll('.step')),
      focus: [].slice.call(el.querySelectorAll('.focus')),
      layers: [].slice.call(el.querySelectorAll('.layer, .panel')),
      active: -1
    };
  });
  var flyers = [].slice.call(document.querySelectorAll('[data-fly-scroll]'));
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));

  function fly(el, t) {
    el.style.opacity = t;
    el.style.transform = 'translate3d(0,' + ((1 - t) * 70) + 'px,' + (-(1 - t) * 240) + 'px) rotateX(' + ((1 - t) * 9) + 'deg) scale(' + (0.92 + 0.08 * t) + ')';
  }
  function clearInline(el) { if (el) { el.style.opacity = ''; el.style.transform = ''; } }

  function isStatic() { return reduce.matches || narrow.matches; }
  function applyMode() {
    root.classList.toggle('static', isStatic());
    if (isStatic()) {
      scenes.forEach(function (s) { clearInline(s.frame); clearInline(s.copy); });
      flyers.forEach(clearInline);
    }
    update();
  }

  function setStep(s, i) {
    if (s.active === i) return;
    s.active = i;
    s.steps.forEach(function (st, k) { st.classList.toggle('is-on', k === i); });
    var step = s.steps[i];
    var layer = step ? parseInt(step.getAttribute('data-layer'), 10) : NaN;
    var focus = step ? step.getAttribute('data-focus') : null;
    s.layers.forEach(function (l, k) { l.classList.toggle('is-on', k === layer); });
    s.focus.forEach(function (f) { f.classList.toggle('is-on', f.getAttribute('data-id') === focus); });
  }

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;

    if (bar) {
      var max = document.documentElement.scrollHeight - vh;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max) : 0) + ')';
    }

    if (isStatic()) {
      scenes.forEach(function (s) { s.steps.forEach(function (st) { st.classList.add('is-on'); }); s.layers.forEach(function (l) { l.classList.add('is-on'); }); });
      return;
    }

    scenes.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 1.5) return;
      var navH = 64;
      var pinH = vh - navH;
      var travel = Math.max(1, s.el.offsetHeight - pinH);
      var p = clamp((navH - r.top) / travel);
      // entrance: runs while the scene scrolls in, settles exactly when it pins
      var t = easeOut(clamp((vh - r.top) / (vh * 0.95)));
      if (s.frame) fly(s.frame, t);
      if (s.copy) { s.copy.style.opacity = t; s.copy.style.transform = 'translate3d(0,' + ((1 - t) * 28) + 'px,0)'; }
      var n = s.steps.length;
      if (n) setStep(s, Math.min(n - 1, Math.floor(clamp((p - 0.03) / 0.94) * n)));
    });

    flyers.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 1.2) return;
      fly(el, easeOut(clamp((vh - r.top) / (vh * 0.8))));
    });
  }
  function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);

  /* One wheel gesture advances exactly one item in a pinned showcase scene. */
  var sceneWheelLocked = false;
  window.addEventListener('wheel', function (event) {
    if (isStatic() || reduce.matches || event.ctrlKey || Math.abs(event.deltaY) < 8) return;
    var sceneEl = event.target && event.target.closest ? event.target.closest('[data-scene]') : null;
    if (!sceneEl) return;
    var scene = scenes.find(function (entry) { return entry.el === sceneEl; });
    if (!scene || !scene.steps.length) return;
    var rect = scene.el.getBoundingClientRect();
    var vh = window.innerHeight;
    var navH = 64;
    /* Only capture while the showcase is actually pinned, not when entering/leaving it. */
    if (rect.top > navH + 2 || rect.bottom < vh - 2) return;
    var travel = Math.max(1, scene.el.offsetHeight - (vh - navH));
    var p = clamp((navH - rect.top) / travel);
    var n = scene.steps.length;
    var current = scene.active >= 0 ? scene.active : Math.min(n - 1, Math.floor(clamp((p - 0.03) / 0.94) * n));
    var next = event.deltaY > 0 ? current + 1 : current - 1;
    if (next < 0 || next >= n) return;
    /* Ignore extra wheel ticks during the smooth snap so a single gesture cannot skip a step. */
    event.preventDefault();
    if (sceneWheelLocked) return;
    sceneWheelLocked = true;
    var targetP = 0.03 + ((next + 0.5) / n) * 0.94;
    var sceneTop = rect.top + window.scrollY;
    var targetY = sceneTop - navH + targetP * travel;
    setStep(scene, next);
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    window.setTimeout(function () { sceneWheelLocked = false; }, 760);
  }, { passive: false });
  [reduce, narrow].forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyMode); else if (m.addListener) m.addListener(applyMode);
  });
  applyMode();

  /* ---------- download navigation: card-centred scroll + staged highlight ---------- */
  var downloadScrollFrame = 0;
  var downloadScrollBehavior = null;
  var downloadHighlightTimer = 0;
  var downloadPulseTimer = 0;
  function animateDownloadArrival() {
    var section = document.getElementById('download');
    if (!section) return;
    var card = section.querySelector('.dl-card') || section;
    var button = card.querySelector('.dl-actions .btn-primary, .btn-primary');
    var ns = 'http://www.w3.org/2000/svg';
    var svg = card.querySelector('.dl-trace');

    if (!svg) {
      svg = document.createElementNS(ns, 'svg');
      svg.classList.add('dl-trace');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<defs><linearGradient id="sanyaDownloadTraceGradient" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#9b83ef"/><stop offset=".52" stop-color="#d8a5d0"/><stop offset="1" stop-color="#78a2e8"/>' +
        '</linearGradient></defs><path pathLength="1"/>';
      card.appendChild(svg);
    }

    var w = Math.max(1, card.clientWidth);
    var h = Math.max(1, card.clientHeight);
    var radius = parseFloat(window.getComputedStyle(card).borderTopLeftRadius) || 10;
    var inset = 1.2;
    var rr = Math.max(1, Math.min(radius - inset, (w - inset * 2) / 2, (h - inset * 2) / 2));
    var x0 = inset, y0 = inset, x1 = w - inset, y1 = h - inset;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.querySelector('path').setAttribute('d',
      'M ' + (w / 2) + ' ' + y0 + ' H ' + (x1 - rr) +
      ' A ' + rr + ' ' + rr + ' 0 0 1 ' + x1 + ' ' + (y0 + rr) +
      ' V ' + (y1 - rr) + ' A ' + rr + ' ' + rr + ' 0 0 1 ' + (x1 - rr) + ' ' + y1 +
      ' H ' + (x0 + rr) + ' A ' + rr + ' ' + rr + ' 0 0 1 ' + x0 + ' ' + (y1 - rr) +
      ' V ' + (y0 + rr) + ' A ' + rr + ' ' + rr + ' 0 0 1 ' + (x0 + rr) + ' ' + y0 + ' Z');

    section.classList.remove('download-arrive');
    card.classList.remove('dl-glow');
    svg.classList.remove('run');
    window.clearTimeout(downloadPulseTimer);
    window.clearTimeout(downloadHighlightTimer);
    if (button) button.classList.remove('dl-pulse');
    void card.offsetWidth;
    section.classList.add('download-arrive');
    card.classList.add('dl-glow');
    svg.classList.add('run');
    /* The main download button is highlighted after the card outline finishes arriving. */
    downloadPulseTimer = window.setTimeout(function () {
      if (button && document.body.contains(button)) {
        button.classList.remove('dl-pulse');
        void button.offsetWidth;
        button.classList.add('dl-pulse');
      }
    }, reduce.matches ? 0 : 1380);

    downloadHighlightTimer = window.setTimeout(function () {
      section.classList.remove('download-arrive');
      card.classList.remove('dl-glow');
      svg.classList.remove('run');
      if (button) button.classList.remove('dl-pulse');
      window.clearTimeout(downloadPulseTimer);
    }, reduce.matches ? 20 : 3300);
  }

  function smoothScrollToDownload(afterScroll) {
    var target = document.getElementById('download');
    if (!target) return;
    var focus = target.querySelector('.dl-card') || target;
    var rect = focus.getBoundingClientRect();
    var maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    var idealOffset = Math.max(18, (window.innerHeight - Math.min(focus.offsetHeight, window.innerHeight - 36)) / 2);
    var startY = window.scrollY;
    var endY = clamp(rect.top + startY - idealOffset, 0, maxY);
    var distance = endY - startY;

    if (downloadScrollFrame) {
      window.cancelAnimationFrame(downloadScrollFrame);
      downloadScrollFrame = 0;
      if (downloadScrollBehavior !== null) {
        root.style.scrollBehavior = downloadScrollBehavior;
        downloadScrollBehavior = null;
      }
    }
    if (reduce.matches || Math.abs(distance) < 2) {
      window.scrollTo({ top: endY, behavior: 'auto' });
      if (afterScroll) afterScroll();
      return;
    }

    downloadScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    var startTime = performance.now();
    var duration = clamp(650 + Math.abs(distance) * .18, 700, 1450);
    function frame(now) {
      var p = clamp((now - startTime) / duration);
      var eased = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo(0, startY + distance * eased);
      if (p < 1) {
        downloadScrollFrame = window.requestAnimationFrame(frame);
      } else {
        downloadScrollFrame = 0;
        root.style.scrollBehavior = downloadScrollBehavior === null ? '' : downloadScrollBehavior;
        downloadScrollBehavior = null;
        if (afterScroll) afterScroll();
      }
    }
    downloadScrollFrame = window.requestAnimationFrame(frame);
  }

  function closeMobileNav() {
    if (links && links.classList.contains('open') && toggle) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }

  /* Intercept same-page download links (including the navbar CTA) for the full sequence. */
  [].forEach.call(document.querySelectorAll('a[href]'), function (anchor) {
    anchor.addEventListener('click', function (event) {
      var url;
      try { url = new URL(anchor.href, window.location.href); } catch (e) { return; }
      if (url.hash !== '#download' || url.pathname !== window.location.pathname || !document.getElementById('download')) return;
      event.preventDefault();
      if (window.location.hash !== '#download') window.history.pushState(null, '', '#download');
      closeMobileNav();
      smoothScrollToDownload(animateDownloadArrival);
    });
  });

  /* Direct download entry: support regular #download links and the homepage's no-jump route. */
  var downloadQuery = new URLSearchParams(window.location.search);
  var requestedDownload = window.location.hash === '#download' || downloadQuery.get('goto') === 'download';
  if (requestedDownload) {
    var cameFromHomeCta = downloadQuery.get('goto') === 'download';
    var startDownloadArrival = function () {
      window.setTimeout(function () {
        /* Replace the query route with the canonical hash without triggering a native anchor jump. */
        if (cameFromHomeCta) window.history.replaceState(null, '', window.location.pathname + '#download');
        smoothScrollToDownload(animateDownloadArrival);
      }, 80);
    };
    if (document.readyState === 'complete') startDownloadArrival();
    else window.addEventListener('load', startDownloadArrival, { once: true });
  }

  /* ---------- reveal on scroll ---------- */
  if ('IntersectionObserver' in window && !reduce.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- tabs ---------- */
  [].forEach.call(document.querySelectorAll('[data-tabs]'), function (wrap) {
    var btns = [].slice.call(wrap.querySelectorAll('[role="tab"]'));
    var panels = btns.map(function (b) { return document.getElementById(b.getAttribute('aria-controls')); });
    function select(i, focus) {
      btns.forEach(function (b, k) {
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
        b.tabIndex = k === i ? 0 : -1;
        if (panels[k]) panels[k].hidden = k !== i;
      });
      if (focus) btns[i].focus();
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i); });
      b.addEventListener('keydown', function (e) {
        var k = null;
        if (e.key === 'ArrowRight') k = (i + 1) % btns.length;
        else if (e.key === 'ArrowLeft') k = (i - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') k = 0;
        else if (e.key === 'End') k = btns.length - 1;
        if (k !== null) { e.preventDefault(); select(k, true); }
      });
    });
  });

  /* ---------- click-to-load video (no connection to YouTube before the click) ---------- */
  [].forEach.call(document.querySelectorAll('[data-youtube-id]'), function (box) {
    var id = box.getAttribute('data-youtube-id');
    var btn = box.querySelector('button');
    if (!id || !btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
      f.title = box.getAttribute('data-video-title') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      box.innerHTML = '';
      box.appendChild(f);
    });
  });
  /* ---------- SHA-256 copy controls ---------- */
  [].forEach.call(document.querySelectorAll('[data-copy-hash]'), function (button) {
    var defaultLabel = button.textContent.trim() || 'Copy';
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy-hash') || '';
      if (!value) return;
      function feedback(ok) {
        button.textContent = ok ? 'Copied' : 'Select hash';
        window.setTimeout(function () { button.textContent = defaultLabel; }, 1500);
      }
      function selectFallback() {
        var code = button.parentElement && button.parentElement.querySelector('code');
        if (!code) { feedback(false); return; }
        var range = document.createRange();
        range.selectNodeContents(code);
        var selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        try { feedback(!!document.execCommand('copy')); }
        catch (e) { feedback(false); }
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(value).then(function () { feedback(true); }, selectFallback);
      } else {
        selectFallback();
      }
    });
  });

})();
