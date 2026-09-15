/* =========================================================================
   HERO CINEMA
   Scroll-scrubbed hero. One value - --hp, 0 to 1 - is written on rAF and
   every visual in the sequence is a pure function of it, so the whole thing
   is frame-rate independent and never reads layout mid-scroll.

   Content is MOVED from the existing hero, never invented or dropped:
     h1            -> split across the aperture
     .hero__meta   -> the eyebrow
     lede + CTAs   -> the tail under the spec grid
     6 .hud-stage
     2 .hud-panel  -> the eight tiles of the final grid
   ========================================================================= */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* The six faces of the model. `n` is each face's normal in CSS axes
     (x right, y DOWN, z toward the viewer), which is what decides both which
     face the caption is describing and how much light that face catches.
     The array order is also the order the horizontal orbit reaches them:
     rotateY(+90) brings the -x face round to the front, so front, left, rear,
     right is exactly one positive turn. */
  var FACES = [
    { img: 'm360/front.webp',  key: 'front',  label: 'Front',  n: [ 0,  0,  1], desc: 'Glove-capable touchscreen with Ex marking and front camera' },
    { img: 'm360/left.webp',   key: 'left',   label: 'Left',   n: [-1,  0,  0], desc: 'Volume keys and programmable side key' },
    { img: 'm360/back.webp',   key: 'back',   label: 'Rear',   n: [ 0,  0, -1], desc: '50 MP AI camera, speaker grille and certification plate' },
    { img: 'm360/right.webp',  key: 'right',  label: 'Right',  n: [ 1,  0,  0], desc: 'Sealed side port and label recess' },
    { img: 'm360/top.webp',    key: 'top',    label: 'Top',    n: [ 0, -1,  0], desc: 'Dedicated red SOS key beside the power key' },
    { img: 'm360/bottom.webp', key: 'bottom', label: 'Bottom', n: [ 0,  1,  0], desc: 'Sealed USB charging port and lanyard anchor' }
  ];

    var hero  = document.querySelector('.hero');
  var stage = document.querySelector('.hero__stage');
  var copy  = document.querySelector('.hero__copy[data-hero-copy="0"]') || document.querySelector('.hero__copy');
  if (!hero || !stage || !copy) { return; }

  var h1   = copy.querySelector('h1');
  var lede = copy.querySelector('p');
  var cta  = copy.querySelector('.hero__cta');
  var meta = copy.querySelector('.hero__meta');
  if (!h1) { return; }

  /* --- split the existing sentence, no new copy ------------------------ */
  var accent = h1.querySelector('.accent');
  var rightText = accent ? accent.textContent.trim() : '';
  var probe = h1.cloneNode(true);
  var pAcc = probe.querySelector('.accent');
  if (pAcc) { pAcc.remove(); }
  var leftText = probe.textContent.replace(/\s+/g, ' ').trim();
  if (!rightText) {
    var bits = leftText.split('. ');
    leftText = bits[0] + '.';
    rightText = bits.slice(1).join('. ');
  }
  var fullTitle = (leftText + ' ' + rightText).trim();

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }

  /* ------------------------------------------------------------- build */
  var hc = el('div', 'hc');

  var media = el('div', 'hc__media');
  var plate = el('div', 'hc__plate');
  /* Set background-image directly: a url() inside a custom property
     resolves against the stylesheet that consumes it, not the document. */
  plate.style.backgroundImage = "url('" + new URL('assets/img/bg-main2.webp', document.baseURI).href + "')";
  media.appendChild(plate);

  var dev = el('div', 'hc__device');
  var model = el('div', 'hc__model');

  /* Three solid planes through the middle of the box, one per axis. Nothing
     of them is ever meant to be seen head-on - they exist so that the
     hairline where two renders meet, and the small notches where their
     rounded corners leave the box's square corner uncovered, show dark body
     colour rather than the background showing straight through the phone.
     Without them the device reads as flat cut-outs propped against each
     other the moment it turns off-square. */
  ['z', 'x', 'y'].forEach(function (axis) {
    model.appendChild(el('div', 'hc__core hc__core--' + axis));
  });

  FACES.forEach(function (f, i) {
    var fc = el('div', 'hc__f hc__f--' + f.key);
    var img = document.createElement('img');
    img.src = 'assets/img/' + f.img;
    /* only the face that is actually readable head-on carries the alt text;
       the other five are the same product from another side */
    if (i === 0) { img.alt = 'SAMS Smart Ex-04'; img.fetchPriority = 'high'; }
    else { img.alt = ''; img.setAttribute('aria-hidden', 'true'); img.loading = 'eager'; }
    fc.appendChild(img);
    f.el = fc;
    model.appendChild(fc);
  });
  dev.appendChild(model);

  /* The device gets its own full-stage layer rather than living inside
     .hc__media. The media box is scaled and brightened across the scroll, and
     while that is right for the backdrop plate it also meant the device was
     being measured in one coordinate space and drawn in another - so the
     offset that drops it into the spec grid's well could never be exact.
     Separate layers, exact placement. */
  var devbox = el('div', 'hc__devbox');
  devbox.appendChild(dev);

  hc.appendChild(media);
  hc.appendChild(devbox);

  /* act 1 - eyebrow + split headline */
  if (meta) {
    var mt = el('div', 'hc__meta');
    mt.innerHTML = meta.innerHTML;
    hc.appendChild(mt);
  }
  var band = el('div', 'hc__band');
  h1.className = 'hc__half hc__half--l';   /* move the real h1, do not clone */
  h1.textContent = leftText;
  band.appendChild(h1);
  band.appendChild(el('div', 'hc__spacer'));
  band.appendChild(el('p', 'hc__half hc__half--r', rightText));
  hc.appendChild(band);

  /* act 2 - the scrub caption */
  var scrub = el('div', 'hc__scrub');
  scrub.setAttribute('aria-live', 'polite');
  scrub.innerHTML = '<div class="hc__face"></div><p class="hc__desc"></p>';
  hc.appendChild(scrub);

  /* act 3 - the grid, built from the HUD blocks.

     Everything act 3 shows is a child of this one grid: the title, the two
     flanking columns, the well the device lands in, the pair of status tiles
     and the lede/CTA tail. It used to be three absolutely positioned layers
     - the tile grid, the title, the tail - each with its own bottom offset
     and its own clamp, which is why they collided at some viewport heights
     and why the lede had to be hidden below 1000px tall to keep it off the
     tiles. In one grid they simply cannot overlap, at any size. */
  var grid  = el('div', 'hc__grid');
  /* Act 3 headline: the two halves of the sentence flank the device instead of
     sitting centred above it. Each half breaks as first word / second word /
     remainder, which gives "One | Explosion | Proof Phone." on the left and
     "Every | Major | Ex Standard." on the right. The h2 still carries the whole
     sentence as text, so nothing changes for crawlers or screen readers. */
  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function triad(text) {
    var w = String(text).split(/\s+/).filter(Boolean);
    if (w.length < 3) { return w.length ? [w.join(' ')] : []; }
    return [w[0], w[1], w.slice(2).join(' ')];
  }
  function half(side, text) {
    return '<span class="hc__hl hc__hl--' + side + '">'
         + triad(text).map(function (line) {
             return '<span class="hc__hl-line">' + esc(line) + '</span>';
           }).join(' ')
         + '</span>';
  }
  var title = el('h2', 'hc__title hc__title--split');
  title.innerHTML = half('l', leftText)
                  + '<span class="hc__hl-gap" aria-hidden="true"></span> '
                  + half('r', rightText);
  var colL  = el('div', 'hc__col hc__col--l');
  var well  = el('div', 'hc__well');
  var colR  = el('div', 'hc__col hc__col--r');
  var pair  = el('div', 'hc__pair');
  var tail  = el('div', 'hc__tail');

  var huds = [].slice.call(document.querySelectorAll('.hud-stage, .hud-panel'));
  huds.forEach(function (h, i) {
    h.removeAttribute('aria-hidden');
    h.removeAttribute('data-hud-stage');
    /* .hc__tile carries the look; the modifier is deliberately NOT
       .hc__tile--N, because every one of those in light-redesign.css is
       absolute placement for the old overlay and would fight this grid. */
    h.className = 'hc__tile hc__t hc__t--' + (i + 1);
    (i < 3 ? colL : i < 6 ? colR : pair).appendChild(h);
  });

  if (lede) { var lp = el('p', 'hc__lede'); lp.innerHTML = lede.innerHTML; tail.appendChild(lp); }
  if (cta)  { var cw = el('div', 'hc__cta'); cw.innerHTML = cta.innerHTML; tail.appendChild(cw); }

  [title, colL, well, colR, pair, tail].forEach(function (n) { grid.appendChild(n); });
  hc.appendChild(grid);

  var cue = el('div', 'hc__cue', 'Scroll <span></span>');
  hc.appendChild(cue);

  copy.style.display = 'none';
  stage.appendChild(hc);

  var face  = scrub.querySelector('.hc__face');
  var desc  = scrub.querySelector('.hc__desc');

  /* ------------------------------------------------------- device placing
     The device is centred on the stage for acts 1 and 2, but in act 3 it
     belongs in the well the grid leaves for it - which is not the stage
     centre, because the grid carries a title above it and two status tiles
     plus the lede below. That offset depends on how tall those rows actually
     wrap at the current width, so it is measured rather than guessed at with
     a vh clamp that only holds at one viewport. --dev-y is read once per
     layout, and the CSS eases the device into it as the grid lands.

     It is a transform, so moving the device cannot move the well: no loop. */
  function placeDevice() {
    var s = stage.getBoundingClientRect();
    var w = well.getBoundingClientRect();
    if (!w.height || !s.height) { return; }
    var dy = (w.top + w.height / 2) - (s.top + s.height / 2);
    hc.style.setProperty('--dev-y', dy.toFixed(1) + 'px');
  }

  /* ----------------------------------------------------------- the turn
     Keys are [hp, ry, rx] in degrees, eased between with a smoothstep. The
     repeated keys are deliberate dwells: without them the phone sweeps past
     each face too fast to read, and the whole thing looks like a spinning
     prop rather than a product being shown.

       ry 0 -> 360   one full horizontal orbit: front, left, rear, right,
                     back to front
       rx -90        tips the top edge toward the camera
       rx +90        carries on through front to the bottom edge

     It opens and closes on a dead-square front view - no lean at either end -
     because that is the shot the headline sits beside at the start and the
     one the spec grid's callouts annotate at the finish. */
  /* Six stops, front to front: front, left, back, right, top, bottom, front.
     Simple crossfade between flat photographs - no rotation, no lighting
     model. Each stop holds (DWELL) before fading into the next so a face is
     actually readable, not just glimpsed mid-transition. */
  var STOPS = [0, 1, 2, 3, 4, 5, 0];
  var N = STOPS.length - 1;
  var DWELL = 0.6;

  function smooth(t) { return t * t * (3 - 2 * t); }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  var shown = -1;

  function paintModel(hp) {
    var segF = clamp01(hp) * N;
    var i = Math.min(N - 1, Math.floor(segF));
    var t = segF - i;
    var aIdx = STOPS[i], bIdx = STOPS[i + 1];
    var cross = smooth(clamp01((t - DWELL) / (1 - DWELL)));

    FACES.forEach(function (f, idx) {
      var op = 0;
      if (idx === aIdx) { op = Math.max(op, 1 - cross); }
      if (idx === bIdx) { op = Math.max(op, cross); }
      f.el.style.opacity = op.toFixed(3);
    });

    var active = cross < 0.5 ? aIdx : bIdx;
    if (active !== shown) {
      shown = active;
      face.textContent = ('0' + (active + 1)).slice(-2) + ' / 06  ' + FACES[active].label;
      desc.textContent = FACES[active].desc;
    }
  }

  var hp = 0, target = 0, raf = 0, gridLive = false;

  function paint() {
    hc.style.setProperty('--hp', hp.toFixed(4));

    paintModel(hp);

    /* Only let the finished grid take pointer events once it is actually
       on screen, otherwise it swallows clicks through an invisible layer. */
    var live = hp > 0.86;
    if (live !== gridLive) {
      gridLive = live;
      grid.classList.toggle('is-live', live);
    }
  }

  /* A rAF loop while the hero is on screen, rather than a scroll listener.
     Scroll events can be throttled, coalesced, or not fired at all for
     programmatic scrolling; a frame loop is immune to all of that and gives
     the scrub one sample per painted frame, which is what makes it smooth.
     An IntersectionObserver parks the loop whenever the hero is off screen,
     so an idle page costs nothing.

     The raw scroll position is only ever a *target* - hp itself eases
     toward it a fraction of the remaining distance every frame. That turns
     every mouse-wheel tick or trackpad flick, which arrives in coarse,
     uneven jumps, into a continuous glide, the same trick smooth-scroll
     libraries use. */
  var running = false;
  var EASE = 0.14;

  function sample() {
    var r = hero.getBoundingClientRect();
    var range = r.height - window.innerHeight;
    var p = range > 0 ? (-r.top) / range : 0;
    target = p < 0 ? 0 : (p > 1 ? 1 : p);
  }

  function frame() {
    sample();
    var d = target - hp;
    hp = Math.abs(d) < 0.0006 ? target : hp + d * EASE;
    paint();
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

  if (REDUCED.matches) {
    hc.style.setProperty('--hp', '0');
    placeDevice();
    paintModel(0);
    grid.classList.add('is-live');
    return;
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { start(); } else { stop(); } });
    }, { rootMargin: '10% 0px' }).observe(hero);
  } else {
    start();
  }

  /* Belt and braces: browsers pause rAF for a hidden or backgrounded
     document, and some embedded viewers never paint at all. A scroll and
     resize listener samples synchronously so the sequence still tracks
     even when the frame loop is parked - since nothing is left to ease it
     in on the next tick, this snaps hp straight to the target instead of
     easing. */
  function syncNow() {
    sample();
    hp = target;
    placeDevice();
    paint();
  }
  window.addEventListener('scroll', function () { if (!running) { syncNow(); } }, { passive: true });
  window.addEventListener('resize', function () { placeDevice(); if (!running) { syncNow(); } });
  /* web fonts land after first paint and change how the tile rows wrap, which
     moves the well - re-measure once they have */
  window.addEventListener('load', placeDevice);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(placeDevice); }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); } else { start(); }
  });

  syncNow();
  start();
})();
