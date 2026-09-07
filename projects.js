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
   FURNACE — INSPECT & DECIDE

   A GUIDE page, not a build page: `guide: true`. Guide pages are phases
   you work through and tick off, gated on a decision, rather than a
   design plus a shopping list. They carry no prices and no purchase
   decisions — the whole point of this one is to answer a question
   before spending anything.

   Ported from the standalone trillium-1300-furnace.html. Copy is
   verbatim: the CO thresholds, the UL 2034 argument, the asbestos
   handling and the documented-install table are research findings with
   real consequences. Do not tighten them.

   TWO THINGS CHANGED IN THE PORT, BOTH DELIBERATE:

   1. IDS. The standalone keyed steps positionally ("f0-0", "f0-1") and
      keyed kit items by their display name. Both are fine for one
      device's localStorage and fatal here: item_id is a primary key
      column in Postgres, so a positional id shifts every tick below it
      when a step is inserted, and a name-keyed id orphans its tick the
      moment someone rewords the label. Every id below is a stable slug.
      Same rule as everywhere else — reword freely, never rename.

   2. THE VERDICT. It was one more localStorage key. Here it is a
      page-level row in `project_state`, because it is the only piece of
      state on this page that belongs to the page rather than to an item.

   THE BRANCH. Phases 04 and 05 are mutually exclusive and gated on that
   verdict. `live` lists the verdict values that activate a branch. It is
   the ONLY representation of branch state — nothing stores "which branch
   is on", because two facts that can disagree is one too many. A phase
   whose branch is not live is dimmed and its steps leave the
   denominator; the ticks themselves are kept, so changing your mind and
   changing it back costs nothing.
   ───────────────────────────────────────────────────────────────── */
{
  slug: "furnace",
  name: "Furnace — inspect & decide",
  eyebrow: "1974 Trillium 1300 · Salt Lake City",
  guide: true,
  blurb: "One component decides whether it's free heat or scrap.",
  summary: "The original Duo-Therm gravity furnace hasn't run in four years. One component decides whether it's free heat or scrap: the heat exchanger. Everything here is built to answer that before spending a dollar.",

  /* Shown above the phases, in the rust band. This is the one rule that
     applies to every phase at once, so it does not live inside one. */
  standing: {
    tag: "Standing rule",
    body: "<b>Nothing in the burner box gets scraped, sanded, wire-wheeled, brushed, or shop-vacuumed dry.</b> The firebox gaskets on a 1970s Trillium are very likely asbestos — another owner found exactly this on a '76. Intact gasket sitting where it was installed is not hurting you; airborne dust is the entire hazard. You can complete the whole inspection without disturbing them. Don't disturb them until you've already decided to keep the furnace."
  },

  sections: [

  /* ── 00 ────────────────────────────────────────────────────── */
  {
    id: "before", num: "00",
    title: "Before you touch it",
    sub: "Nothing here costs money or is irreversible",
    intro: "The furnace has sat four years. This phase exists so that nothing you do in the first hour forecloses an option or hurts you.",
    blocks: [
      { kind: "steps", items: [
        { id: "gas-off", title: "Shut the propane off at the tank and disconnect it",
          detail: "Nothing in the inspection needs gas until you've already decided to keep the unit." },
        { id: "data-plate", title: "Find and photograph the data plate",
          detail: "Model and serial drive every parts search, manual, and forum thread from here on. If it's faded, shoot it anyway in raking light — it often reads better in a photo than in person." },
        { id: "photo-installed", title: "Photograph the unit as installed, from every angle",
          detail: "Exterior vent, interior grill, how the gas line routes, every fastener. You will need this whether it goes back in or comes out for good." },
        { id: "co-monitor", title: "Get a low-level CO monitor — not a household alarm",
          detail: "This is a distinct product class, not a nicer version of the thing in your hallway. See the note below before buying; a screen alone does not get you what you need." },
        { id: "plan-outdoors", title: "Plan to work outdoors from Phase 02 on",
          detail: "Open air, furnace out of the trailer, no one else in the work area." }
      ]},
      { kind: "notes", items: [
        { level: "key", tag: "Why an ordinary CO alarm won't do this job", body: [
          "A household alarm is built to UL 2034, a standard written to prevent nuisance calls to utilities and first responders. It is <b>not permitted to alarm below 30 ppm</b>, ever — even sustained for 30 days. At 70 ppm it may wait one to four hours. And if it has a digital display, that display is required to read zero below 30 ppm. So buying an alarm 'with a screen' gets you a device specifically engineered to hide the range you're trying to measure.",
          "What you want is a <b>low-level CO monitor</b>: electrochemical sensor, continuous sampling, displaying and alerting from roughly 5–25 ppm. These can't carry a UL 2034 listing precisely because they alert below its thresholds, so pair one with a listed alarm if you want code coverage too.",
          "<b>Two jobs, two tools.</b> For light-off diagnosis you want something handheld you can move — flue, grill, seams — like a Sensorcon Inspector (1–1,999 ppm, rugged, but 35 ppm first alarm is too high for sleeping). For the driveway night and the season, a fixed low-level unit like the Defender LL6270 or a vehicle-oriented Forensics FD-CAR001. The handheld tells you where it's coming from; the fixed one tells you whether it accumulates while nobody's watching."
        ]},
        { level: "info", tag: "Keep this straight", body: [
          "No monitor removes a single molecule of carbon monoxide. It verifies that your venting works. If you find yourself relying on the alarm to tell you when to open a window, the furnace has already failed its test and the answer is not a better alarm."
        ]},
        { level: "stop", tag: "On the asbestos", body: [
          "Firebox gasket material on these is very likely asbestos. Handle it by <b>not handling it</b>. Every step in phases 00 through 03 can be done without touching a gasket. The decision to disturb them comes only after the exchanger has already passed — and it's a separate decision from keeping the furnace, because intact gaskets can be left alone."
        ]}
      ]}
    ]
  },

  /* ── 01 ────────────────────────────────────────────────────── */
  {
    id: "in-place", num: "01",
    title: "Inspect it where it sits",
    sub: "Most of the answer, before anything comes apart",
    intro: "These furnaces have a heat exchanger inspection hatch. That's the whole reason this is doable in a driveway rather than a shop. Work this phase before removing anything — it may settle the question on its own.",
    blocks: [
      { kind: "steps", items: [
        { id: "vent-flue", title: "Inspect the exterior vent and flue",
          detail: "Obstructions, cracks, degraded seals. Four years parked in Utah means mud daubers, spiders, and mice — clear anything that could restrict exhaust flow." },
        { id: "pull-grill", title: "Pull the interior grill", detail: "" },
        { id: "hatch-off", title: "Remove the heat exchanger inspection hatch",
          detail: "Bag the screws. Don't force a seized one — heat and penetrant, not more torque." },
        { id: "read-walls", title: "Read the exchanger walls, top to bottom",
          detail: "The pass condition, in another owner's words after doing exactly this: clean, no rust, all the way to the top, inside and out." },
        { id: "score-burner", title: "Score the burner separately from the exchanger",
          detail: "The same owner found his exchanger clean but the burner very rusty, with rust dust collected at the bottom of the box. A rotten burner is a parts problem. A rotten exchanger is the end. Don't let one verdict contaminate the other." },
        { id: "mirror-light", title: "Bright light and mirror from the burner side",
          detail: "Dark garage, strong light inside the firebox, mirror at the exchanger. Any light passing through an exchanger wall is a crack, and a crack ends it." },
        { id: "gasket-note", title: "Note burner gasket condition without touching it",
          detail: "Cracks or leaks here cause poor combustion. Photograph, write it down, move on. This is information, not a task." }
      ]},
      { kind: "notes", items: [
        { level: "key", tag: "What you're actually deciding", body: [
          "Rusted heat exchangers reduce efficiency and risk carbon monoxide leaking into the cabin, and on a unit this age replacement beats repair because the corrosion is everywhere at once. There is no repairing a cracked exchanger — it isn't a skill or budget problem, the part doesn't exist. Everything else on this furnace is serviceable or substitutable. <b>The exchanger is the entire decision.</b>"
        ]},
        { level: "stop", tag: "Known outcome in your exact trailer", body: [
          "A Trillium 1300 owner who pulled his reported he was very glad he did — it was cracked open. Go in expecting that this is a real possibility rather than a formality, or you'll talk yourself past evidence you don't want to see."
        ]}
      ]}
    ]
  },

  /* ── 02 ────────────────────────────────────────────────────── */
  {
    id: "pull-it", num: "02",
    title: "Pull it out",
    sub: "Reversible — and the only view that settles it",
    intro: "Removal gives you the exterior of the exchanger, the flue collar, and an honest look at the shell penetration. All three matter, and the last one belongs to the refinish plan whichever way this goes.",
    blocks: [
      { kind: "steps", items: [
        { id: "disconnect", title: "Disconnect gas, 12V if present, and the thermostat",
          detail: "Cap the gas line. Label the wires." },
        { id: "drill-rivets", title: "Drill the exhaust rivets — don't pry",
          detail: "On a Trillium the furnace exhaust and the belly band are just about the only pop-riveted penetrations in the shell. You're refinishing this panel; a pried flange leaves you fairing damage you created." },
        { id: "bag-fasteners", title: "Bag and label every fastener by location", detail: "" },
        { id: "support-unit", title: "Support the unit before the last fastener comes out",
          detail: "Gravity furnaces are heavier than they look and there's nothing to catch it." },
        { id: "photo-geometry", title: "Photograph the duct and flue geometry before it separates",
          detail: "Reinstallation means blindly fitting the exhaust and intake ducts into their mating exterior fittings — one owner flags this as the hard part of putting one back. Shoot the alignment now while you can see it." },
        { id: "document-opening", title: "Document the shell opening",
          detail: "Flange condition, sealant state, crazing or stress marks around the cutout. Whether this gets rebedded or glassed shut is now a live item in the refinish plan." },
        { id: "exterior-daylight", title: "Examine the exchanger exterior in daylight",
          detail: "Scale, rust-through pitting, weeping seams, any deformation. This is the view you couldn't get through the hatch." }
      ]}
    ]
  },

  /* ── 03 ────────────────────────────────────────────────────── */
  {
    id: "verdict", num: "03",
    title: "The verdict",
    sub: "Decision gate — everything downstream branches here",
    blocks: [
      { kind: "verdict",
        stateKey: "verdict",
        title: "Heat exchanger verdict",
        sub: "What did the walls actually look like?",
        options: [
          { k: "good", label: "Clean metal top to bottom, no light through", short: "Sound",
            body: "<b>Keep it, at least for a season.</b> Clean it, decide the gasket question separately, and run it. You've spent nothing and you'll finish the season knowing your real heat demand — which makes any later purchase a calculation instead of a guess." },
          { k: "ok", label: "Surface rust only, sound walls, no light through", short: "Surface rust",
            body: "<b>Keep it, with a re-inspection habit.</b> Surface rust on an otherwise sound exchanger is fifty years of parked humidity, not failure. Re-check through the hatch every season and stop the moment scale turns into pitting." },
          { k: "marginal", label: "Heavy scale or rust-through pitting, no visible crack", short: "Failed",
            body: "<b>Treat as failed.</b> Corrosion on these is progressive and rarely local, replacement parts effectively don't exist, and the failure mode is carbon monoxide in a 60 sq ft space while you sleep. Not worth the annual re-litigation. Glass the hole shut during refinish and move to the replacement branch." },
          { k: "bad", label: "Light through the exchanger, or a visible crack", short: "Cracked",
            body: "<b>Done — and cleanly.</b> Not repairable at any budget. Scrap the unit, glass the vent hole shut in refinish phase 2, and take the replacement decision on heating merits alone. You now know something concrete about your trailer that cost you an afternoon." }
        ]
      },
      { kind: "notes", items: [
        { level: "stop", tag: "The thing nobody advertises", body: [
          "A well-regarded voice on Fiberglass RV argues these gravity furnaces are no longer approved for use in a trailer, the issue being <b>surface temperature</b> — a blanket or sleeping bag against the front face is a fire risk — and that no professional will touch one because there'd be no insurance if it killed you. The same person then says he wouldn't hesitate to install one in his own trailer: no power draw, no moving parts, they could almost last forever.",
          "Both halves are true. This is a DIY-only path and an insurance grey area, and it means whatever you build around it needs real clearance and nothing soft stored nearby."
        ]},
        { level: "info", tag: "If it fails, you gain something", body: [
          "A failed exchanger isn't a setback so much as a resolved gate. It converts a maybe into a known shell repair you can schedule into refinish phase 2, and it frees the replacement decision to be made on heating merits alone instead of sentimentality about the original part."
        ]}
      ]}
    ]
  },

  /* ── 04 ── branch: exchanger passed ────────────────────────── */
  {
    id: "recommission", num: "04",
    title: "Keep it: recommission",
    sub: "Branch — only if the exchanger passed",
    branch: true, live: ["good", "ok"],
    intro: "The goal of this branch is not a restoration. It's one instrumented season that tells you how much heat you actually need before you spend twelve hundred dollars guessing.",
    blocks: [
      { kind: "steps", items: [
        { id: "gasket-decision", title: "Decide whether to disturb the gaskets at all",
          detail: "Intact is intact. A serviceman quoted on the Trillium forums simply washes them off and cleans up. If yours are sound, leaving them undisturbed for a test season is a legitimate choice, not a shortcut." },
        { id: "wet-method", title: "If you do remove them: wet method only",
          detail: "Mist with water and a few drops of dish soap so the fibers absorb rather than fly. N-100 or P-100 respirator — a hardware-store dust mask does nothing. Disposable suit, gloves, goggles. Outdoors, furnace out of the trailer, nobody else present." },
        { id: "double-bag", title: "Double-bag, then bag again outside the work area",
          detail: "Thick plastic, sealed and labelled. Utah disposal rules are specific — check before, not after. Wash yourself down immediately and take the suit off before you leave the area." },
        { id: "new-gasket", title: "Replace gaskets with high-temp gasket maker",
          detail: "The Trillium restomod thread cites a product rated to 371°C. Match or beat that." },
        { id: "clean-burner", title: "Clean the burner and combustion air path",
          detail: "Soft brush, low-pressure compressed air. Only after the gasket question is fully resolved and the area is clean." },
        { id: "rebed-flange", title: "Rebed the exhaust flange on reinstall",
          detail: "Butyl. Coordinate with refinish phase 5 — this is a water-intrusion opportunity you won't get again." },
        { id: "leak-test", title: "Leak-test every joint with soapy solution",
          detail: "Never an open flame. Watch for growing bubbles, not just instant ones." },
        { id: "first-light", title: "First light-off outside, away from the trailer",
          detail: "Handheld meter in your hand — probe the flue, the grill, and every seam while it runs. Flame should be blue and stable. Yellow, lifting, or lazy means stop and diagnose; at altitude that's a mixture question, not a nuisance." },
        { id: "driveway-night", title: "Run a full night in the driveway before it goes anywhere",
          detail: "Fixed low-level monitor inside, closed up as you'd actually sleep in it, you in the house. Read it in the morning. Cheap, and it's the only test that resembles real use." },
        { id: "instrument-season", title: "Instrument the season",
          detail: "Log outside temp, inside temp, how the furnace behaves, and propane consumed per night. That data is what makes the replacement decision easy later instead of speculative." }
      ]},
      { kind: "notes", items: [
        { level: "key", tag: "What you gain by waiting", body: [
          "An owner on the Trillium forums reports still running the original Duo-Therm and using it every single time they camp. Another notes the real tradeoff plainly: gravity furnaces use a lot of gas for the heat they produce, but they're much safer than a catalytic in a small volume with imperfect ventilation, and they cost you nothing in battery. In a build where idle draw is your binding constraint, zero amps is not nothing."
        ]}
      ]}
    ]
  },

  /* ── 05 ── branch: exchanger failed ────────────────────────── */
  {
    id: "replace", num: "05",
    title: "Replace it: what the eggs actually did",
    sub: "Branch — the 13-ft record, not van advice",
    branch: true, live: ["bad", "marginal"],
    intro: "Heaters do fit these trailers; the question was only ever where. Six documented installs in 13-ft eggs and near neighbours, and the pattern is clear: most went inside, under a seat.",
    blocks: [
      { kind: "table",
        caption: "Documented installs",
        head: ["Trailer &amp; unit", "Where it went"],
        rows: [
          ["Trillium 1300 · HS2000", "Under the couch in the corner. Builder made a flat mounting surface and cut two large holes for combustion intake and exhaust."],
          ["Trillium · HS2800", "Under the curb-side dinette, positioned farthest from the kids' bunk. Held ~50°F inside at −12°F outside, running all night."],
          ["Scamp 13 · HS2211", "<b>The only documented underfloor install.</b> Under the floor on the curbside, inside the steel frame for debris protection. Propane split just before it enters the camper, black iron pipe along the street-side frame to behind the axle, then 3/8 in. copper across. Two floor holes inside the dinette bench storage near the water tank — hot out, return in."],
          ["Scamp 13d · HS2000", "Held 68°F with 0°F outside, no window insulation, only a rug on the floor."],
          ["Boler 13 · Propex", "Under the left front corner seat."],
          ["Casita 17 · Propex", "Underneath, front passenger corner by the closet. Venting emerged at the base of the closet."]
        ]
      },
      { kind: "notes", items: [
        { level: "key", tag: "Size is settled", body: [
          "6,500 BTU is enough — the Scamp 13d number above is the proof, and it was achieved with no window insulation and a bare floor. The one owner here who went to 9,500 BTU says outright he would not go with the larger furnace again, partly because a bigger unit short-cycles and <b>it's the cycling that keeps you awake</b>. Buy the small one."
        ]},
        { level: "stop", tag: "External is not automatically the quiet option", body: [
          "A 13-ft Scamp owner who mounted an HS2211 underfloor calls it loud — all fan noise, coming out of both the intake and the output vents, and in his judgement not enough better than the stock Scamp furnace to justify the swap. The replies point at ducting: the right length makes a large difference, and Westy Ventures sells a low-noise heat line that reportedly drops the decibel level significantly. The Trillium HS2800 owner was fabricating a muffler. <b>Treat noise as something you engineer at install time, not a number you read off a spec sheet.</b>"
        ]}
      ]},
      { kind: "steps", items: [
        { id: "measure-clearance", title: "Measure under-floor clearance around your added grey tank",
          detail: "You have evidence there's some room down there — but a Scamp owner walked away from an underfloor install over vent and clearance requirements plus lack of space, and another specifically flagged the grey water tank as the obstruction. Measure before assuming." },
        { id: "clearance-1in", title: "Check the 1 in. all-around clearance requirement",
          detail: "That's the mounting stipulation, and it has to include the LP connection and the electrical connection, not just the box." },
        { id: "internal-external", title: "Decide internal vs external",
          detail: "Internal: two ~1 in. holes for combustion intake and exhaust, plus the gas line. External: two ~2.75 in. holes for hot air and cold return, plus the wiring harness. Different holes, different floor locations, both decided before floor work." },
        { id: "discharge-location", title: "Pick the discharge location against the bunk",
          detail: "Air leaves at roughly 180°F. You need real space above bedding, and the Trillium HS2800 owner deliberately sited his as far from the sleeping kids as the trailer allowed." },
        { id: "two-stage-reg", title: "Confirm two-stage regulator",
          detail: "A single-stage regulator should be replaced with a two-stage. This interacts with the cooking decision — resolve them together." },
        { id: "low-noise-line", title: "Budget for the low-noise heat line up front",
          detail: "Cheaper than the muffler you'll otherwise fabricate in year two." }
      ]},
      { kind: "notes", items: [
        { level: "info", tag: "On the GTR10", body: [
          "No DIY install writeup exists yet in North America, Whale lists no spares stocked here, and Propex NA states the combustion tubing and ducting must not be lengthened or shortened — which is precisely the freedom every install above depended on to find a mounting spot. Its automatic altitude mixture control is a real advantage for the Uintas. Weigh that against being the person writing the first guide."
        ]}
      ]}
    ]
  },

  /* ── K ── the kit ──────────────────────────────────────────── */
  {
    id: "kit", num: "K",
    title: "Kit for the inspection",
    sub: "Gold = don't improvise a substitute",
    intro: "Everything here is cheap except the respirator, and the respirator is only needed if you decide to disturb the gaskets.",
    blocks: [
      { kind: "kit", groups: [
        { title: "Inspection", items: [
          { id: "co-fixed", name: "Low-level CO monitor, fixed", key: true,
            note: "Displays and alerts from ~5 ppm. A UL 2034 household alarm cannot do this" },
          { id: "co-handheld", name: "Handheld CO meter", key: true,
            note: "For probing the flue and seams during light-off. Sensorcon Inspector or equivalent" },
          { id: "light-mirror", name: "Bright inspection light + telescoping mirror", key: true,
            note: "The crack test" },
          { id: "drivers", name: "Nut drivers, stubby screwdrivers",
            note: "Hatch and grill fasteners in tight quarters" },
          { id: "penetrant", name: "Penetrating oil",
            note: "Seized hatch screws — heat and patience, not torque" },
          { id: "camera-notebook", name: "Phone or camera + notebook",
            note: "Data plate, geometry, gasket condition" },
          { id: "bags-marker", name: "Zip bags + marker",
            note: "Fastener sets by location" }
        ]},
        { title: "If you disturb the gaskets", items: [
          { id: "respirator", name: "N-100 or P-100 respirator", key: true,
            note: "Fitted. A dust mask does nothing here" },
          { id: "coveralls", name: "Disposable coveralls, gloves, goggles", key: true,
            note: "Removed before leaving the work area" },
          { id: "sprayer", name: "Pump sprayer + dish soap", key: true,
            note: "Wet method — fibers absorb instead of flying" },
          { id: "disposal-bags", name: "6 mil disposal bags", key: true,
            note: "Double-bagged, sealed, labelled" },
          { id: "gasket-maker", name: "High-temp gasket maker, 371°C+", key: true,
            note: "Replacement gasket material" }
        ]},
        { title: "If it passes", items: [
          { id: "brush-air", name: "Soft brass brush, low-pressure air",
            note: "Burner and combustion air path" },
          { id: "leak-solution", name: "Leak detection solution", key: true,
            note: "Never an open flame" },
          { id: "butyl", name: "Butyl tape",
            note: "Rebedding the exhaust flange" },
          { id: "burner-spare", name: "Replacement burner (contingency)",
            note: "Only if the exchanger passed and the burner didn't" },
          { id: "thermometer", name: "Min/max thermometer or logger", key: true,
            note: "For the instrumented season" }
        ]}
      ]}
    ]
  },

  /* ── R ── sources ──────────────────────────────────────────── */
  {
    id: "sources", num: "R",
    title: "Sources worth reading first",
    sub: "The 13-ft egg record, not van-conversion advice",
    blocks: [
      { kind: "refs", title: "The furnace itself", items: [
        { title: "Duo-Therm 11HLU gravity furnace",
          url: "https://vintagetrailertalk.freeforums.net/thread/11944/duo-therm-11hlu-gravity-furnace",
          source: "vintagetrailertalk.freeforums.net",
          blurb: "Written specifically because there wasn't much information out there. Closest thing to a repair tutorial that exists for these." },
        { title: "Duo Therm Furnace Settings",
          url: "https://www.fiberglassrv.com/threads/duo-therm-furnace-settings.1138934/",
          source: "fiberglassrv.com",
          blurb: "An owner walks through removing the grill and the heat exchanger inspection hatch and reports what he found. Your calibration for normal-old versus finished." },
        { title: "Trillium furnace replacement",
          url: "https://www.fiberglassrv.com/forums/f55/trillium-furnace-replacement-101538.html",
          source: "fiberglassrv.com",
          blurb: "A 1300 owner who pulled his and was very glad he did. It was cracked open. Your downside case, in your exact trailer." },
        { title: "1970s Duo-Therm gravity propane heater",
          url: "https://www.fiberglassrv.com/forums/f51/1970s-duo-therm-gravity-propane-heater-94819.html",
          source: "fiberglassrv.com",
          blurb: "Where the surface-temperature and approval-status argument gets made, and rebutted, by the same person. Read both halves." }
      ]},
      { kind: "refs", title: "Asbestos handling", items: [
        { title: "Asbestos?",
          url: "https://www.fiberglassrv.com/threads/asbestos.1157234/",
          source: "fiberglassrv.com",
          blurb: "A '76 Trillium owner asking exactly your question, having found gasket material around the firebox. Includes the wet-removal advice." },
        { title: "Safe Restoration: Asbestos in Vintage Trailers",
          url: "https://tincantourists.com/2020/05/27/safe-restoration-asbestos-in-vintage-trailers/",
          source: "tincantourists.com",
          blurb: "Respirator selection, containment, double-bagging, disposal, and decontamination — written for trailer restorers rather than abatement contractors." }
      ]},
      { kind: "refs", title: "What the 13-ft eggs actually did", items: [
        { title: "Propex Furnace Installation",
          url: "https://www.fiberglassrv.com/threads/propex-furnace-installation.1167340/",
          source: "fiberglassrv.com",
          blurb: "HS2000 going into a Trillium under the couch. Also contains an owner reporting he still runs the original Duo-Therm every trip." },
        { title: "Propex Heater installed under Scamp 13",
          url: "https://fiberglassrv.com/forums/f56/propex-heater-installed-under-scamp-13-a-97922.html",
          source: "fiberglassrv.com",
          blurb: "The only documented underfloor install on a 13-ft egg, with the full gas routing described end to end." },
        { title: "Propex HS2800 Heater Install — Trillium",
          url: "https://www.fiberglassrv.com/threads/propex-hs2800-heater-install-trillium.1171399/",
          source: "fiberglassrv.com",
          blurb: "Real cold-weather numbers and the 1 in. all-around clearance requirement. Page 2 has the oversizing retrospective and the \"LOUD LOUD LOUD\" report on an HS2211 in a 13-ft Scamp." },
        { title: "Propex 2211 Heater Install",
          url: "https://fiberglassrv.com/forums/f56/propex-2211-heater-install-68510.html",
          source: "fiberglassrv.com",
          blurb: "Scamp 16 going external. Contains the owner who concluded underfloor was the quiet route but never did it for lack of space, plus the Scamp 13d performance figure." },
        { title: "Retrofitting Factory Propane Heater",
          url: "https://www.fiberglassrv.com/forums/f56/restrofitting-factory-propane-heater-99860.html",
          source: "fiberglassrv.com",
          blurb: "The Boler 13 under-seat mount, the Casita front-corner mount, and a Scamp owner explaining why he walked away from underfloor." }
      ]},
      { kind: "refs", title: "Propex installation references", items: [
        { title: "Propex HS2000 Heater Installation",
          url: "https://faroutride.com/propex-install/",
          source: "faroutride.com",
          blurb: "The canonical writeup. Hole sizes for internal versus external, and the two-stage regulator requirement." },
        { title: "HS2211 underfloor installation manual (PDF)",
          url: "https://www.propexheatsource.co.uk/wp-content/uploads/2013/12/HS2211-underloor-installation.pdf",
          source: "propexheatsource.co.uk",
          blurb: "The official document. Free, and the clearance requirements are non-negotiable." },
        { title: "How to install a Propex HS2211",
          url: "https://vandercampadventures.com/campervan-heater-installation/",
          source: "vandercampadventures.com",
          blurb: "A 25-stage walkthrough covering both the heater and the gas side, including controller placement." },
        { title: "Propex HS2211 pictures and details",
          url: "https://www.sportsmobileforum.com/threads/propex-hs2211-propane-heater-pictures-and-details.746663/",
          source: "sportsmobileforum.com",
          blurb: "Best photographic detail on hole geometry, and the note that the supplied cardboard intake duct doesn't survive installation." },
        { title: "My Propex Heater installation",
          url: "https://www.tnttt.com/viewtopic.php?f=54&t=72075",
          source: "tnttt.com",
          blurb: "Teardrop rather than van — closest analog to a 1300. Notes the 180°F discharge and the low-noise heat line." },
        { title: "Westy Ventures — Propex",
          url: "http://www.westyventures.com/propex.html",
          source: "westyventures.com",
          blurb: "US importer. Source for the low-noise heat line that owners credit with a real reduction in fan noise." }
      ]},
      { kind: "refs", title: "If it fails: the GTR10 option", items: [
        { title: "Propex Heat Air Space Heater GTR10",
          url: "https://propexnorthamerica.com/setsl10611-whale-heat-air-space-heater-gtr10/",
          source: "propexnorthamerica.com",
          blurb: "The US seller. Explains the automatic combustion-air mixture adjustment for altitude, and states the tubing must not be lengthened or shortened." },
        { title: "Whale Heat Air GTR10 kits",
          url: "https://www.delcity.net/store/Whale-Heat-Air-Heater-Kits/p_972558.h_972560",
          source: "delcity.net",
          blurb: "Itemized contents for the onboard and underfloor kits — the most useful artifact for pricing a real install. Note these kits are not returnable." }
      ]},
      { kind: "refs", title: "Carbon monoxide", items: [
        { title: "Know before buying: CO detector guide",
          url: "https://codetectors.com/pages/know-before-buying",
          source: "codetectors.com",
          blurb: "Lays out exactly what UL 2034 requires and forbids, against what health bodies actually recommend." },
        { title: "Don't compromise — get a low-level CO monitor",
          url: "https://www.energyvanguard.com/blog/don-t-compromise-get-a-low-level-carbon-monoxide-monitor/",
          source: "energyvanguard.com",
          blurb: "Why low-level monitors can't be UL listed, and what that means for choosing one." },
        { title: "Defender LL6270 low-level CO monitor",
          url: "https://www.inspectortools.com/defender-ll6270-low-level-co-monitor/",
          source: "inspectortools.com",
          blurb: "Representative fixed unit: displays from 5 ppm, warns at 9, alarms at 25, samples every five seconds." },
        { title: "CO levels chart and UL 2034 thresholds",
          url: "https://www.co2meter.com/blogs/news/carbon-monoxide-levels-chart",
          source: "co2meter.com",
          blurb: "The actual numbers: what a listed alarm is permitted to ignore, and for how long." }
      ]}
    ]
  },

  /* ── S ── sequence ─────────────────────────────────────────── */
  {
    id: "sequence", num: "S",
    title: "Sequence",
    sub: "Where this sits against the rest of the build",
    blocks: [
      { kind: "seq", text:
"<b>A.</b>  Gas off → data plate → photograph everything as installed\n" +
"<b>B.</b>  Inspect in place: flue, grill, hatch, exchanger, burner\n" +
"     └─ may end here, cheaply, either way\n" +
"<b>C.</b>  Pull the unit outdoors → full exchanger examination  ──▶ <b>DECISION GATE</b>\n" +
"     │\n" +
"     ├── PASS ──▶ clean → leak test → light off outside → driveway night\n" +
"     │            └─ then <b>instrumented season</b> before spending anything\n" +
"     │\n" +
"     └── FAIL ──▶ glass the vent hole shut  <b>during refinish phase 2</b>\n" +
"                  └─ replacement decision, on its own merits\n" +
"\n" +
"<b>!</b>   The shell penetration is upstream of paint. Decide before <b>refinish 04</b>."
      }
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
{ slug: "refrigerator",      name: "Refrigerator",      planned: true },
{ slug: "floor",             name: "Floor",             planned: true },
{ slug: "belly-band",        name: "Belly band",        planned: true },
{ slug: "exterior-refinish", name: "Exterior refinish", planned: true }

];
