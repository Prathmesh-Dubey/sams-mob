# SAMS Mobile — standalone homepage

A self-contained copy of the sams-mobile.com homepage. No WordPress, no PHP,
no database, no build step. Plain HTML + CSS + JS.

## Run it

Easiest — just open `index.html` in a browser.

For a local server (recommended, matches production behaviour):

    python -m http.server 8000        # then open http://localhost:8000
    # or
    php -S 127.0.0.1:8000

## What's in it

    index.html              the page (57 KB)
    assets/css/v3.css       the full theme stylesheet (107 KB)
    assets/js/v3.js         scroll engine, hero turntable, spec rail, drawer (14 KB)
    assets/img/             10 WebP + logo + og image (500 KB)

Total ~730 KB. Google Fonts (Space Grotesk, JetBrains Mono, Outfit) load from CDN.

## What works

- Scroll-driven hero turntable (`--hero`), damped spring chase
- Horizontal spec rail (`--rail`)
- HUD stage panels swapping with the device
- Parallax backgrounds (`--scr`)
- 41 scroll-reveal elements via IntersectionObserver
- Contact drawer open/close, focus handling, Escape to close
- Language switcher, mobile nav, smooth anchor scrolling
- Full responsive behaviour + RTL rules
- `prefers-reduced-motion` respected (animations disable)

Scroll-driven effects are desktop-only by design: the theme disables them
below 901px, matching the breakpoint in v3.css.

## What's different from the live site

- WordPress boilerplate removed: emoji loader, block-library CSS, speculation
  rules, RSS/pingback links, generator meta
- Cookie-consent plugin removed entirely (CSS, JS and markup)
- Contact forms can't post without WordPress. They intercept submit and show
  "Demo copy — form submission is disabled in the standalone build."
  To wire them up, point the form `action` at your own endpoint.
- Navigation links point at https://sams-mobile.com/ since only the homepage
  is included here.
- `noindex, nofollow` is still in the `<head>` — it was inherited from the
  staging mirror and deliberately left in. **If you deploy this publicly,
  remove that meta tag**, otherwise it stays out of search. Equally, do not
  deploy it as a public duplicate of the live homepage without removing it.

## Editing

All design lives in `assets/css/v3.css`. Key tokens at the top:

    --bg: #050810        --accent: #3B82C6
    --fg: #fff           --pad: 40px

Pin lengths (how much scroll each animated section consumes):

    .hero    { height: 240vh; }
    .product { height: 300vh; }

---

# Light theme variant

    index-light.html              light theme + smoother motion
    assets/css/theme-light.css    palette overrides (99 lines)
    assets/css/smooth.css         motion overrides
    assets/js/v3-smooth.js        engine with a softer spring

`index.html` (original dark) is untouched — open both to compare.

## Palette

    --bg          #F4F7FB   paper (not pure white)
    --bg-alt      #E9EEF6   alternating band
    --fg          #0B1220   navy-black, now the TEXT colour
    --accent      #1E6FD9   steel blue, deepened for contrast
    --accent-deep #14539F
    --ok          #0E9F6E

Contrast on paper, measured:

    text    #0B1220   17.42:1   AA pass
    accent  #1E6FD9    4.51:1   AA pass
    deep    #14539F    7.06:1   AA pass
    (original #3B82C6  3.76:1   would have FAILED — hence the deepening)

Ink steps are raised, not inverted: white at 35% on dark is legible, black at
35% on light is a ghost. Every --fg-* step is ~5-10 points heavier than a
straight inversion so the visual weight matches.

## Motion

    SMOOTH_RATE   0.22 -> 0.13    spring covers less distance per frame
    settle        0.0004 -> 0.00012
    reveal        .8s / 28px  ->  1.05s / 18px, cubic-bezier(.16,1,.3,1)
    stagger       60ms -> 85ms
    plus will-change on the scroll-driven layers

Reduced-motion collapses all of it.

## To revert

Delete index-light.html and the three files above. index.html is unchanged.

## Light theme — pass 2 (fade fixes)

Three things caused the washed-out look:

1. `.certs__fade` hardcodes `rgba(5,8,16,.5)` across the middle 40% of the
   certifications section. On paper that greyed the heading and lede while
   the cards, which carry their own background, stayed crisp. Replaced with
   a 10% light gradient; `.certs__inner` raised to z-index 3.

2. `.turntable` used `drop-shadow(0 60px 80px rgba(0,0,0,.7))` — built for a
   dark ground, a grey smudge on paper. Replaced with two tighter shadows in
   the brand navy at 20% and 10%.

3. The product shots are low-key lit. Added
   `contrast(1.14) saturate(1.20) brightness(.96)` on the images themselves,
   leaving the parent filter free to keep driving depth blur.

Also: chips/tags darkened to #14539F (were rgba(59,130,198,.6) — invisible on
paper), background plates dropped to .09 opacity, footer links raised from the
lightest ink step, and accent spans in headings forced to the deepened accent.

