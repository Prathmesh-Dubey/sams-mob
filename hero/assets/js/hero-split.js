/* =========================================================================
   SPLIT HERO
   Rebuilds the hero from content already in the page: the H1 is split at its
   .accent span, the lede and CTAs are moved across verbatim. Nothing is
   invented and nothing is discarded - the original block is hidden, not
   removed, so the markup still carries it.
   ========================================================================= */
(function () {
  'use strict';

  var DUR = 4200;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  var FACES = [
    { img: 'phone-front.webp',      label: 'Front',  desc: 'Glove-capable touchscreen with Ex marking and front camera' },
    { img: 'phone-back-clean.webp', label: 'Rear',   desc: '50 MP AI camera, speaker grille and certification plate' },
    { img: 'phone-left.webp',       label: 'Left',   desc: 'Volume keys and programmable side key' },
    { img: 'phone-right.webp',      label: 'Right',  desc: 'Sealed side port and label recess' },
    { img: 'phone-top.webp',        label: 'Top',    desc: 'Dedicated red SOS key beside the power key' },
    { img: 'phone-bottom.webp',     label: 'Bottom', desc: 'Sealed USB charging port and lanyard anchor' }
  ];

  var stage = document.querySelector('.hero__stage');
  var copy  = document.querySelector('.hero__copy[data-hero-copy="0"]') || document.querySelector('.hero__copy');
  if (!stage || !copy) { return; }

  var h1   = copy.querySelector('h1');
  var lede = copy.querySelector('p');
  var cta  = copy.querySelector('.hero__cta');
  var meta = copy.querySelector('.hero__meta');
  if (!h1) { return; }

  var accent = h1.querySelector('.accent');
  var rightText = accent ? accent.textContent.trim() : '';
  var clone = h1.cloneNode(true);
  var cAcc = clone.querySelector('.accent');
  if (cAcc) { cAcc.remove(); }
  var leftText = clone.textContent.replace(/\s+/g, ' ').trim();
  if (!rightText) {
    var parts = leftText.split('. ');
    leftText = parts[0] + '.';
    rightText = parts.slice(1).join('. ');
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }

  var hs = el('div', 'hs');
  hs.style.setProperty('--hs-dur', DUR + 'ms');

  if (meta) {
    var m = el('div', 'hs__meta');
    m.innerHTML = meta.innerHTML;
    hs.appendChild(m);
  }

  var band  = el('div', 'hs__band');
  /* Re-use the original <h1> element rather than cloning one, so the page
     still has exactly one h1 instead of a hidden original plus a new copy. */
  var left = h1;
  left.className = 'hs__half hs__half--l';
  left.textContent = leftText;
  var wrap  = el('div', 'hs__device-wrap');
  var dev   = el('div', 'hs__device');
  var inner = el('div', 'hs__device-inner');

  FACES.forEach(function (f, i) {
    var img = document.createElement('img');
    img.src = 'assets/img/' + f.img;
    img.alt = 'SAMS Smart Ex-04 - ' + f.label.toLowerCase() + ' view';
    img.width = 722;
    img.height = 1356;
    if (i === 0) {
      img.className = 'is-active';
      img.fetchPriority = 'high';
    } else {
      img.loading = 'lazy';
    }
    inner.appendChild(img);
  });
  dev.appendChild(inner);
  wrap.appendChild(dev);

  var right = el('p', 'hs__half hs__half--r', rightText);
  band.appendChild(left);
  band.appendChild(wrap);
  band.appendChild(right);
  hs.appendChild(band);

  var cap = el('div', 'hs__caption');
  cap.setAttribute('aria-live', 'polite');
  cap.innerHTML = '<div class="hs__face"></div><p class="hs__desc"></p>';
  hs.appendChild(cap);

  var rail = el('div', 'hs__rail');
  rail.setAttribute('role', 'tablist');
  rail.setAttribute('aria-label', 'Device views');
  FACES.forEach(function (f, i) {
    var b = el('button', 'hs__tick');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', f.label + ' view');
    b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    b.addEventListener('click', function () { go(i); });
    rail.appendChild(b);
  });
  var pause = el('button', 'hs__pause', '&#10074;&#10074;');
  pause.type = 'button';
  pause.setAttribute('aria-label', 'Pause rotation');
  rail.appendChild(pause);
  hs.appendChild(rail);

  if (lede) {
    var l = el('p', 'hs__lede');
    l.innerHTML = lede.innerHTML;
    hs.appendChild(l);
  }
  if (cta) {
    var c = el('div', 'hs__cta');
    c.innerHTML = cta.innerHTML;
    hs.appendChild(c);
  }

  /* The HUD blocks were choreographed to the old scroll stages. Rather than
     hide them - which would drop ~63 words of real spec copy - they are
     moved into a compact strip under the CTAs. Every word survives. */
  var huds = [].slice.call(document.querySelectorAll('.hud-stage, .hud-panel'));
  if (huds.length) {
    var strip = el('div', 'hs__hud');
    strip.setAttribute('aria-label', 'Device specifications');
    huds.forEach(function (h) {
      h.removeAttribute('aria-hidden');
      h.removeAttribute('data-hud-stage');
      h.className = (h.className || '') + ' hs__hud-item';
      strip.appendChild(h);
    });
    hs.appendChild(strip);
  }

  copy.style.display = 'none';
  stage.appendChild(hs);

  var imgs  = inner.querySelectorAll('img');
  var ticks = rail.querySelectorAll('.hs__tick');
  var face  = cap.querySelector('.hs__face');
  var desc  = cap.querySelector('.hs__desc');

  var cur = 0, timer = 0, userPaused = false, hovered = false;

  function label(i) {
    return ('0' + (i + 1)).slice(-2) + ' - ' + FACES[i].label;
  }

  function paint(i) {
    imgs.forEach(function (im, n) { im.classList.toggle('is-active', n === i); });
    ticks.forEach(function (t, n) { t.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
    face.textContent = label(i);
    desc.textContent = FACES[i].desc;
  }

  function go(i) {
    cur = (i + FACES.length) % FACES.length;
    if (REDUCED.matches) { paint(cur); schedule(); return; }
    cap.classList.add('is-out');
    imgs.forEach(function (im, n) { im.classList.toggle('is-active', n === cur); });
    ticks.forEach(function (t, n) { t.setAttribute('aria-selected', n === cur ? 'true' : 'false'); });
    setTimeout(function () {
      face.textContent = label(cur);
      desc.textContent = FACES[cur].desc;
      cap.classList.remove('is-out');
    }, 200);
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (userPaused || hovered || REDUCED.matches) { return; }
    timer = setTimeout(function () { go(cur + 1); }, DUR);
  }

  function setPaused(on) {
    hs.classList.toggle('is-paused', on || userPaused);
    if (on || userPaused) { clearTimeout(timer); } else { schedule(); }
  }

  pause.addEventListener('click', function () {
    userPaused = !userPaused;
    pause.innerHTML = userPaused ? '&#9654;' : '&#10074;&#10074;';
    pause.setAttribute('aria-label', userPaused ? 'Resume rotation' : 'Pause rotation');
    setPaused(userPaused);
  });
  hs.addEventListener('mouseenter', function () { hovered = true;  setPaused(true); });
  hs.addEventListener('mouseleave', function () { hovered = false; setPaused(false); });
  hs.addEventListener('focusin',    function () { hovered = true;  setPaused(true); });
  hs.addEventListener('focusout',   function () { hovered = false; setPaused(false); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(timer); } else { schedule(); }
  });
  rail.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') { return; }
    e.preventDefault();
    var n = cur + (e.key === 'ArrowRight' ? 1 : -1);
    go(n);
    ticks[(n + FACES.length) % FACES.length].focus();
  });

  /* Parallax: the device leans toward the cursor, damped on rAF so it glides
     instead of tracking the pointer one-to-one. */
  if (!REDUCED.matches && window.matchMedia('(min-width: 901px)').matches) {
    var tx = 0, ty = 0, rx = 0, ry = 0, raf = 0;
    var cx = 0, cy = 0, crx = 0, cry = 0;

    var tick = function () {
      raf = 0;
      cx  += (tx - cx) * 0.07;
      cy  += (ty - cy) * 0.07;
      crx += (rx - crx) * 0.07;
      cry += (ry - cry) * 0.07;
      dev.style.setProperty('--tx', cx.toFixed(2) + 'px');
      dev.style.setProperty('--ty', cy.toFixed(2) + 'px');
      dev.style.setProperty('--px', crx.toFixed(2) + 'deg');
      dev.style.setProperty('--py', cry.toFixed(2) + 'deg');
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1 ||
          Math.abs(rx - crx) > 0.05 || Math.abs(ry - cry) > 0.05) {
        raf = requestAnimationFrame(tick);
      }
    };

    window.addEventListener('mousemove', function (e) {
      var nx = (e.clientX / window.innerWidth) - 0.5;
      var ny = (e.clientY / window.innerHeight) - 0.5;
      tx = nx * 26;
      ty = ny * -16;
      rx = nx * 9;
      ry = ny * -6;
      if (!raf) { raf = requestAnimationFrame(tick); }
    }, { passive: true });
  }

  paint(0);
  schedule();
})();
