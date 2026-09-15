/* =========================================================================
   CERTIFICATION JOURNEY

   Vertical scroll drives horizontal travel. The section owns a runway whose
   height this file writes: stage height + exactly the distance the track has
   to move. That 1:1 mapping is the whole point - a pixel of scroll is a pixel
   of card movement, so the row feels attached to the wheel rather than
   playing back at some invented rate. It also means the release is automatic:
   the last card lands as the runway ends, and the page carries on.

   Two rules keep it smooth:

     1. Nothing reads layout in the frame loop. Track width, card centres,
        runway top and range are measured once and re-measured only when
        something actually resizes. The loop reads window.scrollY - a value
        the browser already has - and writes transforms.

     2. Scroll position is a TARGET, never the value drawn. The drawn value
        eases toward it a fraction each frame, which turns the coarse, uneven
        jumps a wheel delivers into a continuous glide with a little inertia.
        0.12 is deliberately close to the scroll: enough to smooth a notch,
        not enough to feel like lag.

   Each card's distance from the centre of the viewport becomes --f, 0 to 1,
   and the stylesheet hangs scale, opacity, shadow, border and logo colour off
   that single number - so the depth hierarchy cannot drift out of step with
   the movement.
   ========================================================================= */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  var section = document.querySelector('[data-cx]');
  if (!section) { return; }

  var runway   = section.querySelector('[data-cx-runway]');
  var stage    = section.querySelector('[data-cx-stage]');
  var viewport = section.querySelector('[data-cx-viewport]');
  var track    = section.querySelector('[data-cx-track]');
  var bar      = section.querySelector('[data-cx-bar]');
  var readout  = section.querySelector('[data-cx-now]');
  var cards    = [].slice.call(section.querySelectorAll('[data-cx-card]'));
  if (!runway || !stage || !viewport || !track || !cards.length) { return; }

  /* Reduced motion gets the CSS fallback: a plain scrollable, snapping row.
     Nothing here runs, and the runway keeps its natural height. */
  if (REDUCED.matches) { return; }

  var EASE = 0.12;
  var FALLOFF = 0.62;     /* how far, in viewports, a card fades to --f = 0 */

  /* every measurement the loop needs, taken outside it */
  var M = { top: 0, range: 1, travel: 0, hold: 0, mid: 0, centers: [] };
  var cur = 0, target = 0, raf = 0, running = false, shown = -1, measured = false;

  function measure() {
    var vpW = viewport.clientWidth;

    /* Centre the first and last card on their own end of the journey. With a
       plain page-margin gutter the row opens with card 02 already in the
       middle and card 01 stranded at the edge; a gutter of exactly half the
       leftover width means the journey runs 01 centred -> 06 centred, and
       every card in between passes dead through the middle. Written before
       anything is measured, because it changes the track's width. */
    var lead = Math.max(0, (vpW - cards[0].offsetWidth) / 2);
    track.style.paddingLeft = track.style.paddingRight = lead + 'px';

    var travel = Math.max(0, track.scrollWidth - vpW);

    /* A beat of scroll at each end where the track does not move. Without it
       the first card is centred for exactly zero scroll distance - the section
       pins and card 01 is already sliding away before it has registered, so
       the journey reads as starting on card 02. The hold gives the opening and
       closing card a moment to be looked at, and it makes the release at the
       end feel deliberate rather than abrupt. The middle stays 1:1. */
    var hold = travel ? Math.min(260, travel * 0.10) : 0;

    /* tall enough for the whole travel, both holds, and the pin itself */
    runway.style.height = (stage.offsetHeight + travel + hold * 2) + 'px';

    M.hold    = hold;
    M.travel  = travel;
    M.mid     = vpW / 2;
    M.centers = cards.map(function (c) { return c.offsetLeft + c.offsetWidth / 2; });
    M.top     = runway.getBoundingClientRect().top + window.pageYOffset;
    M.range   = Math.max(1, runway.offsetHeight - stage.offsetHeight);
    measured  = true;
  }

  function render() {
    /* cur is progress through the whole runway; the holds are carved off it so
       that prog - and with it the shift, the active card and the bar - covers
       only the part where the track actually moves */
    var prog = M.travel
      ? (cur * M.range - M.hold) / M.travel
      : 0;
    prog = prog < 0 ? 0 : (prog > 1 ? 1 : prog);

    var shift = M.travel * prog;
    track.style.transform = 'translate3d(' + (-shift).toFixed(2) + 'px,0,0)';

    var best = 0, bestDist = Infinity;
    for (var i = 0; i < cards.length; i++) {
      var dist = Math.abs(M.centers[i] - shift - M.mid);
      if (dist < bestDist) { bestDist = dist; best = i; }

      /* 1 dead centre, 0 once a card is FALLOFF viewports away, smoothstepped
         so the focus does not change linearly with distance */
      var f = 1 - Math.min(1, dist / (M.mid * 2 * FALLOFF));
      f = f * f * (3 - 2 * f);

      var card = cards[i];
      card.style.transform =
        'translate3d(0,' + ((1 - f) * 14).toFixed(2) + 'px,0) scale(' + (0.955 + f * 0.045).toFixed(4) + ')';
      card.style.opacity = (0.4 + f * 0.6).toFixed(3);
      card.style.setProperty('--f', f.toFixed(3));
    }

    if (bar) { bar.style.transform = 'scaleX(' + prog.toFixed(4) + ')'; }
    if (readout && best !== shown) {
      shown = best;
      readout.textContent = ('0' + (best + 1)).slice(-2);
    }
  }

  function sample() {
    var p = (window.pageYOffset - M.top) / M.range;
    target = p < 0 ? 0 : (p > 1 ? 1 : p);
  }

  var lastFrame = 0;

  function frame() {
    lastFrame = (window.performance && performance.now) ? performance.now() : Date.now();
    sample();
    var d = target - cur;
    cur = Math.abs(d) < 0.0004 ? target : cur + d * EASE;
    render();
    if (running) { raf = requestAnimationFrame(frame); }
  }

  function start() {
    if (running) { return; }
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  /* --- measuring ---------------------------------------------------------
     ResizeObserver catches the cases a resize event does not: the cards
     reflowing when a web font lands, or the viewport changing because a
     scrollbar appeared.

     This runs synchronously rather than deferring to rAF. Deferring reads
     better, but it makes the whole section depend on a frame being painted -
     and where frames are throttled (a background tab, an embedded webview,
     some remote-rendering surfaces) the re-measure never lands and the runway
     keeps a height computed at the wrong viewport, so nothing moves at all.
     Measuring is a handful of cached reads; the guard stops a burst of
     observer callbacks from re-entering. */
  var measuring = false;
  function remeasure() {
    if (measuring) { return; }
    measuring = true;
    measure();
    sample();
    cur = target;            /* snap after a resize rather than sliding */
    render();
    measuring = false;
  }

  measure();
  sample();
  cur = target;
  render();

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(remeasure);
    ro.observe(viewport);
    ro.observe(track);
  }
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(remeasure); }

  /* --- running only while it is on screen ------------------------------- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
    }, { rootMargin: '20% 0px' }).observe(section);
  } else {
    start();
  }

  /* Belt and braces: a scroll listener samples synchronously whenever the
     frame loop is not actually delivering. That covers both the parked case
     (off screen) and the stalled one - `running` can be true while rAF is
     being throttled, and without the staleness check the section would freeze
     mid-journey with no way to recover. Passive; it never calls
     preventDefault, so it cannot interfere with the page's own scrolling. */
  window.addEventListener('scroll', function () {
    if (!measured) { return; }
    var t = (window.performance && performance.now) ? performance.now() : Date.now();
    if (!running || t - lastFrame > 250) { sample(); cur = target; render(); }
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); } else { start(); }
  });

  /* If the user turns reduced motion on mid-session, hand back to CSS. */
  var onPref = function () {
    if (!REDUCED.matches) { return; }
    stop();
    runway.style.height = '';
    track.style.transform = '';
    cards.forEach(function (c) {
      c.style.transform = ''; c.style.opacity = ''; c.style.removeProperty('--f');
    });
  };
  if (REDUCED.addEventListener) { REDUCED.addEventListener('change', onPref); }
  else if (REDUCED.addListener) { REDUCED.addListener(onPref); }
})();