## Motion — pass 2

    SMOOTH_RATE   0.13 -> 0.095
    reveal        1.05s -> 1.15s, travel 18px -> 16px + scale(.985)
    stagger       85ms -> 95ms
    turntable     filter transition .45s (blur/brightness were stepping)
    cards         lift -3px on hover with an eased shadow

---

# Hero rotator variant

    index-hero.html                  light theme + smooth motion + rotator
    assets/css/hero-rotator.css      layout, camera-move transition, controls
    assets/js/hero-rotator.js        the engine (no dependencies)

Replaces the scroll-driven turntable with an auto-rotating product showcase.

## Why it also fixes pacing

.hero was 240vh purely to give the scroll animation room to run. The rotator
runs on its own clock, so the hero collapses to 100vh.

    hero          3.0 screens  ->  1.0 screen
    whole page   12.0 screens  -> 10.9 screens

## Behaviour

Six faces on a 3400ms cycle, each with the benefit copy taken verbatim from
the anatomy section so the two can never drift:

    01 Front   Glove-capable touchscreen with Ex marking and front camera
    02 Rear    50 MP AI camera, speaker grille and certification plate
    03 Left    Volume keys and programmable side key
    04 Right   Sealed side port and label recess
    05 Top     Dedicated red SOS key beside the power key
    06 Bottom  Sealed USB charging port and lanyard anchor

The transition is a camera move, not a cross-fade. The original build
documented why the obvious approaches fail: cross-fading shows two phones at
once, and rotateY turns a flat photo edge-on into a sliver. So the device
falls back, defocuses, swaps face, and returns.

## Controls and accessibility

- Pauses on hover and on focus-within
- Explicit pause/play button with a live aria-label
- Six dots as real tablist buttons, aria-selected tracked
- Left/Right arrow keys move between views
- Caption region is aria-live="polite"
- prefers-reduced-motion: no autoplay, no camera move, no progress animation
- Stops its timer when the tab is hidden
- First face eager + fetchpriority=high; the other five lazy

## Tuning

    DUR   3400   ms per face          (hero-rotator.js, line 10)
    SWAP   240   ms camera move       (line 11)

## Retired

.hud-stage x6 were choreographed to scroll stages that no longer exist, and
the two .hud-panel callouts sat where the caption now lives. Both hidden at
the end of hero-rotator.css — delete that block to bring them back.

---

# Reference build — index-ref.html

Structure, rhythm, type ladder and motion timing modelled on the iPhone 18
Pro page. Built from index.html (the original dark page), NOT from the light
variant — layering a dark theme over a light one left light ::after scrims
painting over everything.

    index-ref.html
    assets/css/apple-ref.css     palette, rhythm, type ladder, surfaces
    assets/css/ref-motion.css    motion timing
    assets/css/hero-rotator.css  rotator (shared with index-hero.html)
    assets/js/v3-smooth.js       engine, chase rate 0.20
    assets/js/hero-rotator.js    rotator, 4000ms cycle

## What was taken from the reference

    Rhythm        144px padding-top on every section — the whole vertical system
    Container     1247px main / 1050px text / 680px prose
    Bands         #000 alternating with #1d1d1f, no borders or rules
    Hero          exactly one screen
    Buttons       980px pill radius
    Motion        0.24s / 0.32s on cubic-bezier(.4, 0, .6, 1)
    Body weight   500 — 400 goes thin on black
    Type ladder   12 14 17 19 21 24 28 32 40 48 56 64 80

