/* =========================================================================
   SAMS Mobile — hero rotator
   Auto-rotating product showcase. Six faces, each with its benefit copy
   (reused verbatim from the anatomy section so the two never drift).
   ========================================================================= */
(function () {
  'use strict';

  var DUR     = 4000;   /* ms per face */
  var SWAP    = 210;    /* camera-move duration before the face changes */
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  var FACES = [
    { img: 'phone-front.webp',       label: 'Front',  desc: 'Glove-capable touchscreen with Ex marking and front camera' },
    { img: 'phone-back-clean.webp',  label: 'Rear',   desc: '50 MP AI camera, speaker grille and certification plate' },
    { img: 'phone-left.webp',        label: 'Left',   desc: 'Volume keys and programmable side key' },
    { img: 'phone-right.webp',       label: 'Right',  desc: 'Sealed side port and label recess' },
    { img: 'phone-top.webp',         label: 'Top',    desc: 'Dedicated red SOS key beside the power key' },
    { img: 'phone-bottom.webp',      label: 'Bottom', desc: 'Sealed USB charging port and lanyard anchor' }
  ];

  var stage = document.querySelector('.hero__stage');
  if (!stage) return;

  /* ---------------------------------------------------------------- build */
  var hx = document.createElement('div');
  hx.className = 'hx';
  hx.setAttribute('data-hero-rotator', '');
  hx.style.setProperty('--hx-dur', DUR + 'ms');

  var device = document.createElement('div');
  device.className = 'hx__device';
  FACES.forEach(function (f, i) {
    var img = document.createElement('img');
    img.src = 'assets/img/' + f.img;
    img.alt = 'SAMS Smart Ex-04 — ' + f.label.toLowerCase() + ' view';
    img.width = 722; img.height = 1356;
    if (i === 0) { img.className = 'is-active'; img.fetchPriority = 'high'; }
    else { img.loading = 'lazy'; }
    device.appendChild(img);
  });

  var info = document.createElement('div');
  info.className = 'hx__info';
  info.setAttribute('aria-live', 'polite');
  info.innerHTML =
    '<span class="hx__index"></span>' +
    '<h3 class="hx__label"></h3>' +
    '<p class="hx__desc"></p>';

  var controls = document.createElement('div');
  controls.className = 'hx__controls';
  var dots = document.createElement('div');
  dots.className = 'hx__dots';
  dots.setAttribute('role', 'tablist');
  dots.setAttribute('aria-label', 'Device views');
  FACES.forEach(function (f, i) {
    var b = document.createElement('button');
    b.className = 'hx__dot';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', f.label + ' view');
    b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    b.addEventListener('click', function () { go(i, true); });
    dots.appendChild(b);
  });

  var pause = document.createElement('button');
  pause.className = 'hx__pause';
  pause.type = 'button';
  pause.setAttribute('aria-label', 'Pause rotation');
  pause.textContent = '❚❚';

  controls.appendChild(dots);
  controls.appendChild(pause);
  hx.appendChild(device);
  hx.appendChild(info);
  hx.appendChild(controls);
  stage.appendChild(hx);

  var imgs    = device.querySelectorAll('img');
  var dotEls  = dots.querySelectorAll('.hx__dot');
  var elIndex = info.querySelector('.hx__index');
  var elLabel = info.querySelector('.hx__label');
  var elDesc  = info.querySelector('.hx__desc');

  /* ----------------------------------------------------------------- run */
  var cur = 0, timer = 0, userPaused = false, hovered = false;

  function paint(i) {
    imgs.forEach(function (im, n) { im.classList.toggle('is-active', n === i); });
    dotEls.forEach(function (d, n) { d.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
    elIndex.textContent = ('0' + (i + 1)).slice(-2) + ' / 0' + FACES.length;
    elLabel.textContent = FACES[i].label;
    elDesc.textContent  = FACES[i].desc;
  }

  function go(i, fromClick) {
    if (i === cur && !fromClick) return;
    cur = (i + FACES.length) % FACES.length;

    if (REDUCED.matches) { paint(cur); schedule(); return; }

    device.classList.add('is-swapping');
    info.classList.add('is-swapping');
    setTimeout(function () {
      paint(cur);
      device.classList.remove('is-swapping');
      info.classList.remove('is-swapping');
    }, SWAP);

    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (userPaused || hovered || REDUCED.matches) return;
    timer = setTimeout(function () { go(cur + 1); }, DUR);
  }

  function setPaused(on) {
    hx.classList.toggle('is-paused', on || userPaused);
    if (on || userPaused) clearTimeout(timer); else schedule();
  }

  pause.addEventListener('click', function () {
    userPaused = !userPaused;
    pause.textContent = userPaused ? '▶' : '❚❚';
    pause.setAttribute('aria-label', userPaused ? 'Resume rotation' : 'Pause rotation');
    setPaused(userPaused);
  });

  /* Pause while the visitor is reading or interacting. */
  hx.addEventListener('mouseenter', function () { hovered = true;  setPaused(true); });
  hx.addEventListener('mouseleave', function () { hovered = false; setPaused(false); });
  hx.addEventListener('focusin',    function () { hovered = true;  setPaused(true); });
  hx.addEventListener('focusout',   function () { hovered = false; setPaused(false); });

  /* Don't burn cycles in a background tab. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearTimeout(timer); else schedule();
  });

  /* Keyboard: arrows move between views. */
  dots.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    var next = cur + (e.key === 'ArrowRight' ? 1 : -1);
    go(next, true);
    dotEls[(next + FACES.length) % FACES.length].focus();
  });

  paint(0);
  schedule();
})();
