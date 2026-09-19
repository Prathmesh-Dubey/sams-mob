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

  /* Act 3 hand-off layer: a live three.js render of the same box, same size,
     that fades in as the flat crossfade above fades out once the sequence
     lands on the spec grid. See the IIFE near the bottom of this file. */
  var model3d = el('div', 'hc__model3d');
  var canvas3d = document.createElement('canvas');
  canvas3d.setAttribute('aria-hidden', 'true');
  model3d.appendChild(canvas3d);
  dev.appendChild(model3d);

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

  var hp = 0, raf = 0, gridLive = false;

  function paint() {
    hc.style.setProperty('--hp', hp.toFixed(4));

    paintModel(hp);

    /* Only let the finished grid take pointer events once it is actually
       on screen, otherwise it swallows clicks through an invisible layer. */
    var live = hp > 0.86;
    if (live !== gridLive) {
      gridLive = live;
      grid.classList.toggle('is-live', live);
      /* the live model only takes pointer input once it has actually
         crossfaded in - see the drag-to-turn handler further down. devbox
         has to come forward too, or .hc__grid (above it, for its own tiles
         and CTAs) intercepts the drag before the canvas ever sees it. */
      model3d.classList.toggle('is-live', live);
      devbox.classList.toggle('is-live', live);
    }
  }

  /* The section is a single viewport tall now, so nothing about it is
     scroll-scrubbed any more: hp is driven by elapsed time instead of scroll
     position, on a rAF loop while the hero is on screen. It plays through
     once per time the hero enters the viewport (so scrolling back up to it
     replays the sequence), then holds on the finished spec grid. An
     IntersectionObserver starts/stops the loop so an idle page costs
     nothing and nothing plays while the hero is off screen. */
  var running = false;
  var DURATION = 9000; // ms for the full act 1 -> act 3 sweep
  var startTs = null;

  function clamp01v(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  function frame(ts) {
    if (startTs === null) { startTs = ts; }
    hp = clamp01v((ts - startTs) / DURATION);
    paint();
    if (hp < 1) {
      raf = requestAnimationFrame(frame);
    } else {
      running = false;
    }
  }

  function start() {
    if (running) { return; }
    running = true;
    startTs = null;
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

  var inView = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        inView = e.isIntersecting;
        if (inView) { start(); } else { stop(); }
      });
    }, { rootMargin: '10% 0px' }).observe(hero);
  } else {
    inView = true;
    start();
  }

  window.addEventListener('resize', placeDevice);
  /* web fonts land after first paint and change how the tile rows wrap, which
     moves the well - re-measure once they have */
  window.addEventListener('load', placeDevice);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(placeDevice); }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { stop(); } else if (inView) { start(); }
  });

  placeDevice();
  paint();

  /* ---------------------------------------------------- act 3 : live model
     Acts 1-2 crossfade flat photographs - cheap, and all that's needed while
     the aperture is still animating. Once the sequence lands on the spec
     grid the device holds still, so that's where it's worth spending a live
     three.js render instead: a real product mesh with real materials reads
     as the actual device, a crossfaded photo reads as a picture of one. It
     shares the .glb fetch kicked off in <head> and the vendored three.js
     modules the technical overview section already uses (via the page's
     import map), so nothing downloads twice.

     It never turns on its own - a spinning prop is a demo-reel cliche, not
     how anyone looks at a real object. It sits still until dragged, and
     stays exactly where it was left the moment the pointer lifts. There is
     therefore no per-frame render loop at all: a frame is drawn only when
     something actually changed (model finish loading, a resize, a drag). */
  if (window.__tovModel) {
    (function () {
      var THREE, renderer, scene, camera, phoneModel, frameBox = null;
      var needsRender = false, renderScheduled = false;

      function requestRender() {
        needsRender = true;
        if (renderScheduled) { return; }
        renderScheduled = true;
        requestAnimationFrame(function () {
          renderScheduled = false;
          if (needsRender && renderer) {
            renderer.render(scene, camera);
            needsRender = false;
          }
        });
      }

      var TEXTURE_FALLBACK = {
        skin_front: 'assets/3d/tex-0.webp',
        skin_edge:  'assets/3d/tex-1.webp',
        skin_back:  'assets/3d/tex-2.webp'
      };
      function repairTextures(root) {
        var texLoader = null;
        root.traverse(function (o) {
          if (!o.isMesh) { return; }
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(function (m) {
            if (!m || m.map) { return; }
            var url = TEXTURE_FALLBACK[m.name];
            if (!url) { return; }
            texLoader = texLoader || new THREE.TextureLoader();
            texLoader.load(url, function (tex) {
              tex.flipY = false;
              tex.colorSpace = THREE.SRGBColorSpace;
              m.map = tex;
              m.needsUpdate = true;
              requestRender();
            });
          });
        });
      }

      function frameModel() {
        if (!frameBox || !camera.aspect) { return; }
        /* A tight fit to the model's resting silhouette - full size, same as
           the flat photo it replaces. This only stays clip-safe because the
           drag below is Y-only (left/right, no tilt): halfW already covers
           the model's full diagonal footprint through a complete turn, and
           a turn around Y alone never changes how tall it reads. Bringing
           back the tilt would need the more conservative sphere-fit this
           replaced, at the cost of exactly the size we're restoring here. */
        var halfFov = (camera.fov * Math.PI) / 360;
        var distForHeight = frameBox.halfH / Math.tan(halfFov);
        var distForWidth  = frameBox.halfW / (Math.tan(halfFov) * camera.aspect);
        var dist = Math.max(distForHeight, distForWidth) * 1.2;
        camera.position.copy(frameBox.dir).multiplyScalar(dist);
        camera.lookAt(0, 0, 0);
        camera.near = Math.max(dist * 0.01, 0.001);
        camera.far  = dist * 4 + frameBox.radius * 4;
        camera.updateProjectionMatrix();
        requestRender();
      }

      function fit() {
        if (!renderer) { return; }
        var w = model3d.clientWidth || 1, h = model3d.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        frameModel();
      }

      /* --------------------------------------------------- press, hold, turn
         A plain click-drag would fire on every stray press - a scroll that
         starts on the canvas, a tap that meant to hit the CTA next to it.
         Holding it still for HOLD_MS before it arms means turning the model
         is always a deliberate choice, not an accident of where the pointer
         happened to land. Once armed, rotation tracks the pointer 1:1 and
         simply stops the instant it lifts - direct manipulation, no
         momentum, no drift, no motion nobody asked for.

         A double-click skips that wait: the second press of a double-click
         (press, release, press again inside DBLCLICK_MS) already IS the
         deliberate signal a single hold is standing in for, so it arms on
         the spot and the very same press can be dragged to turn the model
         without waiting the usual HOLD_MS back out. */
      var HOLD_MS = 280, DRIFT_PX = 6, DBLCLICK_MS = 350;
      var pressed = false, armed = false, holdTimer = 0, lastUpAt = 0;
      var downX = 0, downY = 0, lastX = 0, rotY = 0;

      function arm() {
        if (!pressed) { return; }
        armed = true;
        model3d.classList.add('is-holding');
      }

      function onPointerDown(e) {
        if (!phoneModel) { return; }
        pressed = true;
        armed = false;
        downX = lastX = e.clientX;
        downY = e.clientY;
        if (canvas3d.setPointerCapture) {
          try { canvas3d.setPointerCapture(e.pointerId); } catch (err) { /* no active pointer session to capture - fine, drag still tracks via move/up */ }
        }
        if (e.detail >= 2 || (e.timeStamp - lastUpAt) < DBLCLICK_MS) {
          arm();
        } else {
          holdTimer = setTimeout(arm, HOLD_MS);
        }
      }
      function onPointerMove(e) {
        if (!pressed) { return; }
        if (!armed) {
          /* real movement before the hold fires reads as a scroll/swipe
             past the model, not an attempt to turn it - drop the hold */
          if (Math.abs(e.clientX - downX) > DRIFT_PX || Math.abs(e.clientY - downY) > DRIFT_PX) {
            clearTimeout(holdTimer);
            pressed = false;
          }
          return;
        }
        /* Y only, deliberately - see the note on frameModel(). Vertical
           movement is read only to decide whether an unarmed press was
           really a scroll (above), never to tilt the model. */
        var dx = e.clientX - lastX;
        lastX = e.clientX;
        rotY += dx * 0.012;
        phoneModel.rotation.y = rotY;
        requestRender();
      }
      function onPointerUp(e) {
        clearTimeout(holdTimer);
        pressed = false;
        armed = false;
        lastUpAt = e.timeStamp;
        model3d.classList.remove('is-holding');
        if (canvas3d.releasePointerCapture) {
          try { canvas3d.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
        }
      }
      canvas3d.addEventListener('pointerdown', onPointerDown);
      canvas3d.addEventListener('pointermove', onPointerMove);
      canvas3d.addEventListener('pointerup', onPointerUp);
      canvas3d.addEventListener('pointercancel', onPointerUp);
      /* the browser's own double-click would otherwise try to select text
         behind the canvas on some platforms - nothing here needs it. */
      canvas3d.addEventListener('dblclick', function (e) { e.preventDefault(); });

      Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/libs/meshopt_decoder.module.js'),
        window.__tovModel
      ]).then(function (parts) {
        THREE = parts[0];
        var GLTFLoaderMod = parts[1], MeshoptMod = parts[2], glbBuffer = parts[3];

        renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = false;
        /* Filmic tone mapping + a touch of exposure is what actually reads
           as "real photograph" rather than "flat 3D render" - it rolls off
           the screen's own bright pixels and the key light's hot spots
           instead of clipping them straight to white. */
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);

        scene.add(new THREE.HemisphereLight(0xffffff, 0xe7e2d6, 1.15));
        var key = new THREE.DirectionalLight(0xffffff, 2.5);
        key.position.set(3, 5.5, 4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.bias = -0.0003;
        key.shadow.radius = 3;
        scene.add(key);
        var fillLight = new THREE.DirectionalLight(0xdfeaf6, 0.6);
        fillLight.position.set(-4, 2, -3);
        scene.add(fillLight);
        /* Low rim from behind so the edge of the case separates from the
           backdrop instead of the silhouette going flat and cardboard-like
           in the shadowed three-quarter. */
        var rim = new THREE.DirectionalLight(0xbfd6ff, 0.7);
        rim.position.set(-2, 1.5, -5);
        scene.add(rim);

        /* --------------------------------------------------------- shine
           Directional lights alone light a surface but never populate what
           a glossy one reflects, so the glass over the screen and the metal
           trim read as matte paint no matter how bright the key light is.
           A tiny studio - a few soft panels lit at different brightnesses,
           baked into a reflection map with PMREMGenerator - gives those
           materials something real to mirror: the screen throws back a
           soft window-shaped highlight, the frame picks up a graduated
           edge, both shifting believably as the model turns. Built from
           primitives rather than an HDRI file, so nothing extra downloads. */
        (function () {
          var studio = new THREE.Scene();
          function panel(color, intensity, x, y, z, scale) {
            var mat = new THREE.MeshBasicMaterial({ color: color });
            var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
            mesh.material.color.multiplyScalar(intensity);
            mesh.position.set(x, y, z);
            mesh.scale.setScalar(scale);
            mesh.lookAt(0, 0, 0);
            studio.add(mesh);
          }
          panel(0xffffff, 5.5, 0, 6, 2, 7);     // soft overhead softbox
          panel(0xffffff, 1.4, 0, -5, -2, 7);   // dim floor bounce
          panel(0xcfe0ff, 3.2, 5, 1, 3, 4);     // cool key-side panel
          panel(0xffe6c2, 1.6, -5, 0, -3, 4);   // warm fill-side panel
          panel(0xffffff, 4.5, 0, 1, 6, 3);     // frontal window - the screen's highlight
          var pmrem = new THREE.PMREMGenerator(renderer);
          scene.environment = pmrem.fromScene(studio, 0.035).texture;
          pmrem.dispose();
        })();

        var loader = new GLTFLoaderMod.GLTFLoader();
        // The .glb ships meshopt-compressed + quantised, same as the tech
        // overview viewer's copy - it is, in fact, the same bytes.
        loader.setMeshoptDecoder(MeshoptMod.MeshoptDecoder);

        loader.parse(glbBuffer, '', function (gltf) {
          phoneModel = gltf.scene;
          phoneModel.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
          repairTextures(phoneModel);

          var box = new THREE.Box3().setFromObject(phoneModel);
          var sphere = box.getBoundingSphere(new THREE.Sphere());
          phoneModel.position.sub(sphere.center);
          scene.add(phoneModel);

          var size = box.getSize(new THREE.Vector3());
          frameBox = {
            halfH: size.y / 2,
            halfW: Math.sqrt(size.x * size.x + size.z * size.z) / 2,
            radius: sphere.radius,
            dir: new THREE.Vector3(0.42, 0.2, 0.88).normalize()
          };

          var span = sphere.radius * 3;
          key.shadow.camera.left = -span; key.shadow.camera.right = span;
          key.shadow.camera.top = span; key.shadow.camera.bottom = -span;
          key.shadow.camera.updateProjectionMatrix();

          var ground = new THREE.Mesh(new THREE.PlaneGeometry(span * 4, span * 4), new THREE.ShadowMaterial({ opacity: 0.16 }));
          ground.rotation.x = -Math.PI / 2;
          ground.position.y = box.min.y - sphere.center.y;
          ground.receiveShadow = true;
          scene.add(ground);

          fit();
          renderer.compile(scene, camera);
          renderer.shadowMap.needsUpdate = true;
          requestRender();

          if ('ResizeObserver' in window) { new ResizeObserver(fit).observe(model3d); }
        });
      }).catch(function (err) {
        /* the flat crossfade photo stays put on failure - nothing to undo */
        console.error(err);
      });
    })();
  }
})();