## Palette

    --bg        #000000     --fg      #f5f5f7
    --bg-alt    #1d1d1f     --fg-70   #c7c7cc
    --bg-panel  #2a2a2d     --fg-50   #86868b
    --accent    #4A9EE8   <- SAMS steel blue, lifted for pure black
    --accent-deep #3B82C6  <- the original brand blue

The accent is deliberately NOT the reference's blue. Structure and rhythm are
worth borrowing; a recognisable brand identity is not.

## Type ladder result

    before  22 distinct sizes (9,10,11,12,13,14,15,16,17 all adjacent)
    after   16 distinct sizes
    reference itself: 17

v3.css carried eight separate h2 rules with clamps maxing at 68, 76, 60 and
120px. Each is pulled onto the ladder. Selectors were measured from the
rendered page, not guessed from the stylesheet.

## Motion — reversed from the earlier pass

    SMOOTH_RATE  0.095 -> 0.20     spring
    reveals      1.15s -> 0.6s     cubic-bezier(.4, 0, .6, 1)
    stagger      95ms  -> 70ms
    rotator      4000ms cycle, 210ms camera move
    will-change  applied to 3 selectors, not everything

The reference runs 0.24-0.32s. Smooth there means well-eased and jank-free,
not slow — long fades read as lag. The earlier 1.15s pass went the wrong way.

## Content — nothing removed

    8 sections    21 images    107 links    2 forms
    1 h1  12 h2  8 h3  27 paragraphs
    8 spec cards  39 country links  1,178 words

---

# Monochrome build (index-ref.html, updated)

    assets/css/mono-theme.css    palette, blue removal, inverted footer
    assets/css/hero-split.css    split hero layout + motion
    assets/js/hero-split.js      hero engine (replaces hero-rotator.js here)

## Palette

    matte black  #0d0d0d   body, 70% of surface area
    grey band    #151515   certs / anatomy / reach
    grey panel   #202020   cards, forms, spec strip
    type         #ffffff   stepped by opacity only
    footer       #ffffff ground, #0d0d0d type (inverted)

No blue anywhere. Emphasis comes from weight and scale, not hue. Matte black
rather than #000 so large areas hold shadow detail on OLED.

## Hero

Device centred; the H1 breaks across it -

    One Explosion Proof Phone.   [device]   Every Major Ex Standard.

The sentence is split at its existing .accent span - no new copy written. The
original <h1> element is MOVED into the left slot rather than cloned, so the
page still has exactly one h1.

Motion:
    float        7s ease-in-out, 13px vertical drift
    parallax     device leans toward the cursor, rAF-damped at 0.07
    dissolve     0.9s cross-fade + scale, no fall-back camera move
    entrance     halves slide in from their own sides, staggered 120ms

## Content preserved

    words 1194 (original 1178)   8 sections   21 images   109 links
    2 forms   1 h1   12 h2   7 h3

The six .hud-stage and two .hud-panel blocks carry ~63 words of spec copy.
Hiding them would have dropped that, so they are MOVED into a scrollable
spec strip beneath the CTAs instead.

## Navbar + typeface (latest)

Navbar inverted to match the footer - white ground, black type:

    .nav              background #ffffff, 1px bottom rule at 12% black
    .nav a            #0d0d0d at 78% opacity, 100% on hover
    .nav__logo img    filter: brightness(0)   <- the logo ships as a blue PNG;
                                                 brightness(0) flattens any hue
                                                 to pure black without a new asset
    .nav .btn         black pill, white text (inverted from the page CTAs)
    burger / langsw / drawer / mobile menu all follow

Typeface changed to Inter:

    --display  Inter        was Space Grotesk
    --body     Inter        was Outfit
    --mono     JetBrains Mono  (unchanged - technical strings keep the mono)

Space Grotesk has personality but reads as a design-studio font. Inter is the
neutral corporate workhorse, has the weight range for an 800 display headline,
and holds at 12px where the spec labels sit. Display sizes get -0.021em
tracking (-0.028em on the hero halves) because Inter sets loose by default at
large sizes. Contextual alternates enabled via font-feature-settings.

Space Grotesk and Outfit are still in the font URL, so reverting is a one-line
change to the --display / --body tokens.

## Hero fit

    stage        900
    navbar        85
    composition  790   top 95, bottom 885 - clears the bar, inside the stage

Device sized from vh (38vh, capped 400px) with width solved from the 722x1356
source ratio. Gaps on a 1.3vh scale. Both shrink together on short viewports.

