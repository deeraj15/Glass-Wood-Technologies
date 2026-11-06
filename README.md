# Glass Wood Technologies

A responsive, single-page company site built with semantic HTML, CSS, vanilla JavaScript and Three.js. It includes a persistent light/dark theme switch, a Vanta GLOBE background that responds to hero scrolling, a scroll-pinned house construction sequence in the formation section, company overview, differentiators, a zoomable residential master-plan, capabilities, process, brand statement, contact section and footer.

## Brand system

- Teal: `#31AAA9`
- Warm sand: `#F8E0A4`
- Brick red: `#A82020`
- Deep burgundy: `#6C1A1A`
- Neutrals: off-white, white, charcoal and muted gray
- Typography: Inter for body copy, Manrope for headings and the wordmark, and DM Serif Display for selected headline accents

The separate architectural mark is `assets/brand-mark.svg`. Header and footer wordmarks remain editable HTML text.

## Assets and preview

The formation section scrubs through 40 optimized construction frames in `assets/construction-frames/`. The Studio preview uses `assets/studio-site-plan.jpg` with zoom controls. When WebGL is unavailable, the house sequence retains its poster image and the Vanta effect falls back to a static globe treatment.

Serve this folder through a local web server (for example, VS Code Live Server) so the Three.js ES module can load. The hero loads the supplied Vanta GLOBE bundle from `assets/vanta.globe.min.js` and reuses the existing Three.js module; Inter and Manrope load from Google Fonts. The theme choice is saved in local storage.

The contact links currently use `hello@glasswoodtechnologies.com` as a placeholder. Update them if the company uses another address.
