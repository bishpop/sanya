/* ==========================================================================
   Sanya — Modern Site Script (Pinned Showcase & Interactive Engine)
   - Mobile navigation toggle with light-dismiss & Escape handling
   - Smooth scroll progress indicator
   - Pinned Showcase Scenes Controller ([data-scene])
     * Scroll progress mapping to steps, multi-layer images, and focus highlights
     * Perspective 3D fly-in entrance for showcase frames
     * Responsive fallback (reduced motion / mobile stacked layout)
     * Wheel-gesture stepping to advance one stop at a time cleanly
     * Direct click-to-step smooth scrolling
   - Accessible ARIA Tabs with keyboard navigation (ArrowLeft/Right, Home/End)
   - SHA-256 Copy Functionality with animated feedback
   - Privacy-friendly Click-to-Load Video Embeds
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var narrow = window.matchMedia('(max-width: 899px), (max-height: 620px)');
  var clamp = function (n, a, b) {
    return Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, n));
  };
  var easeOut = function (t) {
    return 1 - Math.pow(1 - t, 3);
  };

  /* ---------- Scroll Progress Bar ---------- */
  var scrollBar = document.querySelector('.scroll-bar');
  function updateScroll() {
    if (!scrollBar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? clamp(window.scrollY / max) : 0;
    scrollBar.style.transform = 'scaleX(' + p + ')';
  }
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  /* ---------- Navigation, Accessible Dropdowns & Mobile Drawer ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  var dropdowns = Array.from(document.querySelectorAll('.nav-dropdown, .nav-section-jumps'));
  var hoverCapable = window.matchMedia('(hover: hover)');
  var mobileNavQuery = window.matchMedia('(max-width: 960px)');

  function getDropdownParts(dd) {
    var trigger = dd.querySelector('.nav-trigger, .nav-section-label');
    var panel = dd.querySelector('.nav-popover, .nav-section-list');
    return { trigger: trigger, panel: panel };
  }

  function closeDropdowns(restoreFocus, except) {
    dropdowns.forEach(function (dd) {
      if (dd === except) return;
      if (dd._closeTimer) {
        window.clearTimeout(dd._closeTimer);
        dd._closeTimer = 0;
      }
      var wasPinned = dd.classList.contains('is-pinned');
      dd.classList.remove('open', 'is-pinned');
      var parts = getDropdownParts(dd);
      if (parts.trigger) {
        parts.trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus && wasPinned) parts.trigger.focus();
      }
    });
  }

  function closeNav(restoreToggleFocus) {
    if (links) links.classList.remove('open');
    if (toggle) {
      var wasOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', 'false');
      if (restoreToggleFocus && wasOpen) toggle.focus();
    }
    closeDropdowns(false);
  }

  function alignPopoverToViewport(panel) {
    if (!panel || mobileNavQuery.matches || panel.classList.contains('nav-popover--right')) return;
    panel.removeAttribute('data-align');
    var rect = panel.getBoundingClientRect();
    if (rect.right > window.innerWidth - 16) {
      panel.setAttribute('data-align', 'end');
    }
  }

  dropdowns.forEach(function (dd) {
    var parts = getDropdownParts(dd);
    var trigger = parts.trigger;
    var panel = parts.panel;
    if (!trigger || !panel) return;

    trigger.setAttribute('aria-expanded', 'false');
    // Fallback class if CSS :has() is not used or for explicit state
    if (panel.querySelector('[aria-current="page"]')) {
      dd.classList.add('is-current-group');
    }

    function openDropdown(pin) {
      if (dd._closeTimer) {
        window.clearTimeout(dd._closeTimer);
        dd._closeTimer = 0;
      }
      closeDropdowns(false, dd);
      dd.classList.add('open');
      if (pin) dd.classList.add('is-pinned');
      trigger.setAttribute('aria-expanded', 'true');
      alignPopoverToViewport(panel);
    }

    function scheduleClose() {
      if (dd.classList.contains('is-pinned')) return;
      if (dd._closeTimer) window.clearTimeout(dd._closeTimer);
      dd._closeTimer = window.setTimeout(function () {
        if (!dd.classList.contains('is-pinned')) {
          dd.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }
      }, 220);
    }

    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var shouldPin = !(dd.classList.contains('open') && (dd.classList.contains('is-pinned') || mobileNavQuery.matches));
      if (shouldPin) openDropdown(true);
      else {
        dd.classList.remove('open', 'is-pinned');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        var isOpen = dd.classList.contains('open') && dd.classList.contains('is-pinned');
        if (!isOpen) openDropdown(true);
        else {
          dd.classList.remove('open', 'is-pinned');
          trigger.setAttribute('aria-expanded', 'false');
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown(true);
        var firstItem = panel.querySelector('a, button');
        if (firstItem) firstItem.focus();
      }
    });

    dd.addEventListener('pointerenter', function (e) {
      if (mobileNavQuery.matches || !hoverCapable.matches || e.pointerType === 'touch') return;
      openDropdown(false);
    });

    dd.addEventListener('pointerleave', function (e) {
      if (mobileNavQuery.matches || !hoverCapable.matches || e.pointerType === 'touch') return;
      scheduleClose();
    });

    dd.addEventListener('focusout', function (e) {
      if (e.relatedTarget && !dd.contains(e.relatedTarget) && !dd.classList.contains('is-pinned')) {
        dd.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });

    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        closeNav(false);
      }
    });
  });

  if (toggle) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = links && links.classList.contains('open');
      closeDropdowns(false);
      if (links) links.classList.toggle('open', !isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-dropdown, .nav-section-jumps')) closeDropdowns(false);
    if (e.target.closest('.nav-toggle, .nav-links, .nav-dropdown, .nav-section-jumps')) return;
    closeNav(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDropdowns(true);
      if (links && links.classList.contains('open')) closeNav(true);
    }
  });

  if (links) {
    links.addEventListener('click', function (e) {
      if (e.target.closest('.nav-trigger, .nav-section-label')) return;
      if (e.target.closest('a')) closeNav(false);
    });
  }

  /* ---------- Accessible Tabs ---------- */
  var tabSets = document.querySelectorAll('[data-tabs]');
  tabSets.forEach(function (wrap) {
    var btns = Array.from(wrap.querySelectorAll('[role="tab"]'));
    var panels = btns.map(function (b) {
      return document.getElementById(b.getAttribute('aria-controls'));
    });

    function select(index, focus) {
      btns.forEach(function (b, k) {
        var isCurrent = k === index;
        b.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        b.tabIndex = isCurrent ? 0 : -1;
        if (panels[k]) {
          panels[k].hidden = !isCurrent;
        }
      });
      if (focus && btns[index]) btns[index].focus();
    }

    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        select(i, false);
      });
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
  });

  /* ---------- SHA-256 Copy Functionality ---------- */
  document.querySelectorAll('[data-copy-hash]').forEach(function (button) {
    var defaultText = button.textContent.trim() || 'Copy';
    button.addEventListener('click', function () {
      var hash = button.getAttribute('data-copy-hash') || '';
      if (!hash) return;

      function feedback(ok) {
        button.textContent = ok ? 'Copied ✓' : 'Select hash';
        window.setTimeout(function () {
          button.textContent = defaultText;
        }, 1600);
      }

      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(hash).then(
          function () { feedback(true); },
          function () { feedback(false); }
        );
      } else {
        var code = button.parentElement && button.parentElement.querySelector('code');
        if (!code) { feedback(false); return; }
        var range = document.createRange();
        range.selectNodeContents(code);
        var sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        try {
          feedback(!!document.execCommand('copy'));
        } catch (err) {
          feedback(false);
        }
      }
    });
  });

  /* ---------- Privacy-friendly Click-to-Load Video ---------- */
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
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.aspectRatio = '16 / 9';
      iframe.style.border = '0';
      box.innerHTML = '';
      box.appendChild(iframe);
    });
  });

  /* ---------- Interactive Diashow / Tour Component ---------- */
  var diashows = document.querySelectorAll('[data-diashow]');
  diashows.forEach(function (section) {
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
    if (totalEl) totalEl.textContent = total;

    function goTo(index, shouldFocus) {
      if (index < 0 || index >= total) return;
      activeIndex = index;

      // Update steps
      steps.forEach(function (step, i) {
        var isCurrent = i === activeIndex;
        step.classList.toggle('is-on', isCurrent);
        step.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        step.tabIndex = isCurrent ? 0 : -1;
      });

      var activeStep = steps[activeIndex];
      var targetLayer = activeStep ? parseInt(activeStep.getAttribute('data-layer'), 10) : NaN;
      var targetFocus = activeStep ? activeStep.getAttribute('data-focus') : null;

      // Update multi-layer images/panels
      if (layers.length > 0) {
        layers.forEach(function (layer, i) {
          layer.classList.toggle('is-on', i === targetLayer);
        });
      }

      // Update focus highlight bounding boxes
      focusBoxes.forEach(function (box) {
        var id = box.getAttribute('data-id');
        box.classList.toggle('is-on', id === targetFocus);
      });

      // Update counter and button states
      if (currentEl) currentEl.textContent = (activeIndex + 1);
      if (prevBtn) prevBtn.disabled = activeIndex === 0;
      if (nextBtn) nextBtn.disabled = activeIndex === total - 1;

      // Update dot indicators
      dots.forEach(function (dot, i) {
        var isCurrent = i === activeIndex;
        dot.classList.toggle('is-on', isCurrent);
        dot.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });

      if (shouldFocus && steps[activeIndex]) {
        steps[activeIndex].focus();
      }
    }

    // Step item click & keyboard navigation
    steps.forEach(function (step, i) {
      step.addEventListener('click', function () {
        goTo(i, false);
      });
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

    // Prev / Next button listeners
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        goTo(activeIndex - 1, false);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        goTo(activeIndex + 1, false);
      });
    }

    // Dot navigation listeners
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        goTo(i, false);
      });
    });

    // Initialize initial active state
    goTo(0, false);
  });

  /* ---------- Subtle Scroll Reveal for other content ---------- */
  if ('IntersectionObserver' in window && !reduce.matches) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -6% 0px' }
    );
    document.querySelectorAll('.reveal, .flyin').forEach(function (el) {
      observer.observe(el);
    });
  }

})();