---

# Hero cinema (index-ref.html, current)

    assets/css/hero-cinema.css
    assets/js/hero-cinema.js

A scroll-scrubbed sequence in three acts. The hero is 340vh of runway with a
sticky 100vh stage; one value, --hp (0 to 1), drives everything.

    ACT 1  0.00 - 0.38   full-bleed frame, split headline, device face 1
    ACT 2  0.38 - 0.72   aperture closes to a rounded square, scene darkens,
                         device scrubs through all six faces
    ACT 3  0.72 - 1.00   frame lands as the centre well of a spec grid; the
                         eight HUD blocks fly in from the edges they end on

Measured at four points:

    hp     band   scrub   grid   title   tail
    0.00   1.00   0.00    0.00   0.00    0.00
    0.45   0.00   0.62    0.00   0.00    0.00
    0.80   0.00   0.64    0.42   0.11    0.00
    1.00   0.00   0.00    1.00   1.00    1.00

    clip-path  inset(0% round 18px)  ->  inset(31% 35% round 168px)
    brightness 1.00 -> 0.45
    scale      1.00 -> 0.86

## Why it is built this way

The aperture is a clip-path inset driven by --hp, so closing the frame costs
no layout - it is a paint-only property the compositor handles.

The device does not rotateY through its faces: the original build documented
that spinning a flat photo turns it edge-on into a sliver. Instead the six
faces are scrubbed by scroll position, which reads as a turntable and uses
the real photography.

The eight spec tiles are the six .hud-stage and two .hud-panel blocks MOVED,
not recreated - same DOM nodes, same copy.

## The driver

A rAF loop, parked by an IntersectionObserver when the hero is off screen,
plus scroll and resize listeners that sample synchronously. Browsers pause
rAF for hidden documents and some embedded viewers never paint, so the
listeners are the fallback; the loop is what makes it smooth when visible.

## Content

    words 1203 (original 1178)   8 sections   21 images   109 links
    2 forms   1 h1   13 h2   8 spec tiles   2 CTAs

The extra h2 is the closing title, which restates the headline at the finish.
Nothing was removed.

---

# Light redesign (index-ref.html, current)

    assets/css/light-redesign.css   loaded last, inverts mono-theme.css

## Palette

    --bg        #ffffff   page
    --bg-alt    #f4f6f9   alternating band + footer
    --fg        #0a0a0a   type
    --accent    #1E6FD9   links, buttons, eyebrows, connector rules
    --accent-deep #14539F hover / deep emphasis

#1E6FD9 measures 4.5:1 on white, so it is safe at body size. Ink steps are
raised rather than inverted - black at 35% on white is a ghost where white at
35% on black still reads.

Navbar: white (unchanged), type black, logo filter removed so it is blue
again, CTA a blue pill. Footer: light band, dark type, blue logo.

## Hero sequence, inverted

The plate now washes OUT to white instead of darkening:

    .hc__plate  opacity  .30 -> 0
    .hc__media  brightness 1.00 -> 1.06

So the sequence runs from a busy industrial photograph to a clean technical
drawing on white - the same dramatic focus, achieved by bleaching rather than
dimming.

## Act 3 - the callout diagram

The tile grid is replaced by an annotated front view. The device returns to
phone-front.webp at hp 0.70 because the diagram annotates that face.

    LEFT   (right-aligned)   Processor · Battery · Ingress Protection
    RIGHT  (left-aligned)    Launch Window · Connectivity · Platform
    BOTTOM                   Certification Status · Zone Rating

Each label carries a ::after connector rule running toward the device -
horizontal on the flanks, vertical on the bottom pair. On mobile the whole
thing folds to two columns with the rules running vertically.

Tiles are positioned by explicit .hc__tile--1 ... --8 classes written by the
JS, not :nth-child - the well is also a child of the grid, so child indexes
were off by one.

## Verified live

    scrollY 1500  hp 0.6944  face phone-bottom.webp   (end of act 2)
    scrollY 4000  hp 1.0000  face phone-front.webp    grid/title/tail all 1

## Act 3 fixes

Four problems, all fixed in light-redesign.css:

