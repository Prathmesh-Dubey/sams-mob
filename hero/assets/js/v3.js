/* =========================================================================
   SAMS Mobile — Design V3 front-end
   Scroll-driven hero turntable + horizontal spec rail + UI wiring.
   Ported from the Claude Design prototype `SAMS Home A.dc.html`.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var q = function (s, c) { return (c || document).querySelector(s); };
  var qa = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var ease = function (t) { return t * t * (3 - 2 * t); };

  /* The breakpoint below which every pinned/scroll-driven effect is off.
     Must match the 900px breakpoint in v3.css. */
  var DESKTOP = window.matchMedia('(min-width: 901px)');
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --------------------------------------------------------- scroll engine
     The hero is scroll-*driven*, not scroll-*bound*: the raw scroll position
     feeds a target and a damped spring chases it every frame. A mouse wheel
     delivers scroll in coarse ~100px jumps, so reading it 1:1 makes the
     device snap between positions; chasing it makes the same gesture read as
     one continuous movement. The loop parks itself once the spring settles,
     so an idle page costs nothing. */
  var hero = q('#top');
  var product = q('#product');
  var rail = q('[data-rail]');
  var copies = qa('[data-hero-copy]');
  var hudStages = qa('[data-hud-stage]');

  var raf = 0;          /* rAF handle: non-zero while the loop is running */
  var last = 0;         /* timestamp of the previous frame */
  var sp = -1;          /* smoothed hero progress (-1 = not yet primed) */
  var srp = -1;         /* smoothed rail progress */
  var stageNow = -1;    /* stage currently applied to the DOM */

  /* Layout reads are expensive and, interleaved with the style writes below,
     force a synchronous reflow on every single frame. Everything the engine
     needs from layout is measured here instead, and only on resize. */
  var M = { heroRange: 1, productTop: 0, productRange: 1, railx: 0, off: 0 };

  function measure() {
    var vh = window.innerHeight;
    var vw = window.innerWidth;

    if (hero) M.heroRange = Math.max(1, hero.offsetHeight - vh);

    if (product) {
      M.productTop = product.getBoundingClientRect().top + window.scrollY;
      M.productRange = Math.max(1, product.offsetHeight - vh);
    }
    if (rail) M.railx = Math.max(0, rail.scrollWidth - vw);

    /* How far the device swings away from centre. Solved from the real width
       of the stage-1 copy so text and device can never overlap. */
    var half = Math.min(vh * 0.17, 150);
    var copy0 = q('[data-hero-copy="0"]');
    var copyRight = copy0
      ? Math.max.apply(null, Array.prototype.map.call(copy0.children, function (el) {
          return el.getBoundingClientRect().right;
        }))
      : vw / 2;
    var minOff = copyRight + 24 - vw / 2 + half;
    var maxOff = vw >= 1200 ? vw / 2 - 40 - 232 - half : vw / 2 - 24 - half;
    M.off = Math.min(Math.max(minOff, Math.min(vw * 0.24, 380)), maxOff);
  }

  function resetVars() {
    ['--hero', '--rail', '--scr', '--v1', '--v2', '--v3'].forEach(function (k) {
      root.style.setProperty(k, '0');
    });
    root.style.setProperty('--v0', '1');
    ['--r0', '--r1', '--r2', '--r3'].forEach(function (k) {
      root.style.setProperty(k, '0deg');
    });
    root.style.setProperty('--depth', '0');
    root.style.setProperty('--ry', '0deg');
    root.style.setProperty('--ptx', '0px');
    root.style.setProperty('--railx', '0px');
    sp = srp = -1;
    stageNow = -1;
    copies.forEach(function (el) { el.classList.remove('is-on', 'is-prev'); });
    hudStages.forEach(function (el) { el.classList.remove('is-on'); });
  }

  /* Frame-rate independent damping: `rate` is the fraction of the remaining
     distance covered in one 60fps frame, re-solved for the real frame time so
     a 120Hz display and a stuttering 30fps frame settle identically. */
  function chase(current, target, rate, dt) {
    return current + (target - current) * (1 - Math.pow(1 - rate, dt / 16.667));
  }

  /* Paint one frame from the smoothed progress values. */
  function render() {
    root.style.setProperty('--hero', sp.toFixed(4));

    /* --- the device -----------------------------------------------------
       These are four photographs of four different faces, not frames of a
       render. Cross-fading them shows two phones at once; spinning them on
       rotateY turns a flat photo edge-on and the product becomes a sliver.
       Both read as a gimmick.

       So the device never rotates and is never translucent. It holds one
       face, perfectly still, for as long as its copy is on screen. It only
       moves when the copy changes: it sweeps across to the other side of
       the headline, falling back through depth as it goes (smaller, softer,
       darker), and the face is exchanged at the far point of that arc where
       it is at its most defocused. The movement covers the change, the way
       a camera move covers a cut. */
    var B1 = [0.28, 0.46];               /* stage 1 -> 2 */
    var B2 = [0.66, 0.84];               /* stage 2 -> 3 */
    var b1 = clamp((sp - B1[0]) / (B1[1] - B1[0]));
    var b2 = clamp((sp - B2[0]) / (B2[1] - B2[0]));

    /* 0 while the device rests, 1 at the far point of a sweep. */
    var peak1 = Math.sin(Math.PI * b1) * (b1 > 0 && b1 < 1 ? 1 : 0);
    var peak2 = Math.sin(Math.PI * b2) * (b2 > 0 && b2 < 1 ? 1 : 0);
    var depth = Math.max(peak1, peak2);

    var stage = b1 < 0.5 ? 0 : b2 < 0.5 ? 1 : 2;

    /* Each stage gets one face: front, then the back, then the profile.
       DOM order is front, profile, back, profile-left. */
    var FACE = [0, 2, 1];
    for (var i = 0; i < 4; i++) {
      root.style.setProperty('--v' + i, i === FACE[stage] ? '1' : '0');
    }

    /* A shallow turn into the sweep - enough to feel like the device is
       being handed from one side to the other, far short of edge-on. */
    root.style.setProperty('--ry', (peak2 * 13 - peak1 * 13).toFixed(2) + 'deg');
    root.style.setProperty('--depth', depth.toFixed(3));

    /* The device always sits opposite the active copy column. */
    var dir = 1 - 2 * ease(b1) + 2 * ease(b2);
    root.style.setProperty('--ptx', (dir * M.off).toFixed(1) + 'px');

    /* The swap lands at the far point of the sweep, so copy and device
       change on the same beat instead of taking turns. */
    if (stage !== stageNow) {
      var back = stage < stageNow && stageNow !== -1;
      stageNow = stage;
      copies.forEach(function (el) {
        var on = Number(el.dataset.heroCopy) === stage;
        el.classList.toggle('is-on', on);
        /* The leaving copy exits the way the reader is travelling. */
        el.classList.toggle('is-prev', !on && back);
      });
      hudStages.forEach(function (el) {
        el.classList.toggle('is-on', Number(el.dataset.hudStage) === stage);
      });
    }
  }

  function frame(now) {
    raf = 0;
    if (!DESKTOP.matches) return;

    var dt = Math.min(50, last ? now - last : 16.7);
    last = now;

    var y = window.scrollY;
    root.style.setProperty('--scr', String(Math.round(y * 0.15)));
    root.style.setProperty('--p', Math.min(1, y / window.innerHeight).toFixed(4));

    var moving = false;

    if (hero) {
      var p = clamp(y / M.heroRange);
      if (sp < 0 || REDUCED.matches) sp = p;
      else if (Math.abs(p - sp) > 0.0004) { sp = chase(sp, p, 0.22, dt); moving = true; }
      else sp = p;
      render();
    }

    if (product && rail) {
      var rp = clamp((y - M.productTop) / M.productRange);
      if (srp < 0 || REDUCED.matches) srp = rp;
      else if (Math.abs(rp - srp) > 0.0004) { srp = chase(srp, rp, 0.22, dt); moving = true; }
      else srp = rp;
      root.style.setProperty('--rail', srp.toFixed(4));
      root.style.setProperty('--railx', M.railx + 'px');
    }

    /* Keep the loop alive only while something is still catching up. */
    if (moving) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  function onResize() { measure(); kick(); }

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  window.addEventListener('load', onResize);
  if (DESKTOP.addEventListener) {
    DESKTOP.addEventListener('change', function () { resetVars(); onResize(); });
  }
  if (window.ResizeObserver && hero) {
    /* Web fonts and late images change the copy width the swing is solved
       from; re-measure rather than leave the device parked wrong. */
    new ResizeObserver(onResize).observe(hero);
  }
  measure();
  kick();

  /* ------------------------------------------------------------- reveals - */
  var reveals = qa('[data-reveal]');
  if (REDUCED.matches || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 15% 0px' });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = ((i % 6) * 60) + 'ms';
      io.observe(el);
    });
  }

  /* -------------------------------------------------------------- drawer - */
  var drawer = q('[data-drawer]');
  var overlay = q('[data-drawer-overlay]');
  var lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    closeMenu();
    var first = q('input, select, textarea, button', drawer);
    if (first) first.focus();
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  qa('[data-open-contact]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); openDrawer(); });
  });
  qa('[data-close-contact]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); closeDrawer(); });
  });
  if (overlay) overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawer(); closeMenu(); }
  });

  /* --------------------------------------------------------- mobile menu - */
  var burger = q('[data-burger]');
  var menu = q('[data-mobile-menu]');

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove('is-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  }

  if (burger && menu) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    qa('a', menu).forEach(function (a) { a.addEventListener('click', closeMenu); });
  }

  /* ------------------------------------------------------- region tabs -- */
  var regionBtns = qa('[data-region]');
  var countryList = q('[data-countries]');
  var regionPanels = qa('[data-region-panel]');

  if (regionBtns.length && countryList) {
    /* Every region is server-rendered as its own panel, so switching tabs is
       a visibility toggle rather than a re-render. That keeps all the market
       links in the DOM for crawlers and lets the section work without JS. */
    var showRegion = function (key) {
      regionPanels.forEach(function (panel) {
        panel.hidden = panel.dataset.regionPanel !== key;
      });
    };

    regionBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        regionBtns.forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
        btn.setAttribute('aria-selected', 'true');
        showRegion(btn.dataset.region);
      });
    });
  }

  /* --------------------------------------------------------- scrollspy --- */
  var navLinks = qa('.nav__links a[href*="#"]');
  var targets = navLinks
    .map(function (a) {
      var id = a.getAttribute('href').split('#')[1];
      var el = id ? document.getElementById(id) : null;
      return el ? { link: a, el: el } : null;
    })
    .filter(Boolean);

  if (targets.length) {
    var spy = function () {
      var line = window.scrollY + window.innerHeight * 0.35;
      var active = null;
      targets.forEach(function (t) {
        if (t.el.getBoundingClientRect().top + window.scrollY <= line) active = t;
      });
      targets.forEach(function (t) { t.link.classList.toggle('is-active', t === active); });
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }
})();

/* =========================================================================
   Language switcher (v4.0, 2026-09-08). Inert when no switcher is rendered.
   ========================================================================= */
(function () {
  'use strict';
  var switchers = Array.prototype.slice.call(document.querySelectorAll('.langsw'));
  if (!switchers.length) return;

  var closeAll = function (except) {
    switchers.forEach(function (sw) {
      if (sw === except) return;
      sw.classList.remove('is-open');
      var b = sw.querySelector('[data-langsw]');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  };

  switchers.forEach(function (sw) {
    var btn = sw.querySelector('[data-langsw]');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = sw.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      closeAll(sw);
    });
  });

  document.addEventListener('click', function () { closeAll(null); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll(null);
  });
})();
