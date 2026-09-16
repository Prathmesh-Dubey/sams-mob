/* =========================================================================
   CERTIFICATION CARDS — free-scrolling carousel

   This section no longer hijacks page scroll. The viewport is a native
   horizontally-scrollable, snapping row: a trackpad/touch swipe, a drag, or
   the arrow keys move it, and the page above and below scrolls normally.

   Cards are always fully opaque - no scroll-tied fade/scale - so nothing
   here depends on precise centring math for depth. All this file does is:

     - centre the first and last card on their own end of the row, the same
       way the middle cards sit centred once reached (measured, not fixed,
       since it depends on how many cards fit at the current width);
     - keep the dot indicators and the arrow buttons' disabled state in sync
       with the active card;
     - drive that active card from a click/key/dot target immediately, never
       waiting on the scroll animation to settle - a second arrow click
       before the first has finished gliding must still land one card
       further on, not repeat the same target.
   ========================================================================= */
(function () {
  'use strict';

  var section = document.querySelector('[data-cx]');
  if (!section) { return; }

  var viewport = section.querySelector('[data-cx-viewport]');
  var track    = section.querySelector('[data-cx-track]');
  var dotsWrap = section.querySelector('[data-cx-dots]');
  var dots     = dotsWrap ? [].slice.call(dotsWrap.querySelectorAll('[data-cx-dot]')) : [];
  var prevBtn  = section.querySelector('[data-cx-prev]');
  var nextBtn  = section.querySelector('[data-cx-next]');
  var cards    = [].slice.call(section.querySelectorAll('[data-cx-card]'));
  if (!viewport || !track || !cards.length) { return; }

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = -1;
  var ticking = false;
  var settleTimer = 0;

  /* Centre the first and last card on their own end of the row: with a
     plain page-margin gutter the row opens with card 2 already centred and
     card 1 stranded at the edge. A gutter of exactly half the leftover
     width means every card, including the two ends, reaches dead centre. */
  function centreGutter() {
    var lead = Math.max(0, (viewport.clientWidth - cards[0].offsetWidth) / 2);
    track.style.paddingLeft = track.style.paddingRight = lead + 'px';
  }

  function setActive(i) {
    if (i === current) { return; }
    if (current !== -1) { cards[current].style.setProperty('--f', '0'); }
    current = i;
    cards[current].style.setProperty('--f', '1');
    dots.forEach(function (d, di) {
      var isActive = di === i;
      d.classList.toggle('is-active', isActive);
      d.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    if (prevBtn) { prevBtn.disabled = i === 0; }
    if (nextBtn) { nextBtn.disabled = i === cards.length - 1; }
  }

  function nearestIndex() {
    var max = viewport.scrollWidth - viewport.clientWidth;
    if (viewport.scrollLeft <= 1) { return 0; }
    if (viewport.scrollLeft >= max - 1) { return cards.length - 1; }

    var mid = viewport.scrollLeft + viewport.clientWidth / 2;
    var best = 0, bestDist = Infinity;
    for (var i = 0; i < cards.length; i++) {
      var dist = Math.abs((cards[i].offsetLeft + cards[i].offsetWidth / 2) - mid);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }

  /* A free swipe/drag/wheel gesture (no button, no dot) has no target index
     to be optimistic about, so it is the one case still read back from
     scrollLeft once the scroll settles. */
  function onScroll() {
    if (ticking) { return; }
    ticking = true;
    requestAnimationFrame(function () { setActive(nearestIndex()); ticking = false; });
  }

  function goTo(i) {
    i = i < 0 ? 0 : (i > cards.length - 1 ? cards.length - 1 : i);
    /* Set the target immediately - dots, readout and the arrows' disabled
       state must reflect the card just asked for right away, not whatever
       the smooth-scroll animation happens to be passing under the middle
       of the viewport a frame later. A second click landing mid-glide then
       still moves on from the real target instead of repeating it. */
    setActive(i);
    var left = cards[i].offsetLeft - (viewport.clientWidth - cards[i].offsetWidth) / 2;
    /* onScroll would otherwise re-derive the same index anyway, but suppress
       it for the duration of the programmatic scroll so a swipe that starts
       before it finishes is what takes over, not a stale readback. */
    ticking = true;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () { ticking = false; }, 500);
    viewport.scrollTo({ left: left, behavior: REDUCED.matches ? 'auto' : 'smooth' });
  }

  dots.forEach(function (d, i) {
    d.addEventListener('click', function () { goTo(i); });
  });

  if (prevBtn) { prevBtn.addEventListener('click', function () { goTo(current - 1); }); }
  if (nextBtn) { nextBtn.addEventListener('click', function () { goTo(current + 1); }); }

  viewport.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
  });

  viewport.addEventListener('scroll', onScroll, { passive: true });

  var measuring = false;
  function remeasure() {
    if (measuring) { return; }
    measuring = true;
    centreGutter();
    setActive(nearestIndex());
    measuring = false;
  }

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(remeasure);
    ro.observe(viewport);
    ro.observe(track);
  }
  window.addEventListener('resize', remeasure);
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(remeasure); }

  centreGutter();
  setActive(nearestIndex());
})();