1. THE APERTURE WAS SLICING THE LABELS
   clip-path sat on .hc, which contains the grid, title and tail as well as
   the scene - so as the aperture closed it cut the flank labels in half
   ("Battery" -> "attery", "Connectivity" -> "Connecti").
   Moved to .hc__media: the aperture now clips only the plate and device,
   and the callout diagram sits on top of it as an unclipped overlay.

2. TEXT CLIPPED INSIDE THE TILES
   hero-cinema.css set overflow:hidden on the tiles and the HUD blocks carry
   space-between flex rows wider than the box. overflow is visible now, and
   the inner rows align to whichever edge the callout points from.

3. THE BOTTOM PAIR OVERLAPPED
   Certification Status and Zone Rating both sat in grid-column 2 / row 4,
   a ~190px column. They now span the full width on rows 4 and 5, centred,
   and the device lifts to -7vh so it never sits on them.

4. TYPE TOO SMALL
   label   11px -> 13px, weight 700
   value   20px -> clamp(22px, 2.1vw, 30px), weight 800
   body    13px -> 15px, weight 500
   rules    1px -> 2px

## Background

A 48px blueprint grid at 3.8% black over a soft radial, plus a white halo
behind the device so it separates from the rule lines. It reads as
engineering drawing paper, which suits a certification spec diagram, and
gives the white page structure without adding colour.

## Measured at 1440x900, end of scroll

    clipped children   0
    all tiles inside stage   true
    bottom pair overlap      false

    LEFT    Processor 195 · Battery 317 · Ingress Protection 439
    RIGHT   Launch Window 195 · Connectivity 317 · Platform 439
    BELOW   Certification Status 623 · Zone Rating 745
    device  279 -> 621

## Act 3 — layout rebuild

The flank columns were 1fr of a 1440px grid, so each tile rendered ~488px
wide. The HUD blocks are space-between flex rows, so their values stretched
the full width and flew away from their own labels - SNAPDRAGON, 4,000 mAh
and IP68 all ended up pinned to the far left edge of the viewport.

Four changes:

1. BOUND THE COLUMNS
   grid-template-columns: minmax(0,290px) minmax(200px,300px) minmax(0,290px)
   justify-content: center. Tiles capped at 290px.

2. ALIGN EVERY DESCENDANT TO THE CALLOUT DIRECTION
   Left tiles: text-align right, all flex rows justify-content flex-end.
   Right tiles: the mirror. Previously only the tile itself was aligned, so
   inner flex rows still spread edge to edge.
   (An earlier attempt used flex-direction: row-reverse for the left side,
   which packs items to the LEFT - that was the bug that threw the values
   across the page.)

3. BOTTOM PAIR OUT OF GRID FLOW
   Spanning columns 1/3 put the right-aligned Certification Status text at
   the right edge of the device column, i.e. behind the phone. They are now
   absolutely anchored either side of centre, below the device.

4. TITLE CLEARANCE
   The closing title ran 139-216 while the first callout row sat at 117-189.
   Title moved up under the navbar, grid padding-top raised to match.

## Verified at 1440x900, --hp 1

    nav bottom    85
    title         99 - 162
    LEFT   x 224-514   Processor 198 · Battery 283 · Ingress 405
    device x 633-793   274 - 579
    RIGHT  x 911-1201  Launch 198 · Connectivity 283 · Platform 405
    BOTTOM Certification Status x 385-675 · Zone Rating x 750-1040, y 698-774
    tail top      825

    tile-to-tile collisions   0
    tile vs title             0
    tile vs device            0
    tile vs tail              0
    tile vs navbar            0
    content escaping a tile   0

Left and right columns mirror exactly - same y positions, same 290px width.

## The phone was being cut off

At 1440x900 the closed aperture measured 294px tall while the device was
305px, and a translateY lifted it a further 29px - so the top of the phone
sat outside the clip.

    --ins-y   31% -> 23%    aperture window 294px -> 418px
    --ins-x   35% -> 33%
    device    37.6vh -> 34vh, and the vertical lift removed entirely

Result at 1440x900:

    aperture window   418px
    device            143 x 273
    margin top        72px
    margin bottom     72px
    phone fully visible          true
    tile-to-tile collisions      0
    tiles touching the device    0
    callouts clear of the CTAs   true

The lede now hides below 1000px viewport height rather than 940 - it was the
element most likely to run into the bottom callouts.
