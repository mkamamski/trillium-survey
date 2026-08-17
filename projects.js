/* ═══════════════════════════════════════════════════════════════
   Project pages — the durable asset, same role checkpoints.json plays
   for the survey. One file, all projects. Adding a project means adding
   an entry here and nothing else: no new HTML file, no script tag, no
   service-worker edit.

   Why .js and not .json, given checkpoints.json is JSON: this content is
   prose. Multi-paragraph bodies, em dashes, non-breaking spaces, and
   comments explaining why a number is what it is. JSON forbids comments
   and multi-line strings, and would turn every note body into one long
   unreadable line. config.js already sets the `window.X = {}` precedent.

   SHAPE
     project.sections[].blocks[]  — blocks are a discriminated union on
     `kind`, so each project orders its own page rather than filling in
     a fixed template.

   IDS ARE PERMANENT. Part and step ids are primary-key columns in
   Postgres (project_items.item_id). Reword a `name` freely; change an
   `id` and you orphan everyone's checkmarks. Same rule as a checkpoint id.
   ═══════════════════════════════════════════════════════════════ */

window.PROJECTS = [

/* ─────────────────────────────────────────────────────────────────
   PRESSURIZED WATER
   Content ported verbatim from the standalone project-water-pressurized
   page. Part numbers, pressure ratings and the weight math are research
   findings with real consequences — do not tighten the copy.
   ───────────────────────────────────────────────────────────────── */
{
  slug: "water-pressurized",
  name: "Pressurized water system",
  eyebrow: "Project · water",
  blurb: "Delete the gravity tank and hand pump.",
  summary: "Delete the gravity tank and hand pump. Put a 12&nbsp;V demand pump between the tank line and the city water line, and let the existing city faucet become the tap.",

  chips: [
    { label: "Gravity tank removed",      tone: "on"   },
    { label: "Hand pump: works, rejected", tone: "on"  },
    { label: "Gray side left in service", tone: "open" },
    { label: "Gated on 12&nbsp;V system", tone: "warn" }
  ],

  sections: [

  /* ── 01 ────────────────────────────────────────────────────── */
  {
    id: "path",
    title: "The water path",
    intro: "The whole design in one picture. The pump tees into two existing lines, so nothing new gets drilled through the shell — the city water inlet you already have becomes the way water gets in, and the faucet you already have becomes the way it comes out.",
    blocks: [

      /* The schematic is hand-drawn for this project. It is not a diagram
         engine and should never become one — the slot takes whatever SVG
         string (or element-returning function) the project needs. Its
         .pth-* classes live in index.html under "water project schematic";
         a future project's drawing brings its own class block. */
      { kind: "diagram",
        minWidth: 600,
        label: "Schematic of the pressurized water path: fresh tank feeds a strainer, then the 12 volt demand pump, which tees into the existing city water line and up to the galley faucet. Check valves sit inside the pump and at the exterior city inlet. The old hand pump is removed.",
        svg: `<svg viewBox="0 0 660 250" role="img" aria-label="__LABEL__">
      <path class="pth-line" d="M118 62 H168"/>
      <path class="pth-line" d="M258 62 H300"/>
      <path class="pth-line" d="M390 62 H470 V108"/>
      <path class="pth-line city" d="M118 190 H470 V132"/>
      <path class="pth-line" d="M470 96 V62 H556"/>

      <rect class="pth-box" x="18" y="38" width="100" height="48" rx="6"/>
      <text class="pth-t" x="68" y="59" text-anchor="middle">Fresh tank</text>
      <text class="pth-s" x="68" y="74" text-anchor="middle">12–15 GAL · VENTED</text>

      <rect class="pth-box" x="168" y="42" width="90" height="40" rx="6"/>
      <text class="pth-t" x="213" y="60" text-anchor="middle">Strainer</text>
      <text class="pth-s" x="213" y="74" text-anchor="middle">50 MESH</text>

      <rect class="pth-box hot" x="300" y="34" width="90" height="56" rx="6"/>
      <text class="pth-t" x="345" y="56" text-anchor="middle">Pump</text>
      <text class="pth-s" x="345" y="70" text-anchor="middle">4008 · 3 GPM</text>
      <text class="pth-s" x="345" y="82" text-anchor="middle">55 PSI</text>

      <rect class="pth-box" x="18" y="166" width="100" height="48" rx="6"/>
      <text class="pth-t" x="68" y="187" text-anchor="middle">City inlet</text>
      <text class="pth-s" x="68" y="202" text-anchor="middle">EXISTING</text>

      <rect class="pth-box" x="556" y="38" width="88" height="48" rx="6"/>
      <text class="pth-t" x="600" y="59" text-anchor="middle">Faucet</text>
      <text class="pth-s" x="600" y="74" text-anchor="middle">EXISTING</text>

      <circle class="pth-node" cx="470" cy="120" r="7"/>
      <text class="pth-s" x="484" y="124">TEE</text>

      <circle class="pth-cv" cx="345" cy="104" r="5"/>
      <text class="pth-cvT" x="355" y="108">CV — in pump</text>

      <circle class="pth-cv" cx="118" cy="190" r="5"/>
      <text class="pth-cvT" x="128" y="178">CV — verify this one</text>

      <rect class="pth-box gone" x="300" y="166" width="130" height="48" rx="6"/>
      <text class="pth-t dim" x="365" y="187" text-anchor="middle">Hand pump</text>
      <text class="pth-s" x="365" y="202" text-anchor="middle">REMOVED</text>

      <rect class="pth-box gone" x="18" y="106" width="100" height="34" rx="6"/>
      <text class="pth-s" x="68" y="127" text-anchor="middle">TU-CO · REMOVED</text>
    </svg>`,
        key: [
          { swatch: "line",        text: "Pumped fresh"  },
          { swatch: "line-dashed", text: "City pressure" },
          { swatch: "dot",         text: "Check valve"   },
          { swatch: "none",        text: "Dashed box = deleted" }
        ]
      },

      { kind: "notes", items: [
        { level: "key", tag: "Why it works", body: [
          "The pump's built-in check valve stops city pressure backfeeding into the tank. The inlet's check valve stops the pump pushing tank water out onto the ground. Open the faucet on shore water and city pressure holds the line above the pump's cut-in, so the pump never runs. Open it off-grid and the pump wakes up. One tap, two sources, no valve to remember."
        ]},
        { level: "stop", tag: "The one thing to verify first", body: [
          "That second check valve is 50 years old and the design leans on it. Test it before you buy anything: cap the inlet, pressurize from inside, and confirm nothing weeps out the exterior fitting. If it's dead, replace it — an inline check valve on the city branch is a cheap fix and the alternative is your tank draining onto the campground."
        ]}
      ]}
    ]
  },

  /* ── 02 ────────────────────────────────────────────────────── */
  {
    id: "parts",
    title: "Parts",
    intro: "Prices marked <em>quoted</em> come from a real listing found while planning this; <em>est.</em> means a rough figure that needs verifying in a cart. The tank is deliberately not listed — see open decisions.",
    blocks: [
      { kind: "parts",
        copy: {
          title:  "TRILLIUM 1300 — PRESSURIZED WATER, STILL TO BUY",
          footer: "Tank not included — size gated on measured use."
        },
        groups: [
          { id: "core", title: "Core system", items: [
            { id: "pump-4008", name: "Shurflo 4008-101-E65 pump", price: 101.56, confidence: "quoted",
              note: "3 GPM, 55 psi, runs dry, 6 ft dry prime. A65 is the same pump on the OEM channel — buy whichever is cheaper." },
            /* qty 2 because the note says so. The standalone page priced one
               and the group total was $7.89 light. */
            { id: "strainer-255-313", name: "Shurflo 255-313 strainer", price: 7.89, qty: 2, confidence: "quoted",
              note: "50 mesh, twists straight onto the pump head. Buy two." },
            { id: "pex-cinch-tool", name: "PEX cinch tool", price: 29.68, confidence: "quoted",
              note: "One-time buy, reused on every future project." },
            { id: "pex-clamps-50", name: "PEX cinch clamps, 50 pk", price: 10, confidence: "est",
              note: "Stainless." },
            { id: "pex-tube-25ft", name: "PEX tubing, 1/2 in, 25 ft", price: 20, confidence: "est" },
            { id: "fittings", name: "Fittings — tees, elbows, swivel adapters", price: 30, confidence: "est",
              note: "1/2\"-14 NPSM at the pump ports." },
            { id: "sorbothane-pads", name: "Sorbothane isolation pads", price: 14, confidence: "est",
              note: "Not generic rubber feet. This is the noise fix." },
            { id: "pump-switch", name: "Switch with indicator light", price: 12, confidence: "est",
              note: "Cabinet-mounted, so the pump can't run while towing." },
            { id: "fuse-holder-10a", name: "Inline fuse holder + 10 A fuse", price: 10, confidence: "est",
              note: "Pump draws 7.5 A max." },
            { id: "wire-12awg", name: "12 AWG wire, red and black", price: 15, confidence: "est" }
          ]},
          { id: "consider", title: "Worth considering", items: [
            { id: "accumulator-182-200", name: "Shurflo 182-200 accumulator", price: 63.96, confidence: "quoted",
              note: "Smooths trickle flow and cuts noise. Plumb the tee now, decide later." },
            { id: "silencing-kit", name: "Shurflo 94-591-01 silencing kit", price: 36, confidence: "est",
              note: "Flexible hose stubs at both ports." },
            { id: "inlet-check-valve", name: "Replacement city inlet check valve", price: 25, confidence: "est",
              note: "Only if the original fails its test." },
            { id: "p-trap", name: "P-trap for the sink drain", price: 15, confidence: "est",
              note: "Blocks gray tank odor coming back up." }
          ]},
          { id: "commissioning", title: "Commissioning", items: [
            { id: "bleach", name: "Unscented household bleach", price: 5, confidence: "est",
              note: "System sanitize before first use." },
            { id: "potable-hose", name: "Potable water fill hose, white", price: 22, confidence: "est",
              note: "Never reuse a garden hose on the fresh side." }
          ]}
        ]
      }
    ]
  },

  /* ── 03 ────────────────────────────────────────────────────── */
  {
    id: "non-negotiables",
    title: "Non-negotiables",
    intro: "Four things that will bite, in rough order of how expensive the mistake is.",
    blocks: [
      { kind: "notes", items: [
        { level: "stop", tag: "Never pressurize the fresh tank", body: [
          "RV fresh tanks are vented and atmospheric. Manufacturers warn explicitly that a sealed garden-hose connection straight to the tank is a pressurized connection and will burst it. Your city inlet is feet away from where the tank sits. The fill must be gravity or open-dish, and the two check valves are what keep the systems apart."
        ]},
        { level: "stop", tag: "No worm clamps on the pressure side", body: [
          "The whole trailer is worm-clamped on barbs, which was correct at gravity pressure and is not correct at 55&nbsp;psi. RV plumbing suppliers are blunt that screw clamps can't get tight enough for these fittings. PEX with proper crimp rings and the crimp tool, or nothing."
        ]},
        { level: "info", tag: "Weight is the constraint, not capacity", body: [
          "Roughly 1,300&nbsp;lb dry against a 2,000&nbsp;lb axle leaves about 700&nbsp;lb of payload — verify against your own plate. Water is 8.34&nbsp;lb/gal, so a 20-gallon tank is 167&nbsp;lb, or a quarter of everything you can carry, before the power station, battery, tools, food, and gear.",
          "Mount forward of the axle where possible. Water behind the axle reduces tongue weight, and low tongue weight on a 13-foot trailer is what starts highway sway."
        ]},
        { level: "info", tag: "The pump will be loud unless you plan for it", body: [
          "One owner described a same-model pump as sounding like a fight behind the galley cabinetry until they added an accumulator and sorbothane isolation pads — and credited the accumulator with most of the improvement. Don't rigid-mount to the shell; a fiberglass monocoque is a soundboard. Isolation pads and flexible hose stubs at both ports."
        ]}
      ]}
    ]
  },

  /* ── 04 ────────────────────────────────────────────────────── */
  {
    id: "order",
    title: "Order of work",
    intro: "Sequenced so nothing gets installed before the thing it depends on is known good.",
    blocks: [
      { kind: "sequence", steps: [
        { id: "test-inlet-cv",   title: "Test the city inlet check valve",
          detail: "Gates the whole architecture. Do this before spending money." },
        { id: "pressure-test",   title: "Pressure-test the existing city branch at 40–60 psi",
          detail: "It's designed for it. Bucket and shop vac staged. Find failures now, not at a campground." },
        { id: "assess-floor",    title: "Assess the floor in the open tank compartment",
          detail: "You'll never have better access. Probe the through-floor flange and the staining while it's exposed." },
        { id: "jug-season",      title: "Run the jug season",
          detail: "Measure real consumption. This is what sizes the tank." },
        { id: "house-12v",       title: "Build the 12 V house circuit",
          detail: "Fused, switched, with an indicator. Deferred until frame and wiring are inspected." },
        { id: "fit-hardware",    title: "Fit tank, pump, strainer, and PEX runs",
          detail: "Isolation-mounted, flexible stubs, tee into both existing lines." },
        { id: "sanitize",        title: "Sanitize, then commission",
          detail: "Bleach flush and rinse before anything gets drunk. Then leak-check under pressure." },
        { id: "accumulator-call", title: "Live with it a season, then decide on the accumulator",
          detail: "Tee left in place so it's a ten-minute retrofit." }
      ]}
    ]
  },

  /* ── 05 ────────────────────────────────────────────────────── */
  {
    id: "decisions",
    title: "Open decisions",
    intro: "Deliberately unresolved. Each one is waiting on information rather than a preference.",
    blocks: [
      { kind: "gates", items: [
        { id: "tank-size", gatedOn: "jug season", title: "Tank size and shape",
          body: "Target 12–15 gallons for two adults with a sink and no shower, which is about three days and matches the power system's 1.5–2 day window. Confirm against measured use, then pick a tank whose smallest dimension clears the tightest constraint in the compartment. Rotatable tanks give you three orientations to work with." },
        { id: "accumulator", gatedOn: "a season of use", title: "Accumulator",
          body: "The 4008's internal bypass means it may be unnecessary. But trickle flow is exactly the use case on a small trailer, and the noise reports are persuasive. Plumb the tee now, buy the tank later if the pulsing annoys you." },
        { id: "house-circuit", gatedOn: "frame and wiring inspection", title: "12 V house circuit",
          body: "The pump needs a fused 12 V supply. Do not tie into the original power converter — that means pulling the furnace and breaking a gas connection on 50-year-old equipment that hasn't been graded yet. Interim option: run the pump off the power station's 12 V output." },
        { id: "gray-side", gatedOn: "a look underneath", title: "Gray side",
          body: "Left in service so the sink still works. Unknown whether the drain junction is a plain tee or a diverter, and whether the underslung gray tank is frame-mounted or lag-screwed into the floor. Gray leaks are the ones that rot floors." }
      ]}
    ]
  },

  /* ── 06 ────────────────────────────────────────────────────── */
  {
    id: "references",
    title: "References",
    intro: "The first one is the important one — the same conversion on the same trailer.",
    blocks: [
      { kind: "refs", items: [
        { url: "http://www.chichak.ca/file/Trillium_Pump.html",
          title: "Trillium electric water pump — full conversion writeup",
          blurb: "Step-by-step on a Trillium 1300, with before and after plumbing diagrams. Source of the tee-into-both-lines architecture. Parts list is dated; the technique is not. Author rates it 8/10 difficulty.",
          source: "chichak.ca · primary" },
        { url: "https://www.fiberglassrv.com/threads/trillium-replace-original-water-pump-with-12v-system.1168506/",
          title: "Trillium: replace original water pump with 12 V system",
          blurb: "A 1980 Trillium 1300 owner asking the same question, wanting to reuse the existing faucet hole. Replies cover pump and faucet combos, strainers, cutoff switches, and pump noise.",
          source: "fiberglassrv.com · forum" },
        { url: "https://www.escapeforum.org/threads/replacing-a-shurflo-4008-water-pump-and-adding-an-accumulator.2209972/",
          title: "Replacing a Shurflo 4008 and adding an accumulator",
          blurb: "Recent thread on whether the accumulator earns its price alongside a 4008, plus notes on pump silencing hose kits.",
          source: "escapeforum.org · forum" },
        { url: "https://www.pentair.com/content/dam/extranet/nam/product-related/product-photo/hypro_shurflo/shurflo/RV-Pump-Conversion-Chart.pdf",
          title: "Shurflo RV pump conversion chart",
          blurb: "Manufacturer's own crosswalk. Confirms the 2088-422-444 specified in the Trillium writeup is superseded by the 4008-101-E65, so the substitution is Shurflo's, not a guess.",
          source: "pentair.com · manufacturer" },
        { url: "https://www.pentair.com/content/dam/extranet/web/nam/shurflo/data-sheets/pds-4008-101-X65.pdf",
          title: "Shurflo 4008-101-X65 technical data sheet",
          blurb: "One sheet covering both A65 and E65 — same pump, OEM versus aftermarket channel. 1/2\"-14 NPSM male ports, 6 ft dry prime, 55 psi cut-out, 40 psi cut-in, 10 A fuse.",
          source: "pentair.com · manufacturer" }
      ]}
    ]
  }

  ]
},

/* ─────────────────────────────────────────────────────────────────
   PLANNED — named so the launcher shows what is coming, with no
   invented content. Give one a `sections` array and it becomes a real
   page; delete the entry and it disappears. Nothing else references
   these, so pruning the list is a one-line edit.
   ───────────────────────────────────────────────────────────────── */
{ slug: "power",             name: "Power",             planned: true },
{ slug: "heater",            name: "Heater",            planned: true },
{ slug: "refrigerator",      name: "Refrigerator",      planned: true },
{ slug: "floor",             name: "Floor",             planned: true },
{ slug: "belly-band",        name: "Belly band",        planned: true },
{ slug: "exterior-refinish", name: "Exterior refinish", planned: true }

];
