/* ==========================================================================
   Sanya Workshop — Modern Site Controller
   - Conditional Popover API polyfill (only when native support is missing)
   - Responsive ResizeObserver Navbar (native popover narrow/wide sync + anchor fallback)
   - Two-state Color-Scheme Toggle (follows <meta name="color-scheme"> spec)
   - Scroll-Driven Animation Fallbacks (only loaded when CSS timelines unsupported)
   - Accessible Tabs (hidden="until-found" + beforematch) & Catalog Filter
   - Interactive Diashow / Showcase Controller
   - Native <dialog> Screenshot Lightbox with Top-Layer Exit Fallback
   - Privacy-Friendly Click-to-Load YouTube Embed
   ========================================================================== */

(function () {
  'use strict';

  var motionAllowed = window.matchMedia('(prefers-reduced-motion: no-preference)');
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var hoverCapable = window.matchMedia('(hover: hover)');

  /* ---------- 1. Conditional Popover Polyfill ---------- */
  if (!Object.hasOwn(HTMLElement.prototype, 'popover')) {
    var polyScript = document.createElement('script');
    polyScript.type = 'module';
    polyScript.src = 'https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js';
    document.head.appendChild(polyScript);
  }

  /* ---------- 2. Two-State Dark/Light Color-Scheme Toggle ---------- */
  var colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function getStoredScheme() {
    try {
      var val = localStorage.getItem('color-scheme');
      return val === 'light' || val === 'dark' ? val : null;
    } catch (e) {
      return null;
    }
  }

  function getRenderedScheme() {
    var stored = getStoredScheme();
    if (stored) return stored;
    return darkQuery.matches ? 'dark' : 'light';
  }

  function syncThemeMeta(value) {
    var content = value === 'light' || value === 'dark' ? value : 'light dark';
    if (colorSchemeMeta) colorSchemeMeta.setAttribute('content', content);
    if (themeColorMeta) {
      var effective = content === 'light dark' ? (darkQuery.matches ? 'dark' : 'light') : content;
      themeColorMeta.setAttribute('content', effective === 'dark' ? '#09090f' : '#eff1f5');
    }
  }

  syncThemeMeta(getStoredScheme());

  darkQuery.addEventListener('change', function () {
    // Only refresh theme-color chrome when following system; never erase a stored override.
    if (!getStoredScheme()) syncThemeMeta(null);
  });

  window.addEventListener('storage', function (e) {
    if (e.key === 'color-scheme') syncThemeMeta(getStoredScheme());
  });

  document.querySelectorAll('.theme-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var currentRendered = getRenderedScheme();
      var target = currentRendered === 'dark' ? 'light' : 'dark';
      var systemScheme = darkQuery.matches ? 'dark' : 'light';

      try {
        if (target === systemScheme) {
          localStorage.removeItem('color-scheme');
          syncThemeMeta(null);
        } else {
          localStorage.setItem('color-scheme', target);
          syncThemeMeta(target);
        }
      } catch (e) {
        syncThemeMeta(target);
      }
    });
  });

  /* ---------- 3. Responsive Navbar & Native Popover Positioning ---------- */
  var header = document.querySelector('.site-header');
  var headerInner = header && header.querySelector('.header-inner');
  var siteMenu = document.getElementById('site-menu');
  var dropdownItems = header ? Array.from(header.querySelectorAll('.nav-dropdown')) : [];
  var utilPopovers = Array.from(document.querySelectorAll('.util-popover[popover]'));
  var supportsPositionArea = window.CSS && CSS.supports && CSS.supports('position-area', 'block-end');

  function positionPopoverFallback(trigger, panel, alignEnd) {
    if (!trigger || !panel || supportsPositionArea) return;
    var rect = trigger.getBoundingClientRect();
    var pRect = panel.getBoundingClientRect();
    var gap = 8;
    var top = rect.bottom + gap;
    if (top + pRect.height > window.innerHeight - 12 && rect.top - gap - pRect.height > 12) {
      top = rect.top - gap - pRect.height;
    }
    var left = alignEnd ? rect.right - pRect.width : rect.left;
    left = Math.max(12, Math.min(left, window.innerWidth - pRect.width - 12));
    panel.style.top = Math.round(top) + 'px';
    panel.style.left = Math.round(left) + 'px';
  }

  if (header && headerInner && siteMenu) {
    var lastHeaderWidth = 0;
    var isWide = false;

    function syncNavbarLayout(forceMeasure) {
      var currentWidth = header.getBoundingClientRect().width;
      if (!forceMeasure && !isWide && currentWidth <= lastHeaderWidth) return;
      lastHeaderWidth = currentWidth;

      var wasMenuOpen = siteMenu.matches(':popover-open, .\\:popover-open');
      header.classList.add('is-measuring');
      header.classList.add('is-wide');
      siteMenu.removeAttribute('popover');

      // Measure whether the full inline row fits comfortably
      var fits = headerInner.scrollWidth <= headerInner.clientWidth + 1;
      isWide = fits;
      header.classList.toggle('is-wide', isWide);

      if (isWide) {
        siteMenu.removeAttribute('popover');
        dropdownItems.forEach(function (item) {
          var trigger = item.querySelector('.nav-trigger');
          var submenu = item.querySelector('.nav-popover');
          if (!trigger || !submenu) return;
          submenu.setAttribute('popover', 'auto');
          submenu.hidden = false;
          trigger.setAttribute('aria-expanded', 'false');
        });
      } else {
        siteMenu.setAttribute('popover', 'auto');
        dropdownItems.forEach(function (item) {
          var trigger = item.querySelector('.nav-trigger');
          var submenu = item.querySelector('.nav-popover');
          if (!trigger || !submenu) return;
          submenu.removeAttribute('popover');
          submenu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        });
        if (wasMenuOpen && typeof siteMenu.showPopover === 'function') {
          try { siteMenu.showPopover(); } catch (e) {}
        }
      }

      requestAnimationFrame(function () {
        header.classList.remove('is-measuring');
      });
    }

    // Wire each dropdown item (native popover in wide mode, inline disclosure in narrow mode)
    dropdownItems.forEach(function (item) {
      var trigger = item.querySelector('.nav-trigger');
      var submenu = item.querySelector('.nav-popover');
      if (!trigger || !submenu) return;

      var hoverPreview = false;

      submenu.addEventListener('toggle', function (e) {
        var open = e.newState === 'open';
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && !supportsPositionArea) {
          positionPopoverFallback(trigger, submenu, false);
        }
        if (!open) hoverPreview = false;
      });

      trigger.addEventListener('click', function (e) {
        if (!isWide) {
          e.preventDefault();
          var willOpen = submenu.hidden;
          submenu.hidden = !willOpen;
          trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
          return;
        }
        // If already open solely via hover preview, pin it open instead of closing
        if (hoverPreview && submenu.matches(':popover-open, .\\:popover-open')) {
          e.preventDefault();
          hoverPreview = false;
        }
      });

      item.addEventListener('pointerenter', function (e) {
        if (!isWide || !hoverCapable.matches || e.pointerType === 'touch') return;
        if (typeof submenu.showPopover === 'function' && !submenu.matches(':popover-open, .\\:popover-open')) {
          hoverPreview = true;
          try {
            submenu.showPopover({ source: trigger });
          } catch (err) {
            try { submenu.showPopover(); } catch (err2) {}
          }
        }
      });

      item.addEventListener('pointerleave', function (e) {
        if (!isWide || !hoverCapable.matches || e.pointerType === 'touch') return;
        if (hoverPreview && typeof submenu.hidePopover === 'function' && submenu.matches(':popover-open, .\\:popover-open')) {
          hoverPreview = false;
          try { submenu.hidePopover(); } catch (err) {}
        }
      });

      item.addEventListener('focusout', function (e) {
        if (!isWide) return;
        if (e.relatedTarget && !item.contains(e.relatedTarget)) {
          if (typeof submenu.hidePopover === 'function' && submenu.matches(':popover-open, .\\:popover-open')) {
            hoverPreview = false;
            try { submenu.hidePopover(); } catch (err) {}
          }
        }
      });

      submenu.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          if (isWide && typeof submenu.hidePopover === 'function') {
            try { submenu.hidePopover(); } catch (err) {}
          } else if (!isWide && typeof siteMenu.hidePopover === 'function') {
            try { siteMenu.hidePopover(); } catch (err) {}
          }
        }
      });
    });

    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(function () {
        syncNavbarLayout(false);
      });
      ro.observe(header);
      ro.observe(siteMenu);
    } else {
      window.addEventListener('resize', function () { syncNavbarLayout(true); });
    }

    syncNavbarLayout(true);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { syncNavbarLayout(true); });
    }
  }

  // Fallback positioning & link-dismiss for utility popovers (On this page / Language)
  utilPopovers.forEach(function (panel) {
    var trigger = document.querySelector('[popovertarget="' + panel.id + '"]');
    panel.addEventListener('toggle', function (e) {
      var open = e.newState === 'open';
      if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && trigger && !supportsPositionArea) {
        positionPopoverFallback(trigger, panel, true);
      }
    });
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a, .lang-btn') && typeof panel.hidePopover === 'function') {
        try { panel.hidePopover(); } catch (err) {}
      }
    });
  });

  /* ---------- 4. Scroll Progress Fallback (only if CSS scroll() unsupported) ---------- */
  var scrollBar = document.querySelector('.scroll-bar');
  if (scrollBar && !(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'))) {
    var updateScroll = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      scrollBar.style.transform = 'scaleX(' + p + ')';
    };
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();
  }

  /* ---------- 5. Scroll Reveal Fallback (only if CSS view() unsupported) ---------- */
  var supportsViewTimeline = window.CSS && CSS.supports && CSS.supports('(animation-timeline: view()) and (animation-range: entry)');
  if (!supportsViewTimeline && 'IntersectionObserver' in window && motionAllowed.matches) {
    var targets = document.querySelectorAll('.reveal, .flyin, .pipeline-step, .suite-card, .suite-app-card, .dossier-feature, .manual-card, .pdf-showcase-card, .ss-step-card, .ss-mistake-card, .ss-final-item');
    targets.forEach(function (el) { el.classList.add('js-io-reveal'); });

    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (el) { revealObs.observe(el); });
  }

  /* ---------- 6. Accessible Tabs (with hidden="until-found" & beforematch) ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (wrap) {
    var btns = Array.from(wrap.querySelectorAll('[role="tab"]'));
    var panels = btns.map(function (b) {
      var id = b.getAttribute('aria-controls') || b.getAttribute('data-panel');
      return id ? document.getElementById(id) : null;
    });

    function select(index, focus) {
      btns.forEach(function (b, k) {
        var isCurrent = k === index;
        b.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        b.tabIndex = isCurrent ? 0 : -1;
        var panel = panels[k];
        if (panel) {
          if (isCurrent) {
            panel.removeAttribute('hidden');
          } else {
            panel.hidden = 'until-found';
          }
        }
      });
      if (btns[index]) {
        try {
          btns[index].scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' });
        } catch (e) {
          btns[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
        if (focus) btns[index].focus();
      }
    }

    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(i, false); });
      b.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % btns.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = btns.length - 1;
        if (next !== null) {
          e.preventDefault();
          select(next, true);
        }
      });
    });

    // Sync tab state when browser find-in-page matches inside a hidden="until-found" panel
    panels.forEach(function (panel, i) {
      if (!panel) return;
      panel.addEventListener('beforematch', function () {
        select(i, false);
      });
    });
  });

  /* ---------- 7. Interactive Private Catalog Filter (index.html) ---------- */
  var filterRoot = document.querySelector('[data-catalog-filter]');
  if (filterRoot) {
    var filterTabs = Array.from(filterRoot.querySelectorAll('[role="tab"]'));
    var cards = Array.from(document.querySelectorAll('[data-catalog-item]'));
    var groups = Array.from(document.querySelectorAll('[data-catalog-group]'));
    var countEl = document.querySelector('[data-catalog-count]');

    function applyFilter(category, focusBtn) {
      var updateDOM = function () {
        var visible = 0;
        cards.forEach(function (card) {
          var cat = card.getAttribute('data-category') || '';
          var match = category === 'all' || cat === category;
          card.hidden = !match;
          if (match) visible++;
        });
        groups.forEach(function (group) {
          var gcat = group.getAttribute('data-catalog-group') || '';
          group.hidden = !(category === 'all' || gcat === category);
        });
        filterTabs.forEach(function (btn) {
          var active = btn.getAttribute('data-filter') === category;
          btn.setAttribute('aria-selected', active ? 'true' : 'false');
          btn.tabIndex = active ? 0 : -1;
        });
        if (countEl) {
          countEl.textContent = visible + ' / ' + cards.length;
        }
      };

      if (document.startViewTransition && motionAllowed.matches) {
        document.startViewTransition(updateDOM);
      } else {
        updateDOM();
      }
      if (focusBtn) focusBtn.focus();
    }

    filterTabs.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        applyFilter(btn.getAttribute('data-filter') || 'all', null);
      });
      btn.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = (i + 1) % filterTabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + filterTabs.length) % filterTabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = filterTabs.length - 1;
        if (next !== null) {
          e.preventDefault();
          var targetBtn = filterTabs[next];
          applyFilter(targetBtn.getAttribute('data-filter') || 'all', targetBtn);
        }
      });
    });
  }

  /* ---------- 8. Interactive Diashow / Showcase Controller ---------- */
  document.querySelectorAll('[data-diashow]').forEach(function (section) {
    var steps = Array.from(section.querySelectorAll('.step'));
    var layers = Array.from(section.querySelectorAll('.layer, .panel'));
    var focusBoxes = Array.from(section.querySelectorAll('.focus'));
    var prevBtn = section.querySelector('.diashow-prev');
    var nextBtn = section.querySelector('.diashow-next');
    var currentEl = section.querySelector('.diashow-current');
    var totalEl = section.querySelector('.diashow-total');
    var dots = Array.from(section.querySelectorAll('.diashow-dot'));

    var activeIndex = 0;
    var total = steps.length;
    if (total === 0) return;
    if (totalEl) totalEl.textContent = total;

    function goTo(index, shouldFocus) {
      if (index < 0 || index >= total) return;
      activeIndex = index;

      steps.forEach(function (step, i) {
        var isCurrent = i === activeIndex;
        step.classList.toggle('is-on', isCurrent);
        step.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        step.tabIndex = isCurrent ? 0 : -1;
      });

      var activeStep = steps[activeIndex];
      var targetLayer = activeStep ? parseInt(activeStep.getAttribute('data-layer'), 10) : NaN;
      var targetFocus = activeStep ? activeStep.getAttribute('data-focus') : null;

      if (layers.length > 0 && !isNaN(targetLayer)) {
        layers.forEach(function (layer, i) {
          layer.classList.toggle('is-on', i === targetLayer);
        });
      }

      focusBoxes.forEach(function (box) {
        box.classList.toggle('is-on', box.getAttribute('data-id') === targetFocus);
      });

      if (currentEl) currentEl.textContent = activeIndex + 1;
      if (prevBtn) prevBtn.disabled = activeIndex === 0;
      if (nextBtn) nextBtn.disabled = activeIndex === total - 1;

      dots.forEach(function (dot, i) {
        var isCurrent = i === activeIndex;
        dot.classList.toggle('is-on', isCurrent);
        dot.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });

      if (shouldFocus && steps[activeIndex]) steps[activeIndex].focus();
    }

    steps.forEach(function (step, i) {
      step.addEventListener('click', function () { goTo(i, false); });
      step.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          goTo((i + 1) % total, true);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          goTo((i - 1 + total) % total, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          goTo(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          goTo(total - 1, true);
        }
      });
    });

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(activeIndex - 1, false); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(activeIndex + 1, false); });
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i, false); });
    });

    goTo(0, false);
  });

  /* ---------- 9. Native <dialog> Screenshot Lightbox with Top-Layer Exit Fallback ---------- */
  var supportsDisplayTransition;
  function canTransitionDisplay() {
    if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
    if (!window.CSS || !CSS.supports || !CSS.supports('transition-behavior', 'allow-discrete') || !document.body) {
      return false;
    }
    var probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    getComputedStyle(probe).display;
    probe.style.display = 'none';
    supportsDisplayTransition = getComputedStyle(probe).display === 'block';
    probe.remove();
    return supportsDisplayTransition;
  }

  function supportsTopLayerExit() {
    return !!(window.CSS && CSS.supports && CSS.supports('overlay', 'auto') && canTransitionDisplay());
  }

  function closeTopLayerDialog(dlg) {
    if (!dlg || !dlg.open) return;
    if (!supportsTopLayerExit()) {
      dlg.setAttribute('data-closing', '');
      var anims = typeof dlg.getAnimations === 'function' ? dlg.getAnimations({ subtree: true }) : [];
      if (anims.length > 0) {
        Promise.race([
          Promise.allSettled(anims.map(function (a) { return a.finished; })),
          new Promise(function (r) { setTimeout(r, 400); })
        ]).then(function () {
          if (!dlg.hasAttribute('data-closing')) return;
          dlg.removeAttribute('data-closing');
          dlg.close();
        });
        return;
      }
      dlg.removeAttribute('data-closing');
    }
    dlg.close();
  }

  var zoomableImages = document.querySelectorAll('.studio-monitor-media img, .dossier-media img');
  if (zoomableImages.length > 0 && 'HTMLDialogElement' in window) {
    var lightbox = document.createElement('dialog');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('closedby', 'any');
    lightbox.setAttribute('aria-label', 'Screenshot preview');
    lightbox.innerHTML =
      '<div class="lightbox-head">' +
        '<span class="lightbox-caption"></span>' +
        '<button type="button" class="btn btn-sm lightbox-close" aria-label="Close preview">Close [Esc]</button>' +
      '</div>' +
      '<div class="lightbox-body"><img alt=""></div>';
    document.body.appendChild(lightbox);

    var lbImg = lightbox.querySelector('.lightbox-body img');
    var lbCap = lightbox.querySelector('.lightbox-caption');
    var lbClose = lightbox.querySelector('.lightbox-close');

    lbClose.addEventListener('click', function () { closeTopLayerDialog(lightbox); });
    lightbox.addEventListener('cancel', function (e) {
      e.preventDefault();
      closeTopLayerDialog(lightbox);
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeTopLayerDialog(lightbox);
    });

    zoomableImages.forEach(function (img) {
      var parent = img.parentElement;
      if (parent) {
        parent.setAttribute('tabindex', '0');
        parent.setAttribute('role', 'button');
        parent.setAttribute('aria-label', 'Inspect screenshot: ' + (img.alt || 'preview'));
        var openPreview = function () {
          lbImg.src = img.currentSrc || img.src;
          lbImg.alt = img.alt || '';
          lbCap.textContent = img.alt || 'Screenshot';
          lightbox.showModal();
        };
        parent.addEventListener('click', openPreview);
        parent.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPreview();
          }
        });
      }
    });
  }

  /* ---------- 10. Privacy-Friendly Click-to-Load YouTube Video ---------- */
  document.querySelectorAll('[data-youtube-id]').forEach(function (box) {
    var id = box.getAttribute('data-youtube-id');
    var btn = box.querySelector('button');
    if (!id || !btn) return;

    btn.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
      iframe.title = box.getAttribute('data-video-title') || 'Video Showcase';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.style.inlineSize = '100%';
      iframe.style.blockSize = '100%';
      iframe.style.aspectRatio = '16 / 9';
      iframe.style.border = '0';
      box.innerHTML = '';
      box.appendChild(iframe);
    });
  });
})();
