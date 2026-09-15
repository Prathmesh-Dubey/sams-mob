
(function(){
  var cine  = document.querySelector('#cc-embed .cine');
  var acts  = [document.getElementById('act0'), document.getElementById('act1'), document.getElementById('act2'), document.getElementById('act3'), document.getElementById('act4')];
  var navItems = document.querySelectorAll('#cc-embed .sidenav__item');
  var railFill = document.getElementById('railFill');
  var dissolve = document.getElementById('dissolve');
  var cue = document.getElementById('cue');

  // ---- Design act: real internal-parts rig -----------------------------
  var rigWrap = document.getElementById('rigWrap');
  var lFront = document.getElementById('lFront');
  var lFrame = document.getElementById('lFrame');
  var lBoard = document.getElementById('lBoard');
  var lBattery = document.getElementById('lBattery');
  var lCamera = document.getElementById('lCamera');
  var lBack = document.getElementById('lBack');
  var designStages = [0,1,2,3,4,5].map(function(i){ return document.getElementById('d'+i); });

  var DESIGN_PARTS = [
    { el:lFrame,   riseFrom:0.05, riseTo:0.21, y:-190, scale:.66 },
    { el:lBoard,   riseFrom:0.21, riseTo:0.37, y:-70,  scale:.66 },
    { el:lBattery, riseFrom:0.37, riseTo:0.53, y:50,   scale:.66 },
    { el:lCamera,  riseFrom:0.51, riseTo:0.67, y:170,  scale:.62 },
    { el:lBack,    riseFrom:0.65, riseTo:0.81, y:290,  scale:.60 }
  ];

  // ---- Imaging act: real camera parts, assembling like Design, with the
  // same premium per-component side callouts as the standalone camera
  // exploded-view prototype (ported in, recoloured for this white theme).
  var cBack = document.getElementById('cBack');
  var cBackImg = cBack.querySelector('img');
  var cBackShowingFront = false;
  var camPin = document.getElementById('camPin');
  var cRing = document.getElementById('cRing');
  var cWindow = document.getElementById('cWindow');
  var cLens = document.getElementById('cLens');
  var cSensor = document.getElementById('cSensor');
  var cFlash = document.getElementById('cFlash');

  // same accumulate/hold/reassemble timing as DESIGN_PARTS, offsets scaled
  // down to what an upright layout actually has room for (Design's rig is
  // rotated to landscape, so the same-looking offsets spread across the
  // wide screen instead of running off the top/bottom of a portrait frame).
  // lens stack comes in LAST (deepest/most-internal component revealed last,
  // right before everything reassembles) - order below is the reveal order.
  var CAM_PARTS = [
    { el:cRing,   riseFrom:0.05, riseTo:0.21, y:-115, scale:.72,
      name:'Camera Ring',   spec:'Weather-sealed bezel, first line of defence against dust and moisture.', side:'right' },
    { el:cWindow, riseFrom:0.21, riseTo:0.37, y:-45,  scale:.75,
      name:'Protective Glass', spec:'Scratch-resistant cover glass, sealed to the housing.', side:'left' },
    { el:cSensor, riseFrom:0.37, riseTo:0.53, y:35,   scale:.62,
      name:'Image Sensor',  spec:'50 MP · PDAF — larger sensor for improved low-light photography.', side:'right' },
    { el:cFlash,  riseFrom:0.51, riseTo:0.67, y:105,  scale:.56,
      name:'LED Flash',     spec:'Always ready, paired to the sensor for balanced exposure.', side:'left' },
    { el:cLens,   riseFrom:0.65, riseTo:0.81, y:170,  scale:.85, isLens:true,
      name:'Lens Stack',    spec:'Multi-element optics feeding the sensor below.', side:'right' }
  ];

  // mount one callout per part - config-driven, not hand-placed in the HTML
  (function(){
    var host = document.getElementById('act3');
    CAM_PARTS.forEach(function(cfg, i){
      var label = document.createElement('div');
      label.className = 'cam-label cam-label--' + cfg.side;
      label.innerHTML =
        '<div class="cam-label__eyebrow">' + (i + 1) + ' / ' + CAM_PARTS.length + '</div>' +
        '<h3 class="cam-label__title">' + cfg.name + '</h3>' +
        '<p class="cam-label__spec">' + cfg.spec + '</p>';
      host.appendChild(label);
      cfg.labelEl = label;
    });
  })();

  function updateCamLabels(dt){
    var activeIdx = -1;
    CAM_PARTS.forEach(function(cfg, i){ if (dt >= cfg.riseFrom) activeIdx = i; });
    if (dt >= 0.90) activeIdx = -1; // reassembling - no callout
    CAM_PARTS.forEach(function(cfg, i){
      var active = i === activeIdx;
      cfg.labelEl.style.opacity = active ? 1 : 0;
      cfg.labelEl.style.transition = 'opacity .4s var(--cc-ease)';
    });
  }

  function lerpN(a,b,t){ return a + (b-a)*t; }
  function mixToward(explodedVal, restVal, t){ return explodedVal + (restVal-explodedVal)*t; }

  // shared by Design (front photo + internal parts) and Imaging (rear photo
  // + camera parts) - same axis-explode / hold / reassemble timing, so both
  // acts read as one consistent visual language.
  function renderExplode(dt, baseEl, baseY, baseScale, parts, stages){
    var collapse = ease(clamp01((dt-0.90)/0.095));
    var baseProg = ease(clamp01(dt/0.16));
    var by = mixToward(lerpN(0,baseY,baseProg), 0, collapse);
    var bs = mixToward(lerpN(1,baseScale,baseProg), 1, collapse);
    baseEl.style.opacity = 1;
    baseEl.style.transform = 'translateY('+by.toFixed(2)+'px) scale('+bs.toFixed(3)+')';

    parts.forEach(function(p){
      var prog = ease(clamp01((dt-p.riseFrom)/(p.riseTo-p.riseFrom)));
      var op = windowOp(dt, p.riseFrom, p.riseTo, 0.90, 0.985);
      var y = mixToward(lerpN(0,p.y,prog), 0, collapse);
      var sc = mixToward(lerpN(.92,p.scale,prog), .94, collapse);
      p.el.style.opacity = op.toFixed(3);
      p.el.style.transform = 'translateY('+y.toFixed(2)+'px) scale('+sc.toFixed(3)+')';
    });

    var stageIdx = Math.min(stages.length-1, Math.floor(dt*stages.length));
    stages.forEach(function(el,i){
      var active = i===stageIdx;
      el.style.opacity = active ? 1 : 0;
      el.style.transform = 'translateY(' + (active?0:14) + 'px)';
      el.style.filter = active ? 'blur(0px)' : 'blur(5px)';
      el.style.transition = 'opacity .4s var(--cc-ease), transform .4s var(--cc-ease), filter .4s var(--cc-ease)';
    });
  }

  // Imaging-specific: ring/window/sensor/flash accumulate exactly like
  // renderExplode's parts do everywhere else, but they clear away together
  // the moment the lens stack starts rising, instead of all lingering until
  // the shared final collapse - so the lens stack gets to stand alone as
  // the hero right before the housing closes back up around it. The lens
  // stack itself still only falls at the shared collapse, same as before.
  function renderImagingExplode(dt, baseEl, baseY, baseScale, parts){
    var collapse = ease(clamp01((dt-0.90)/0.095));
    var baseProg = ease(clamp01(dt/0.16));
    var by = mixToward(lerpN(0,baseY,baseProg), 0, collapse);
    var bs = mixToward(lerpN(1,baseScale,baseProg), 1, collapse);
    baseEl.style.opacity = 1;
    baseEl.style.transform = 'translateY('+by.toFixed(2)+'px) scale('+bs.toFixed(3)+')';

    var lensCfg = parts.filter(function(p){ return p.isLens; })[0];

    parts.forEach(function(p){
      var prog = ease(clamp01((dt-p.riseFrom)/(p.riseTo-p.riseFrom)));
      var fallFrom = p.isLens ? 0.90 : lensCfg.riseFrom;
      var fallTo   = p.isLens ? 0.985 : lensCfg.riseTo;
      var op = windowOp(dt, p.riseFrom, p.riseTo, fallFrom, fallTo);
      var y = mixToward(lerpN(0,p.y,prog), 0, collapse);
      var sc = mixToward(lerpN(.92,p.scale,prog), .94, collapse);
      p.el.style.opacity = op.toFixed(3);
      p.el.style.transform = 'translateY('+y.toFixed(2)+'px) scale('+sc.toFixed(3)+')';
    });
  }

  // ---- Display act: knolled screen-stack parts assemble onto the housing,
  // same explode/hold/reassemble timing as Design's DESIGN_PARTS.
  var dispRig = document.getElementById('dispRig');
  var dispHousing = document.getElementById('dispHousing');
  var dispFrame = document.getElementById('dispFrame');
  var dispModule = document.getElementById('dispModule');
  var dispDigitizer = document.getElementById('dispDigitizer');
  var dispGlass = document.getElementById('dispGlass');

  var DISP_PARTS = [
    { el:dispFrame,     riseFrom:0.05, riseTo:0.26, y:-70,  scale:.90 },
    { el:dispModule,    riseFrom:0.26, riseTo:0.47, y:-140, scale:.86 },
    { el:dispDigitizer, riseFrom:0.47, riseTo:0.68, y:-205, scale:.84 },
    { el:dispGlass,     riseFrom:0.65, riseTo:0.86, y:-265, scale:.82 }
  ];

  var perfDevice = document.getElementById('perfDevice');
  var perfHalo = document.getElementById('perfHalo');
  var perfAmbient = document.getElementById('perfAmbient');
  var perfZoom = document.getElementById('perfZoom');
  var perfChipCopy = document.getElementById('perfChipCopy');
  var chipMacro = document.querySelector('#cc-embed .chip-macro');
  var FRONT_SRC = 'phone-build/assets/phone/front.webp', BACK_SRC = 'phone-build/assets/phone/back.webp';
  var ISO_RX = 42, ISO_RY = -30; // shared isometric pose: Performance ends here, Display's rig starts here

  var lens = [280, 540, 100, 280, 100];
  var total = lens.reduce(function(a,b){ return a+b; }, 0);
  var bounds = [0];
  lens.forEach(function(l){ bounds.push(bounds[bounds.length-1] + l/total); });

  function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function ease(v){ var t = clamp01(v); return t * t * (3 - 2 * t); }

  var target = 0, hp = 0;

  function sample(){
    var r = cine.getBoundingClientRect();
    var range = r.height - window.innerHeight;
    var p = range > 0 ? (-r.top) / range : 0;
    target = clamp01(p);
  }

  function windowOp(pt, riseFrom, riseTo, fallFrom, fallTo){
    var rise = riseTo > riseFrom ? ease((pt - riseFrom) / (riseTo - riseFrom)) : 1;
    var fall = fallTo > fallFrom ? ease((pt - fallFrom) / (fallTo - fallFrom)) : 0;
    return Math.min(rise, 1 - fall);
  }

  function render(){
    railFill.style.height = (hp*100).toFixed(2) + '%';
    cue.style.opacity = hp < 0.02 ? 1 : 0;

    var activeIdx = 0;
    for (var i = 0; i < 5; i++) {
      if (hp >= bounds[i] && hp < bounds[i+1]) { activeIdx = i; break; }
      if (hp >= bounds[5]) { activeIdx = 4; }
    }

    navItems.forEach(function(el, i){ el.classList.toggle('is-active', i === activeIdx); });

    var dissolveStrength = 0;
    for (var j = 1; j < 5; j++) {
      var d = Math.abs(hp - bounds[j]);
      var s = ease(1 - d / 0.03);
      if (s > dissolveStrength) dissolveStrength = s;
    }
    dissolve.style.opacity = (dissolveStrength * 0.5).toFixed(3);

    var EDGE = 0.05;
    var OVERLAPS = [0.025, 0.025, 0.025, 0.025]; // one per boundary; EDGE/2 gives an exact crossfade (no dip, no double-peak)
    var fade = [];
    for (var k = 0; k < 5; k++) {
      var fadeIn  = (k === 0) ? 1 : ease((hp - (bounds[k] - OVERLAPS[k-1])) / EDGE);
      var fadeOut = (k === 4) ? 1 : ease(((bounds[k+1] + OVERLAPS[k]) - hp) / EDGE);
      fade[k] = Math.min(fadeIn, fadeOut);
      acts[k].style.opacity = fade[k].toFixed(3);
      acts[k].style.pointerEvents = fade[k] > 0.5 ? 'auto' : 'none';
      acts[k].style.transform = 'translateY(' + ((1-fade[k]) * 10).toFixed(2) + 'px)';
    }

    if (fade[0] > 0.001) {
      var dt = clamp01(hp / bounds[1]);
      renderExplode(dt, lFront, -330, .62, DESIGN_PARTS, designStages);

      var deRot = ease(clamp01((dt - 0.90) / 0.095));
      rigWrap.style.transform = 'rotate(' + (90 * (1 - deRot)).toFixed(2) + 'deg)';
    }

    if (fade[3] > 0.001) {
      var EXPLODE_END = 0.78;
      var PIN_END = 0.86;
      var dt3Full = clamp01((hp - bounds[3]) / (bounds[4] - bounds[3]));
      var dt3 = clamp01(dt3Full / EXPLODE_END);
      renderImagingExplode(dt3, cBack, -160, .6, CAM_PARTS);
      updateCamLabels(dt3);

      var pinOp = windowOp(dt3Full, EXPLODE_END, EXPLODE_END + 0.03, PIN_END - 0.03, PIN_END);
      camPin.style.opacity = pinOp.toFixed(3);

      if (dt3Full > PIN_END) {
        var flipLin = clamp01((dt3Full - PIN_END) / (1 - PIN_END));
        var flipT = ease(flipLin);
        var showFront = flipT >= 0.5;
        if (showFront !== cBackShowingFront) {
          cBackImg.src = showFront ? FRONT_SRC : BACK_SRC;
          cBackShowingFront = showFront;
        }
        cBack.style.transform = 'rotateY(' + (flipT * 180).toFixed(2) + 'deg)';
      } else if (cBackShowingFront) {
        cBackImg.src = BACK_SRC;
        cBackShowingFront = false;
      }
    }

    if (fade[2] > 0.001) {
      var dt2 = clamp01((hp - bounds[2]) / (bounds[3] - bounds[2]));
      renderExplode(dt2, dispHousing, -18, .94, DISP_PARTS, []);

      // holds the isometric pose Performance handed off through the whole
      // explode/hold, then untilts back to portrait in lockstep with
      // renderExplode's own reassemble window (dt 0.90-0.995) so the parts
      // finish folding back together at the same moment the rig goes flat.
      var untilt = ease(clamp01((dt2 - 0.90) / 0.095));
      dispRig.style.transform =
        'rotateX(' + (ISO_RX * (1 - untilt)).toFixed(2) + 'deg) ' +
        'rotateY(' + (ISO_RY * (1 - untilt)).toFixed(2) + 'deg)';
    }

    var perfActive = (fade[1] > 0.001);
    perfDevice.style.display = perfActive ? '' : 'none';
    perfHalo.style.display = perfActive ? '' : 'none';
    if (perfActive) {
      var pt = clamp01((hp - bounds[1]) / (bounds[2] - bounds[1]));

      var rotT    = ease(pt / 0.26);
      var tumbleIn = Math.sin(rotT * Math.PI);
      var growA   = rotT * 1.3;
      var growB   = ease(clamp01((pt - 0.20) / 0.20)) * 4.6;
      var devScale = 1 + growA + growB;
      var entryOp = 1 - ease(clamp01((pt - 0.34) / 0.08));
      var copyOp  = 1 - ease(clamp01((pt - 0.10) / 0.10));

      perfAmbient.style.opacity = copyOp.toFixed(3);
      perfAmbient.style.transform = 'translateY(' + ((1 - copyOp) * -10).toFixed(2) + 'px)';

      var zoomIn  = ease(clamp01((pt - 0.34) / 0.10));
      var zoomOut = ease(clamp01((pt - 0.76) / 0.08));
      var zoomOp  = Math.min(zoomIn, 1 - zoomOut);
      perfZoom.style.opacity = zoomOp.toFixed(3);

      var chipCopyOp = windowOp(pt, 0.44, 0.54, 0.68, 0.76);
      perfChipCopy.style.opacity = chipCopyOp.toFixed(3);
      perfChipCopy.style.transform = 'translateX(-50%) translateY(' + ((1 - chipCopyOp) * 10).toFixed(2) + 'px)';

      var chipBaseScale = 0.4 + zoomIn * 0.6;
      var chipShrink = chipBaseScale * (1 - chipCopyOp * 0.35);
      var chipLift = chipCopyOp * 90;
      chipMacro.style.transform = 'translateY(' + (-chipLift).toFixed(2) + 'px) scale(' + chipShrink.toFixed(3) + ')';

      var retRise = ease(clamp01((pt - 0.78) / 0.10));
      var finalOp = Math.max(entryOp, retRise);
      perfDevice.style.opacity = finalOp.toFixed(3);
      perfHalo.style.opacity = (0.5 + finalOp * 0.5).toFixed(3);

      if (pt < 0.60) {
        perfDevice.style.transform =
          'rotateX(' + (tumbleIn * 16).toFixed(2) + 'deg) ' +
          'rotateY(' + (tumbleIn * -24).toFixed(2) + 'deg) ' +
          'rotateZ(' + (rotT * 90).toFixed(2) + 'deg) ' +
          'scale(' + devScale.toFixed(3) + ')';
      } else {
        var retScaleT = ease(clamp01((pt - 0.78) / 0.10));
        var retScale  = 5 - retScaleT * 4;
        var retLin    = clamp01((pt - 0.86) / 0.09);
        var retZ      = ease(retLin);
        var tumbleOut = Math.sin(retLin * Math.PI);
        // settle out of the tumble and lie the device down into the same
        // isometric pose the Display act's parts-rig starts from, instead of
        // flipping it to the back - keeps the handoff on the front face.
        var isoT = ease(clamp01((pt - 0.95) / 0.05));
        perfDevice.style.transform =
          'rotateX(' + (tumbleOut * 14 + isoT * ISO_RX).toFixed(2) + 'deg) ' +
          'rotateY(' + (tumbleOut * -18 + isoT * ISO_RY).toFixed(2) + 'deg) ' +
          'rotateZ(' + ((1 - retZ) * 90).toFixed(2) + 'deg) ' +
          'scale(' + retScale.toFixed(3) + ')';
      }
    } else {
      perfAmbient.style.opacity = 0;
      perfZoom.style.opacity = 0;
      perfChipCopy.style.opacity = 0;
    }
  }

  var raf = 0, running = false, EASE = 0.09;
  function frame(){
    sample();
    var d = target - hp;
    hp = Math.abs(d) < 0.0005 ? target : hp + d * EASE;
    render();
    if (running) { raf = requestAnimationFrame(frame); }
  }
  function start(){ if (running) return; running = true; raf = requestAnimationFrame(frame); }
  function stop(){ running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  window.addEventListener('scroll', function(){ if (!running) { sample(); hp = target; render(); } }, { passive:true });
  window.addEventListener('resize', function(){ sample(); render(); });

  sample(); hp = target; render();
  start();
})();
