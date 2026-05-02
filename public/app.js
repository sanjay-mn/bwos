const state = {
  user: null,
  token: null,
  permissions: { screens: [], actions: [] },
  inventory: [],
  suppliers: [],
  purchaseOrders: [],
  deliveryChallans: [],
  packagingDocuments: [],
  movements: [],
  reports: null,
  users: [],
  customers: [],
  projects: [],
  services: [],
  quoteConfig: null,
  quoteRequests: [],
  projectServiceSelection: [],
  selectedProjectId: "",
  projectDocuments: [],
  selectedProjectDocumentId: "",
  activeTab: "overview",
  selectedBlogSlug: "laser-hair-removal-device-prototypes",
  supplierOptions: [],
  supplierIndustries: [],
  supplierTotalCount: 0,
  supplierVisibleCount: 12,
  supplierIndustryFilter: "All",
  supplierApprovalFilter: "All",
  supplierSearchQuery: "",
  workspaceSearchQuery: "",
  workspaceSearchTarget: "",
  supplierRequirement: "",
  supplierScope: "local",
  supplierAssistantSummary: "",
  onlineVendors: [],
  supplierGrouped: true,
  suppliersLoaded: false,
  supplierEditor: {
    open: false,
    supplierId: null,
    focusField: "name",
  },
  bankEditor: {
    open: false,
    supplierId: null,
  },
  inventoryEditor: {
    open: false,
    inventoryId: null,
  },
  purchaseOrderEditor: {
    open: false,
    orderId: null,
  },
  workspaceDetailsOpen: false,
  quoteEntryProcess: "CNC Machining",
};

const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const dashboardRoot = document.querySelector("main.dashboard");
const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const customerAccessForm = document.querySelector("#customerAccessForm");
const customerAccessError = document.querySelector("#customerAccessError");
const customerAccessSubmitButton = document.querySelector("#customerAccessSubmitButton");
const customerSignupProcess = document.querySelector("#customerSignupProcess");
const customerSignupProcessDisplay = document.querySelector("#customerSignupProcessDisplay");
const landingProcessGrid = document.querySelector("#landingProcessGrid");
const authModeTabs = [...document.querySelectorAll("[data-auth-view]")];
const authModeLinks = [...document.querySelectorAll("[data-auth-view-target]")];
const signupStage = document.querySelector("#signupStage");
const loginStage = document.querySelector("#loginStage");
const logoutButton = document.querySelector("#logoutButton");
const workspaceDetailsButton = document.querySelector("#workspaceDetailsButton");
const workspaceProfileButton = document.querySelector("#workspaceProfileButton");
const closeWorkspaceDetailsButton = document.querySelector("#closeWorkspaceDetailsButton");
const workspaceDetailsModal = document.querySelector("#workspaceDetailsModal");
const userName = document.querySelector("#userName");
const userMeta = document.querySelector("#userMeta");
const permissionSummary = document.querySelector("#permissionSummary");
const metricsRoot = document.querySelector("#metrics");
const metricTemplate = document.querySelector("#metricTemplate");
const tabsRoot = document.querySelector("#tabs");
const tabs = [...document.querySelectorAll(".tab")];
const panels = {
  overview: document.querySelector("#overviewTab"),
  quotes: document.querySelector("#quotesTab"),
  requests: document.querySelector("#requestsTab"),
  inventory: document.querySelector("#inventoryTab"),
  suppliers: document.querySelector("#suppliersTab"),
  purchaseOrders: document.querySelector("#purchaseOrdersTab"),
  customers: document.querySelector("#customersTab"),
  projects: document.querySelector("#projectsTab"),
  projectWorkspace: document.querySelector("#projectWorkspaceTab"),
  reports: document.querySelector("#reportsTab"),
  profile: document.querySelector("#profileTab"),
  users: document.querySelector("#usersTab"),
  logistics: document.querySelector("#logisticsTab"),
  blogs: document.querySelector("#blogsTab"),
};

const inventoryForm = document.querySelector("#inventoryForm");
const publicQuoteForm = document.querySelector("#publicQuoteForm");
const movementForm = document.querySelector("#movementForm");
const supplierForm = document.querySelector("#supplierForm");
const purchaseOrderForm = document.querySelector("#purchaseOrderForm");
const customerForm = document.querySelector("#customerForm");
const projectForm = document.querySelector("#projectForm");
const serviceForm = document.querySelector("#serviceForm");
const projectDocumentForm = document.querySelector("#projectDocumentForm");
const profileForm = document.querySelector("#profileForm");
const userForm = document.querySelector("#userForm");
const challanForm = document.querySelector("#challanForm");
const packagingForm = document.querySelector("#packagingForm");
const quoteReviewForm = document.querySelector("#quoteReviewForm");
const blogList = document.querySelector("#blogList");
const blogViewer = document.querySelector("#blogViewer");

const inventoryFormPanel = document.querySelector("#inventoryFormPanel");
const movementPanel = document.querySelector("#movementPanel");
const supplierFormPanel = document.querySelector("#supplierFormPanel");
const purchaseOrderFormPanel = document.querySelector("#purchaseOrderFormPanel");
const userFormPanel = document.querySelector("#userFormPanel");
const challanFormPanel = document.querySelector("#challanFormPanel");
const packagingFormPanel = document.querySelector("#packagingFormPanel");

const BLOG_POSTS = [
  {
    slug: "laser-hair-removal-device-prototypes",
    title: "Laser Hair Removal Device Prototypes",
    category: "Medical Device Prototyping",
    readTime: "12 min read",
    icon: "✦",
    excerpt: "A full guide to prototyping handheld laser-hair-removal products, from ergonomic housing studies to cosmetic samples and tooling-ready DFM.",
    heroLead:
      "Handheld cosmetic devices demand a rare mix of industrial design quality, electronics integration, thermal control, and manufacturing realism. A prototype is only valuable if it helps the team decide what to test next and what to lock before tooling.",
    figure: {
      title: "Prototype Program Structure",
      caption: "Concept shell -> assembly validation -> cosmetic sample -> tooling-oriented DFM",
      badges: ["Ergonomics", "Optics Packaging", "Thermal Risk", "Cosmetic Finish"],
      theme: "medical",
    },
    media: {
      heroImage: "/assets/blogs/laser-hair-device-hero.webp",
      heroAlt: "Industrial handheld consumer-electronics form used as a medical device prototyping reference",
      supportImage: "/assets/blogs/laser-hair-device-support.webp",
      supportAlt: "Refined handheld device form showing production-oriented cosmetic detailing",
    },
    stats: [
      ["Best early process", "SLA / SLS"],
      ["Best cosmetic sample", "Vacuum casting"],
      ["Before tooling", "DFM + assembly review"],
    ],
    processStages: [
      {
        title: "Concept validation",
        text: "Use printed housings to test grip, switch placement, screen location, cable exits, and basic internal packaging before committing to cosmetic geometry.",
      },
      {
        title: "Functional packaging",
        text: "Validate thermal parts, optics brackets, battery pack location, fastening strategy, and serviceability with higher-accuracy prototypes.",
      },
      {
        title: "Cosmetic pre-production",
        text: "Move into vacuum casting or machined cosmetic masters when the goal shifts from learning to stakeholder approval and production-readiness.",
      },
    ],
    bulletGroups: [
      {
        title: "Applications",
        icon: "◎",
        items: ["Consumer beauty devices", "Clinic evaluation units", "Demo samples for investors", "Pilot builds before tooling"],
      },
      {
        title: "Critical checks",
        icon: "◌",
        items: ["Handle comfort and center of gravity", "Button and UI placement", "Internal stack-up and tolerance closure", "Seam line visibility on customer-facing surfaces"],
      },
      {
        title: "Material direction",
        icon: "△",
        items: ["ABS-like resins for concept feel", "PC / ABS for durability studies", "TPU overmold concepts for grip zones", "Clear parts for window or light-path evaluation"],
      },
    ],
    sections: [
      {
        heading: "Why these programs fail when prototyping is too shallow",
        body:
          "Teams often move too quickly from rough appearance models to tooling conversations. That skips the stage where enclosure proportions, internal electronics routing, lens stack tolerance, and heat-management interfaces are still being discovered. The result is a part that looks mature on screen but has not yet survived real assembly or user interaction.",
      },
      {
        heading: "How Brahmworks structures the prototype plan",
        body:
          "We usually split the work into three rounds. Round one proves ergonomics and package architecture. Round two proves assembly and performance interfaces. Round three creates cosmetic, investor-ready, or pilot-run samples that are close enough to begin tooling DFM. This staged approach avoids forcing one prototype to answer every question at once.",
      },
      {
        heading: "Where manufacturing choice matters most",
        body:
          "3D printing is fastest when the geometry is still moving. CNC machining is useful for crisp datum control, inserts, and metal subcomponents. Vacuum casting is valuable once the exterior experience matters and the team needs multiple parts with better color, texture, and presentation quality than raw prints.",
      },
      {
        heading: "The handoff to production tooling",
        body:
          "Once the industrial design and internal stack-up are stable, the next step is not another generic sample. It is a tooling-oriented review that checks draft, shutoffs, wall consistency, assembly strategy, and cosmetic risk. That is the point where a prototype becomes a manufacturing document instead of only a demo model.",
      },
    ],
    callout:
      "Brahmworks recommendation: for handheld cosmetic devices, prototype for learning first and for beauty second. Cosmetic fidelity matters most after the enclosure, assembly, and heat path are already stable.",
  },
  {
    slug: "sla-vs-sls-vs-vacuum-casting-comparison",
    title: "SLA vs SLS vs Vacuum Casting: Complete Comparison for Rapid Prototyping",
    category: "Rapid Prototyping",
    readTime: "13 min read",
    icon: "△",
    excerpt: "A longer-form comparison of surface finish, strength, quantity range, cost behavior, and where each process fits in a real product development cycle.",
    heroLead:
      "Teams rarely choose between SLA, SLS, and vacuum casting in the abstract. They choose between appearance quality, strength, speed, quantity, and what decision the prototype is meant to unlock. The right process becomes obvious once the prototype objective is clear.",
    figure: {
      title: "Three Fast Paths to Physical Parts",
      caption: "Use SLA for detail, SLS for function, and vacuum casting for short-run cosmetic replication.",
      badges: ["Surface Finish", "Strength", "Bridge Volume", "Speed to Sample"],
      theme: "comparison",
    },
    media: {
      heroImage: "/assets/blogs/rapid-prototyping-hero.webp",
      heroAlt: "Compact capsule set representing repeatable short-run prototype parts",
      supportImage: "/assets/blogs/rapid-prototyping-support.webp",
      supportAlt: "Transparent earbud product used as a rapid prototyping appearance and packaging reference",
    },
    stats: [
      ["Best finish", "SLA"],
      ["Best functional freedom", "SLS"],
      ["Best low-volume cosmetics", "Vacuum casting"],
    ],
    processStages: [
      {
        title: "SLA",
        text: "Best when fine detail, smooth surfaces, transparent effects, and visual presentation matter more than long-term mechanical durability.",
      },
      {
        title: "SLS",
        text: "Best when the part needs to survive handling, functional fit checks, and internal complexity without support-driven redesign.",
      },
      {
        title: "Vacuum casting",
        text: "Best when the team needs multiple, presentation-quality polymer parts before full injection molding tooling is justified.",
      },
    ],
    bulletGroups: [
      {
        title: "Choose SLA for",
        icon: "✦",
        items: ["Fine cosmetic details", "Transparent-like parts", "Small complex geometries", "Investor and design reviews"],
      },
      {
        title: "Choose SLS for",
        icon: "◉",
        items: ["Functional prototypes", "Snap fits and enclosures", "Internal channels and complex forms", "No-support geometry freedom"],
      },
      {
        title: "Choose vacuum casting for",
        icon: "◎",
        items: ["Pilot cosmetic batches", "Market samples", "Multi-part kits", "Bridge volume before tooling"],
      },
    ],
    sections: [
      {
        heading: "Surface finish versus use-case reality",
        body:
          "SLA usually wins the first visual impression. The surfaces are cleaner, the edges look sharper, and presentation models photograph well. But if the team actually needs hinges, clips, repeated handling, or a stronger polymer feel, SLS often becomes the better development tool even if it is rougher on the outside.",
      },
      {
        heading: "Why vacuum casting changes the conversation",
        body:
          "Vacuum casting is often misunderstood as just another prototype method. In practice it is a bridge process. It gives teams several parts with more realistic cosmetic quality, better repeatability, and a molded-product feel without paying for full steel tooling too early.",
      },
      {
        heading: "The quantity inflection point",
        body:
          "When the need is a single learning sample, printing wins. When the need becomes a small batch for customer trials, investor kits, or internal pilots, vacuum casting starts to make sense. Once annual demand, lead-time pressure, and per-unit economics become the main drivers, the program is moving toward tooling and DFM.",
      },
      {
        heading: "A practical selection rule",
        body:
          "Choose the process that answers the next engineering or commercial question with the least waste. If the next question is appearance, use SLA. If it is function, use SLS. If it is presentation-quality quantity, use vacuum casting. If it is manufacturability, step into injection molding or sheet metal DFM instead.",
      },
    ],
    callout:
      "The most expensive prototype is the one that looks impressive but does not reduce any decision risk. Pick the process around the decision, not around the trend.",
  },
  {
    slug: "injection-molding-gates-types-functions-design-considerations",
    title: "Injection Molding Gates: Types, Functions, and Design Considerations",
    category: "Injection Molding",
    readTime: "11 min read",
    icon: "◉",
    excerpt: "A full article on gate selection, flow behavior, part aesthetics, vestige planning, and how gate strategy fits into a broader molding DFM review.",
    heroLead:
      "A gate is one of the smallest features in the tool design conversation, but it changes how the whole part fills, packs, cools, and looks. Gate strategy should never be isolated from parting line, cosmetic zones, ejection, and production volume.",
    figure: {
      title: "Gate Strategy Shapes Outcome",
      caption: "Filling, weld lines, vestige, packing pressure, and cosmetic quality all move with the gate decision.",
      badges: ["Flow Front", "Vestige", "Pack Pressure", "Cosmetic Faces"],
      theme: "molding",
    },
    media: {
      heroImage: "/assets/blogs/injection-molding-hero.webp",
      heroAlt: "Consumer device enclosure illustrating molded-part cosmetics and gate-sensitive surfaces",
      supportImage: "/assets/blogs/injection-molding-support.webp",
      supportAlt: "Accessory hardware product showing molded housings and assembly around gated parts",
    },
    stats: [
      ["Main concern", "Flow + appearance"],
      ["Early review point", "Parting line and gate together"],
      ["Best time to decide", "Before tooling release"],
    ],
    processStages: [
      {
        title: "Identify critical faces",
        text: "Map show surfaces, user-touch surfaces, and sealed faces first so gate vestige and weld lines are not placed in the wrong region.",
      },
      {
        title: "Choose the gate family",
        text: "Select the gate type around fill behavior, degating method, cosmetic needs, and whether the tool should support higher automation.",
      },
      {
        title: "Validate with DFM",
        text: "Check how the gate interacts with parting line, ribs, bosses, wall transitions, and the expected cavity and volume strategy.",
      },
    ],
    bulletGroups: [
      {
        title: "Common gate types",
        icon: "△",
        items: ["Edge gate", "Submarine / tunnel gate", "Fan gate", "Tab gate", "Hot-tip / pin gate"],
      },
      {
        title: "What gate choice affects",
        icon: "◎",
        items: ["Weld line position", "Packing effectiveness", "Visible vestige", "Cycle and automation behavior"],
      },
      {
        title: "Avoid this",
        icon: "◌",
        items: ["Leaving gate choice until after cosmetic approval", "Putting gate marks on premium faces", "Ignoring fill balance in long thin geometries", "Separating gate review from ejection and parting strategy"],
      },
    ],
    sections: [
      {
        heading: "Why the gate cannot be a late-stage tooling detail",
        body:
          "If the gate is treated as a tooling-only problem after the product geometry is frozen, the toolmaker is forced to protect fill and pack with fewer geometric options. That usually means cosmetic compromises, longer debug cycles, or secondary rework in places the design team wanted to keep clean.",
      },
      {
        heading: "How different gates behave in practice",
        body:
          "Edge gates are simple and robust, but the vestige is more visible. Tunnel gates help automate degating, but increase tooling sensitivity. Fan gates spread flow into wider areas. Hot-tip styles can reduce visible marks but push more complexity and cost into the tool. None of these choices is universally best. The right answer depends on the part objective.",
      },
      {
        heading: "What product teams should supply during review",
        body:
          "The most useful gate review starts with clear cosmetic priorities, assembly context, and expected production volume. If engineering does not know which faces matter, which weld lines are unacceptable, or which surfaces will be seen by the customer, the gate strategy cannot be optimized correctly.",
      },
      {
        heading: "Brahmworks process",
        body:
          "Our DFM view treats gate, parting line, draft, ejector marks, and mold complexity as one system. The goal is not just to fill the part. The goal is to fill it in a way that protects the product experience and supports stable production over time.",
      },
    ],
    callout:
      "A good gate decision disappears into the final product. A poor gate decision becomes visible in the surface, the debug cycle, and the commercial timeline.",
  },
  {
    slug: "key-factors-that-affect-cnc-machining-costs",
    title: "Key Factors That Affect CNC Machining Costs",
    category: "CNC Machining",
    readTime: "10 min read",
    icon: "⚙",
    excerpt: "A more complete guide to the cost drivers behind CNC quotes, from setup count and stock removal to tolerances, inspection, and finishing.",
    heroLead:
      "Customers often focus first on material rate, but CNC cost is usually decided by the time and complexity hidden behind the geometry. Setup strategy, tool reach, tolerance burden, and finishing requirements usually matter more than one material line alone.",
    figure: {
      title: "Where CNC Cost Builds Up",
      caption: "Material, setup, runtime, inspection, and finishing all stack into the final machining quote.",
      badges: ["Setup Count", "Tool Reach", "Tolerance", "Inspection"],
      theme: "machining",
    },
    media: {
      heroImage: "/assets/blogs/cnc-machining-hero.webp",
      heroAlt: "Precision automotive form used as a reference for complex CNC-machined metal surfaces",
      supportImage: "/assets/blogs/cnc-machining-support.webp",
      supportAlt: "Titanium cup highlighting machined-metal finish, material choice, and fabrication cost drivers",
    },
    stats: [
      ["Most underestimated driver", "Setup count"],
      ["Biggest hidden premium", "Tight tolerance + QA"],
      ["Fastest cost win", "Geometry simplification"],
    ],
    processStages: [
      {
        title: "Understand the base geometry",
        text: "Look at part size, stock shape, pocket depth, wall thickness, and number of machined sides before discussing rates.",
      },
      {
        title: "Count setups and tool access",
        text: "Every reorientation, difficult internal feature, and long-reach tool path increases cycle time and process risk.",
      },
      {
        title: "Add post-machining requirements",
        text: "Tolerance reports, anodizing, bead blasting, marking, and inspection all add to cost after the machine stops cutting.",
      },
    ],
    bulletGroups: [
      {
        title: "Primary cost drivers",
        icon: "◉",
        items: ["Raw material and stock wastage", "Setup hours", "Machine runtime", "Inspection and documentation"],
      },
      {
        title: "Geometry traits that add cost",
        icon: "△",
        items: ["Deep pockets", "Small inside radii", "Thin walls", "Multiple machined orientations", "Tight corner access"],
      },
      {
        title: "What often lowers cost",
        icon: "✦",
        items: ["Using standard tool sizes", "Relaxing non-critical tolerances", "Reducing setups", "Simplifying pockets and wall heights"],
      },
    ],
    sections: [
      {
        heading: "Why simple-looking parts still become expensive",
        body:
          "A part can look visually clean while still creating major machine-time penalties. Deep slotting, difficult clamping, internal corners smaller than standard tools, or surfaces that need multiple orientations all drive time. That is why machining DFM has to be geometry-aware, not just material-aware.",
      },
      {
        heading: "Tolerance is a commercial multiplier",
        body:
          "Very tight tolerances do more than slow down the machine. They also raise inspection burden, increase scrap sensitivity, and demand tighter process control. The quote often grows because quality assurance becomes part of the manufacturing problem, not because the spindle simply ran longer.",
      },
      {
        heading: "Secondary operations matter more than most buyers expect",
        body:
          "Anodizing, polishing, marking, heat treatment, and inspection reporting can become the deciding factor between a low-cost prototype part and a premium production-ready machined component. Cost conversations that ignore finishing and QA are usually incomplete.",
      },
      {
        heading: "The best way to reduce CNC cost",
        body:
          "The cheapest time to lower machining cost is during design, not after quoting. Good DFM removes unnecessary precision, makes tool access easier, reduces setups, and aligns geometry with standard manufacturing practice before the buyer starts negotiating numbers.",
      },
    ],
    callout:
      "If a part needs premium cosmetic finish, tight tolerances, and multi-side machining, the question should not be ‘why is this quote high?’ but ‘which of these demands are truly necessary?’",
  },
  {
    slug: "insert-molding-vs-overmolding-difference-and-when-to-use-each",
    title: "Insert Molding vs. Overmolding: What’s the Difference and When to Use Each?",
    category: "Production Tooling",
    readTime: "11 min read",
    icon: "◎",
    excerpt: "A full long-form comparison of insert molding and overmolding, with tooling implications, process sequence, material strategy, and when engineering needs to step in.",
    heroLead:
      "Insert molding and overmolding are often grouped together because both combine multiple elements into one molded outcome. But they solve different product problems and carry different tooling, handling, and process-control consequences.",
    figure: {
      title: "Two Different Multi-Material Strategies",
      caption: "Insert molding integrates a placed component; overmolding adds a second material over an existing substrate.",
      badges: ["Insert Handling", "Bonding", "Cycle Time", "Tool Complexity"],
      theme: "tooling",
    },
    media: {
      heroImage: "/assets/blogs/production-tooling-hero.webp",
      heroAlt: "Soft-touch earplugs showing overmold-like material layering and ergonomic surfaces",
      supportImage: "/assets/blogs/production-tooling-support.webp",
      supportAlt: "Headphones product illustrating mixed-material assemblies relevant to insert molding and overmolding",
    },
    stats: [
      ["Best for insert molding", "Threads and metal reinforcement"],
      ["Best for overmolding", "Grip, seal, or soft-touch layers"],
      ["Key risk", "Alignment + tooling complexity"],
    ],
    processStages: [
      {
        title: "Insert molding flow",
        text: "Place the insert, secure alignment, mold the polymer around it, and control how the insert behaves under injection pressure and cooling.",
      },
      {
        title: "Overmolding flow",
        text: "Create or place the substrate, locate it accurately in the next step, and control bonding, register, and flash lines between the materials.",
      },
      {
        title: "Engineering review",
        text: "Evaluate insert retention, adhesion behavior, shutoff design, side actions, cosmetic lines, and whether automation is realistic at target volume.",
      },
    ],
    bulletGroups: [
      {
        title: "Insert molding is strong for",
        icon: "◉",
        items: ["Threaded inserts", "Metal terminals", "Bushings", "Structural reinforcement", "Electrical interfaces"],
      },
      {
        title: "Overmolding is strong for",
        icon: "△",
        items: ["Soft-touch grip zones", "Sealing features", "Impact-protection layers", "Dual-material product feel", "Functional color separation"],
      },
      {
        title: "Escalate when you see",
        icon: "✦",
        items: ["Multiple inserts", "Difficult alignment features", "Complex undercuts", "Cosmetic lines on visible faces", "Material-compatibility uncertainty"],
      },
    ],
    sections: [
      {
        heading: "Insert molding is about integration",
        body:
          "Insert molding is usually chosen when a non-plastic component must become part of the molded part in a repeatable, production-scale way. The question is not only whether the insert can be placed. It is whether it can be located accurately, held securely during molding, and released from the tool without distortion or flash problems.",
      },
      {
        heading: "Overmolding is about functional layering",
        body:
          "Overmolding is typically chosen when a second material improves the product experience, such as grip, comfort, sealing, protection, or tactile identity. That means the engineering challenge shifts toward substrate registration, adhesion or mechanical lock strategy, and how the cosmetic line between the materials will appear in the final product.",
      },
      {
        heading: "Why tooling complexity rises quickly",
        body:
          "Both methods can look simple in a concept render while hiding significant tool complexity. Insert loading, multiple cavity conditions, side actions, substrate handling, and cosmetic line control can all compound at once. This is why the right time for DFM is before the tooling path is fixed, not after the commercial quote is already approved.",
      },
      {
        heading: "A practical decision framework",
        body:
          "Use insert molding when the product needs a placed rigid component integrated into the polymer part. Use overmolding when the product needs a second material layered onto a substrate for feel, sealing, or performance. If the part needs both, the engineering review should expand immediately because the program is no longer standard tooling.",
      },
    ],
    callout:
      "Brahmworks recommendation: if the design contains multiple inserts, visible overmold lines, side actions, or difficult alignment features, move directly into deeper tooling review before promising production timing.",
  },
];

const supplierSelect = document.querySelector("#supplierSelect");
const inventoryCustomerSelect = document.querySelector("#inventoryCustomerSelect");
const inventoryProjectSelect = document.querySelector("#inventoryProjectSelect");
const supplierCustomerSelect = document.querySelector("#supplierCustomerSelect");
const supplierProjectSelect = document.querySelector("#supplierProjectSelect");
const itemSelect = document.querySelector("#itemSelect");
const poInventorySelect = document.querySelector("#poInventorySelect");
const poSupplierSelect = document.querySelector("#poSupplierSelect");
const poCustomerSelect = document.querySelector("#poCustomerSelect");
const poProjectSelect = document.querySelector("#poProjectSelect");
const projectCustomerSelect = document.querySelector("#projectCustomerSelect");
const projectNameInput = document.querySelector("#projectNameInput");
const projectServiceSelect = document.querySelector("#projectServiceSelect");
const addProjectServiceButton = document.querySelector("#addProjectServiceButton");
const openProjectCreateButton = document.querySelector("#openProjectCreateButton");
const projectSelectedServices = document.querySelector("#projectSelectedServices");
const projectServiceIds = document.querySelector("#projectServiceIds");
const projectDocumentFile = document.querySelector("#projectDocumentFile");
const publicQuoteFile = document.querySelector("#publicQuoteFile");
const publicQuoteProcess = document.querySelector("#publicQuoteProcessValue");
const publicQuoteProcessDisplay = document.querySelector("#publicQuoteProcessDisplay");
const publicQuoteDesignUnits = document.querySelector("#publicQuoteDesignUnits");
const publicQuoteUnits = document.querySelector("#publicQuoteUnits");
const publicQuoteOptionFields = document.querySelector("#publicQuoteOptionFields");
const quoteProcessGrid = document.querySelector("#quoteProcessGrid");
const quoteProcessCards = [...document.querySelectorAll(".quote-process-card")];
const projectDocumentStatus = document.querySelector("#projectDocumentStatus");
const projectDocumentSubmitButton = document.querySelector("#projectDocumentSubmitButton");
const publicQuoteStatus = document.querySelector("#publicQuoteStatus");
const publicQuoteSubmitButton = document.querySelector("#publicQuoteSubmitButton");
const publicQuoteResult = document.querySelector("#publicQuoteResult");
const challanPoSelect = document.querySelector("#challanPoSelect");
const challanCustomerSelect = document.querySelector("#challanCustomerSelect");
const challanProjectSelect = document.querySelector("#challanProjectSelect");
const packagingChallanSelect = document.querySelector("#packagingChallanSelect");
const packagingCustomerSelect = document.querySelector("#packagingCustomerSelect");
const packagingProjectSelect = document.querySelector("#packagingProjectSelect");
const quoteRequestSelect = document.querySelector("#quoteRequestSelect");
const quoteStatusSelect = document.querySelector("#quoteStatusSelect");
const quoteAdminNotes = document.querySelector("#quoteAdminNotes");

const inventoryTableBody = document.querySelector("#inventoryTableBody");
const lowStockList = document.querySelector("#lowStockList");
const movementLog = document.querySelector("#movementLog");
const supplierTableBody = document.querySelector("#supplierTableBody");
const supplierCountText = document.querySelector("#supplierCountText");
const showMoreSuppliersButton = document.querySelector("#showMoreSuppliersButton");
const supplierIndustryFilters = document.querySelector("#supplierIndustryFilters");
const supplierApprovalFilters = document.querySelector("#supplierApprovalFilters");
const supplierGroupingButton = document.querySelector("#supplierGroupingButton");
const supplierAssistantForm = document.querySelector("#supplierAssistantForm");
const supplierRequirementInput = document.querySelector("#supplierRequirementInput");
const supplierScopeSelect = document.querySelector("#supplierScopeSelect");
const resetSupplierSearchButton = document.querySelector("#resetSupplierSearchButton");
const supplierAssistantSummary = document.querySelector("#supplierAssistantSummary");
const onlineVendorList = document.querySelector("#onlineVendorList");
const supplierEditorModal = document.querySelector("#supplierEditorModal");
const supplierEditorForm = document.querySelector("#supplierEditorForm");
const supplierEditorCustomerSelect = document.querySelector("#supplierEditorCustomerSelect");
const supplierEditorProjectSelect = document.querySelector("#supplierEditorProjectSelect");
const closeSupplierEditorButton = document.querySelector("#closeSupplierEditorButton");
const cancelSupplierEditorButton = document.querySelector("#cancelSupplierEditorButton");
const bankDetailsModal = document.querySelector("#bankDetailsModal");
const bankDetailsForm = document.querySelector("#bankDetailsForm");
const bankDetailsStatus = document.querySelector("#bankDetailsStatus");
const closeBankDetailsButton = document.querySelector("#closeBankDetailsButton");
const cancelBankDetailsButton = document.querySelector("#cancelBankDetailsButton");
const inventoryEditorModal = document.querySelector("#inventoryEditorModal");
const inventoryEditorForm = document.querySelector("#inventoryEditorForm");
const inventoryEditorCustomerSelect = document.querySelector("#inventoryEditorCustomerSelect");
const inventoryEditorProjectSelect = document.querySelector("#inventoryEditorProjectSelect");
const inventoryEditorSupplierSelect = document.querySelector("#inventoryEditorSupplierSelect");
const closeInventoryEditorButton = document.querySelector("#closeInventoryEditorButton");
const cancelInventoryEditorButton = document.querySelector("#cancelInventoryEditorButton");
const purchaseOrderEditorModal = document.querySelector("#purchaseOrderEditorModal");
const purchaseOrderEditorForm = document.querySelector("#purchaseOrderEditorForm");
const purchaseOrderEditorCustomerSelect = document.querySelector("#purchaseOrderEditorCustomerSelect");
const purchaseOrderEditorProjectSelect = document.querySelector("#purchaseOrderEditorProjectSelect");
const purchaseOrderEditorSupplierSelect = document.querySelector("#purchaseOrderEditorSupplierSelect");
const closePurchaseOrderEditorButton = document.querySelector("#closePurchaseOrderEditorButton");
const cancelPurchaseOrderEditorButton = document.querySelector("#cancelPurchaseOrderEditorButton");
const purchaseOrderList = document.querySelector("#purchaseOrderList");
const topValueList = document.querySelector("#topValueList");
const reportSummary = document.querySelector("#reportSummary");
const profileSummary = document.querySelector("#profileSummary");
const userList = document.querySelector("#userList");
const customerTableBody = document.querySelector("#customerTableBody");
const customerCountText = document.querySelector("#customerCountText");
const projectTableBody = document.querySelector("#projectTableBody");
const projectSelectionText = document.querySelector("#projectSelectionText");
const projectWorkspace = document.querySelector("#projectWorkspace");
const projectWorkspaceTitle = document.querySelector("#projectWorkspaceTitle");
const projectWorkspaceMeta = document.querySelector("#projectWorkspaceMeta");
const projectDocumentTableBody = document.querySelector("#projectDocumentTableBody");
const projectDocumentViewer = document.querySelector("#projectDocumentViewer");
const projectDocumentViewerTitle = document.querySelector("#projectDocumentViewerTitle");
const projectDocumentPreviewCard = document.querySelector("#projectDocumentPreviewCard");
const projectDocumentFullscreenButton = document.querySelector("#projectDocumentFullscreenButton");
const serviceList = document.querySelector("#serviceList");
const challanList = document.querySelector("#challanList");
const packagingList = document.querySelector("#packagingList");
const quoteRequestList = document.querySelector("#quoteRequestList");
const workspaceSearchInput = document.querySelector("#workspaceSearchInput");
const inventorySearchInput = document.querySelector("#inventorySearchInput");
const inventoryMessage = document.querySelector("#inventoryMessage");
const exportReportButton = document.querySelector("#exportReportButton");
const workspaceChipAvatar = document.querySelector(".workspace-chip-avatar");
const tabTooltip = document.createElement("div");
tabTooltip.className = "tab-tooltip hidden";
document.body.appendChild(tabTooltip);

let workspaceSearchDebounce = null;
let projectDocumentViewerCleanup = null;
let projectDocumentViewerRenderToken = 0;
let stepViewerLibrariesPromise = null;
let occtInstancePromise = null;
let spreadsheetViewerLibrariesPromise = null;

function disposeProjectDocumentViewer() {
  if (typeof projectDocumentViewerCleanup === "function") {
    projectDocumentViewerCleanup();
  }
  projectDocumentViewerCleanup = null;
}

function updateProjectDocumentFullscreenButton() {
  if (!projectDocumentFullscreenButton) return;
  const isFullscreen = document.fullscreenElement === projectDocumentPreviewCard;
  projectDocumentFullscreenButton.textContent = isFullscreen ? "Exit Fullscreen" : "Fullscreen";
  projectDocumentFullscreenButton.setAttribute("aria-pressed", String(isFullscreen));
}

async function toggleProjectDocumentFullscreen() {
  if (!projectDocumentPreviewCard?.requestFullscreen) {
    throw new Error("Fullscreen preview is not supported in this browser.");
  }
  if (document.fullscreenElement === projectDocumentPreviewCard) {
    await document.exitFullscreen?.();
    return;
  }
  if (document.fullscreenElement) {
    await document.exitFullscreen?.();
  }
  await projectDocumentPreviewCard.requestFullscreen();
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-external-src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = window.document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.externalSrc = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    window.document.head.appendChild(script);
  });
}

async function loadStepViewerLibraries() {
  if (!stepViewerLibrariesPromise) {
    stepViewerLibrariesPromise = (async () => {
      await loadScriptOnce("https://unpkg.com/three@0.128.0/build/three.min.js");
      await loadScriptOnce("https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js");
      await loadScriptOnce("https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js");
      if (!window.THREE || !window.THREE.OrbitControls || !window.occtimportjs) {
        throw new Error("STEP viewer libraries are not available.");
      }
    })();
  }
  await stepViewerLibrariesPromise;
}

async function getOcctInstance() {
  await loadStepViewerLibraries();
  if (!occtInstancePromise) {
    occtInstancePromise = window.occtimportjs();
  }
  return occtInstancePromise;
}

async function loadSpreadsheetViewerLibraries() {
  if (!spreadsheetViewerLibrariesPromise) {
    spreadsheetViewerLibrariesPromise = (async () => {
      await loadScriptOnce("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js");
      if (!window.XLSX) {
        throw new Error("Spreadsheet preview library is not available.");
      }
    })();
  }
  await spreadsheetViewerLibrariesPromise;
}

function isSpreadsheetDocument(document) {
  const lower = (document.originalName || "").toLowerCase();
  return (
    [
      ".xlsx",
      ".xls",
      ".xlsm",
      ".xlsb",
      ".ods",
      ".csv",
      ".tsv",
    ].some((ext) => lower.endsWith(ext)) ||
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.ms-excel.sheet.macroenabled.12",
      "application/vnd.ms-excel.sheet.binary.macroenabled.12",
      "application/vnd.oasis.opendocument.spreadsheet",
      "text/csv",
      "text/tab-separated-values",
    ].includes(String(document.mimeType || "").toLowerCase())
  );
}

async function renderSpreadsheetDocumentViewer(document, renderToken) {
  projectDocumentViewer.innerHTML = `
    <div class="engineering-viewer">
      <div class="viewer-meta">Spreadsheet preview • ${escapeHtml(document.originalName)}</div>
      <div class="engineering-viewer-card">
        <div class="engineering-viewer-status">Loading spreadsheet preview...</div>
        <div class="spreadsheet-viewer-stage"></div>
      </div>
    </div>
  `;

  const stage = projectDocumentViewer.querySelector(".spreadsheet-viewer-stage");
  const status = projectDocumentViewer.querySelector(".engineering-viewer-status");

  try {
    await loadSpreadsheetViewerLibraries();
    if (renderToken !== projectDocumentViewerRenderToken) return;

    const response = await fetch(document.fileUrl, { headers: state.token || localStorage.getItem("bw_token") ? { Authorization: `Bearer ${state.token || localStorage.getItem("bw_token")}` } : {} });
    if (!response.ok) {
      throw new Error("Could not load spreadsheet file.");
    }
    if (renderToken !== projectDocumentViewerRenderToken) return;

    const arrayBuffer = await response.arrayBuffer();
    const workbook = window.XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("This spreadsheet does not contain any sheets.");
    }

    const html = window.XLSX.utils.sheet_to_html(workbook.Sheets[firstSheetName], {
      editable: false,
      id: "spreadsheetPreviewTable",
    });

    if (renderToken !== projectDocumentViewerRenderToken) return;

    status.innerHTML = `
      <span>${escapeHtml(firstSheetName)} • ${workbook.SheetNames.length} sheet${workbook.SheetNames.length === 1 ? "" : "s"}</span>
      <span class="engineering-viewer-actions">
        <a class="table-button" href="${document.fileUrl}" target="_blank" rel="noreferrer">Open File</a>
        <a class="table-button secondary" href="${document.fileUrl}" download="${escapeHtml(document.originalName)}">Download</a>
      </span>
    `;
    stage.innerHTML = `<div class="spreadsheet-preview-table">${html}</div>`;
  } catch (error) {
    projectDocumentViewer.innerHTML = `
      <div class="engineering-viewer">
        <div class="viewer-meta">Spreadsheet preview • ${escapeHtml(document.originalName)}</div>
        <div class="engineering-viewer-card">
          <h3>Spreadsheet preview could not be loaded</h3>
          <p>${escapeHtml(error.message || "The browser could not initialize spreadsheet preview.")}</p>
          <div class="engineering-viewer-actions">
            <a class="table-button" href="${document.fileUrl}" target="_blank" rel="noreferrer">Open File</a>
            <a class="table-button secondary" href="${document.fileUrl}" download="${escapeHtml(document.originalName)}">Download</a>
          </div>
        </div>
      </div>
    `;
  }
}

async function renderStepDocumentViewer(document, renderToken) {
  projectDocumentViewer.innerHTML = `
    <div class="engineering-viewer">
      <div class="viewer-meta">STEP 3D model • ${escapeHtml(document.originalName)}</div>
      <div class="engineering-viewer-card">
        <div class="engineering-viewer-status">Loading 3D preview...</div>
        <div class="step-viewer-stage"></div>
      </div>
    </div>
  `;

  const stage = projectDocumentViewer.querySelector(".step-viewer-stage");
  const status = projectDocumentViewer.querySelector(".engineering-viewer-status");

  try {
    await loadStepViewerLibraries();
    if (renderToken !== projectDocumentViewerRenderToken) return;

    const [response, occt] = await Promise.all([
      fetch(document.fileUrl, { headers: state.token || localStorage.getItem("bw_token") ? { Authorization: `Bearer ${state.token || localStorage.getItem("bw_token")}` } : {} }),
      getOcctInstance(),
    ]);
    if (!response.ok) {
      throw new Error("Could not load STEP file.");
    }
    if (renderToken !== projectDocumentViewerRenderToken) return;

    const fileBuffer = new Uint8Array(await response.arrayBuffer());
    const result = occt.ReadStepFile(fileBuffer, {
      linearUnit: "millimeter",
      linearDeflectionType: "bounding_box_ratio",
      linearDeflection: 0.001,
      angularDeflection: 0.5,
    });

    if (!result?.success || !Array.isArray(result.meshes) || !result.meshes.length) {
      throw new Error("This STEP file could not be triangulated for browser preview.");
    }
    if (renderToken !== projectDocumentViewerRenderToken) return;

    const THREE = window.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f5ef);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
    keyLight.position.set(6, 8, 10);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-8, -4, -6);
    scene.add(fillLight);

    const root = new THREE.Group();
    result.meshes.forEach((meshData) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(meshData.attributes.position.array, 3));
      if (meshData.attributes.normal?.array?.length) {
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(meshData.attributes.normal.array, 3));
      } else {
        geometry.computeVertexNormals();
      }
      if (meshData.index?.array?.length) {
        geometry.setIndex(meshData.index.array);
      }
      const rawColor = Array.isArray(meshData.color) ? meshData.color : [196, 132, 86];
      const normalizedColor = rawColor.map((channel) => (channel > 1 ? channel / 255 : channel));
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(normalizedColor[0], normalizedColor[1], normalizedColor[2]),
        metalness: 0.08,
        roughness: 0.68,
        side: THREE.DoubleSide,
      });
      root.add(new THREE.Mesh(geometry, material));
    });
    scene.add(root);

    const bounds = new THREE.Box3().setFromObject(root);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    root.position.sub(center);

    camera.near = Math.max(maxDimension / 1000, 0.1);
    camera.far = maxDimension * 200;
    camera.position.set(maxDimension * 1.6, maxDimension * 1.25, maxDimension * 1.6);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();

    const grid = new THREE.GridHelper(maxDimension * 1.8, 12, 0xd7c5b3, 0xe8ddd0);
    grid.position.y = -size.y / 2;
    scene.add(grid);

    const resize = () => {
      const width = Math.max(stage.clientWidth, 320);
      const height = Math.max(stage.clientHeight, 420);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

    let animationFrame = 0;
    const renderScene = () => {
      animationFrame = window.requestAnimationFrame(renderScene);
      controls.update();
      renderer.render(scene, camera);
    };
    renderScene();

    status.innerHTML = `
      <span>3D preview ready</span>
      <span class="engineering-viewer-actions">
        <a class="table-button" href="${document.fileUrl}" target="_blank" rel="noreferrer">Open STEP File</a>
        <a class="table-button secondary" href="${document.fileUrl}" download="${escapeHtml(document.originalName)}">Download</a>
      </span>
    `;

    projectDocumentViewerCleanup = () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      root.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach((material) => material.dispose());
          } else {
            node.material.dispose();
          }
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === stage) {
        stage.removeChild(renderer.domElement);
      }
    };
  } catch (error) {
    projectDocumentViewer.innerHTML = `
      <div class="engineering-viewer">
        <div class="viewer-meta">STEP 3D model • ${escapeHtml(document.originalName)}</div>
        <div class="engineering-viewer-card">
          <h3>3D preview could not be loaded</h3>
          <p>${escapeHtml(error.message || "The browser could not initialize the STEP viewer.")}</p>
          <p class="viewer-hint">Complex or large STEP files sometimes cannot be triangulated in the browser. Download and open in FreeCAD, Fusion 360, or SOLIDWORKS for full fidelity.</p>
          <div class="engineering-viewer-actions">
            <a class="table-button" href="${document.fileUrl}" target="_blank" rel="noreferrer">Open STEP File</a>
            <a class="table-button secondary" href="${document.fileUrl}" download="${escapeHtml(document.originalName)}">Download</a>
          </div>
        </div>
      </div>
    `;
  }
}

// ── PDF viewer (PDF.js) ────────────────────────────────────────────────────
let pdfViewerLibraryPromise = null;
async function loadPdfViewerLibrary() {
  if (!pdfViewerLibraryPromise) {
    pdfViewerLibraryPromise = (async () => {
      await loadScriptOnce("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      if (!window.pdfjsLib) throw new Error("PDF.js failed to load.");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    })();
  }
  return pdfViewerLibraryPromise;
}

async function renderPdfDocumentViewer(doc, renderToken) {
  projectDocumentViewer.innerHTML = `
    <div class="engineering-viewer pdf-viewer-shell">
      <div class="viewer-meta">
        <span>PDF • ${escapeHtml(doc.originalName)}</span>
        <span class="engineering-viewer-actions">
          <a class="table-button" href="${doc.fileUrl}" target="_blank" rel="noreferrer">Open PDF</a>
          <a class="table-button secondary" href="${doc.fileUrl}" download="${escapeHtml(doc.originalName)}">Download</a>
        </span>
      </div>
      <div class="pdf-page-controls hidden">
        <button class="table-button secondary" id="pdfPrevPage">‹ Prev</button>
        <span class="pdf-page-indicator"></span>
        <button class="table-button secondary" id="pdfNextPage">Next ›</button>
      </div>
      <div class="pdf-canvas-stage">
        <div class="engineering-viewer-status">Loading PDF…</div>
      </div>
    </div>
  `;
  const stage = projectDocumentViewer.querySelector(".pdf-canvas-stage");
  const controls = projectDocumentViewer.querySelector(".pdf-page-controls");
  const indicator = projectDocumentViewer.querySelector(".pdf-page-indicator");

  try {
    await loadPdfViewerLibrary();
    if (renderToken !== projectDocumentViewerRenderToken) return;

    const token = state.token || localStorage.getItem("bw_token") || "";
    const response = await fetch(doc.fileUrl, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
    if (!response.ok) throw new Error("Could not fetch PDF.");
    if (renderToken !== projectDocumentViewerRenderToken) return;

    const arrayBuffer = await response.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    if (renderToken !== projectDocumentViewerRenderToken) return;

    let currentPage = 1;
    const totalPages = pdf.numPages;

    const canvas = document.createElement("canvas");
    canvas.className = "pdf-canvas";
    stage.innerHTML = "";
    stage.appendChild(canvas);

    if (totalPages > 1) {
      controls.classList.remove("hidden");
      document.getElementById("pdfPrevPage")?.addEventListener("click", () => {
        if (currentPage > 1) { currentPage--; renderPage(); }
      });
      document.getElementById("pdfNextPage")?.addEventListener("click", () => {
        if (currentPage < totalPages) { currentPage++; renderPage(); }
      });
    }

    async function renderPage() {
      const page = await pdf.getPage(currentPage);
      const viewport = page.getViewport({ scale: Math.min(stage.clientWidth / page.getViewport({ scale: 1 }).width, 2) || 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.maxWidth = "100%";
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      if (indicator) indicator.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    await renderPage();
  } catch (error) {
    stage.innerHTML = `
      <div class="engineering-viewer-card">
        <h3>PDF preview failed</h3>
        <p>${escapeHtml(error.message)}</p>
        <div class="engineering-viewer-actions">
          <a class="table-button" href="${doc.fileUrl}" target="_blank" rel="noreferrer">Open PDF</a>
        </div>
      </div>`;
  }
}

// ── PCB / Gerber viewer ────────────────────────────────────────────────────
function isPcbDocument(doc) {
  const name = (doc.originalName || "").toLowerCase();
  return [".gbr",".ger",".gtl",".gbl",".gto",".gbo",".gts",".gbs",".gm1",".drl",".exc",".kicad_pcb",".kicad_sch",".brd"].some(ext => name.endsWith(ext));
}

async function renderPcbDocumentViewer(doc, renderToken) {
  const name = (doc.originalName || "").toLowerCase();
  const isKicad = name.endsWith(".kicad_pcb") || name.endsWith(".kicad_sch") || name.endsWith(".brd");
  const fileType = isKicad ? "KiCad PCB/Schematic" : "Gerber manufacturing file";
  const hint = isKicad
    ? "KiCad files can be opened in KiCad EDA (free), or uploaded to JLCPCB / PCBWay for direct fabrication."
    : "Gerber files can be previewed in KiCad GerbView, Altium, or uploaded to a PCB fab (JLCPCB, PCBWay). A .zip package of all layers is usually required.";

  projectDocumentViewer.innerHTML = `
    <div class="engineering-viewer">
      <div class="viewer-meta">${fileType} • ${escapeHtml(doc.originalName)}</div>
      <div class="engineering-viewer-card pcb-viewer-card">
        <div class="pcb-icon">🖨️</div>
        <h3>${fileType}</h3>
        <p class="viewer-hint">${hint}</p>
        <div class="pcb-open-options">
          <a class="table-button" href="https://www.jlcpcb.com/quote" target="_blank" rel="noreferrer">Order at JLCPCB</a>
          <a class="table-button secondary" href="https://www.pcbway.com" target="_blank" rel="noreferrer">Order at PCBWay</a>
          <a class="table-button secondary" href="${doc.fileUrl}" download="${escapeHtml(doc.originalName)}">Download File</a>
        </div>
      </div>
    </div>
  `;
}

function can(action) {
  return state.permissions.actions.includes(action);
}

function canScreen(screen) {
  return state.permissions.screens.includes(screen);
}

function isCustomerUser() {
  return state.user?.role === "Customer";
}

function syncLandingProcess(process) {
  state.quoteEntryProcess = process || state.quoteEntryProcess || "CNC Machining";
  if (customerSignupProcess) customerSignupProcess.value = state.quoteEntryProcess;
  if (customerSignupProcessDisplay) {
    if ("value" in customerSignupProcessDisplay) {
      customerSignupProcessDisplay.value = state.quoteEntryProcess;
    } else {
      customerSignupProcessDisplay.textContent = state.quoteEntryProcess;
    }
  }
  landingProcessGrid?.querySelectorAll("[data-landing-process]").forEach((button) => {
    button.classList.toggle("active", button.dataset.landingProcess === state.quoteEntryProcess);
  });
}

function setAuthMode(mode = "signup") {
  const isLogin = mode === "login";
  signupStage?.classList.toggle("hidden", isLogin);
  loginStage?.classList.toggle("hidden", !isLogin);
  authModeTabs.forEach((tab) => {
    const active = tab.dataset.authView === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextPreviewDocument(document) {
  const lower = (document.originalName || "").toLowerCase();
  return (
    String(document.mimeType || "").startsWith("text/") ||
    [".step", ".stp", ".gbr", ".ger", ".gtl", ".gbl", ".gto", ".gbo", ".gts", ".gbs", ".drl", ".bom", ".json", ".jsonl", ".md", ".txt"].some((ext) => lower.endsWith(ext))
  );
}

async function api(path, options = {}) {
  const token = state.token || localStorage.getItem("bw_token") || "";
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const raw = await response.text();
  let data = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch (error) {
      data = { error: raw };
    }
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function setProjectDocumentUploadState(message, busy = false, isError = false) {
  if (projectDocumentStatus) {
    projectDocumentStatus.textContent = message;
    projectDocumentStatus.style.color = isError ? "var(--danger)" : "";
  }
  if (projectDocumentSubmitButton) {
    projectDocumentSubmitButton.disabled = busy;
    projectDocumentSubmitButton.textContent = busy ? "Uploading..." : "Upload Document";
  }
}

function setPublicQuoteState(message, busy = false, isError = false) {
  if (publicQuoteStatus) {
    publicQuoteStatus.textContent = message;
    publicQuoteStatus.style.color = isError ? "var(--danger)" : "";
    publicQuoteStatus.dataset.busy = busy ? "true" : "";
    publicQuoteStatus.dataset.error = isError ? "true" : "";
  }
  if (publicQuoteSubmitButton) {
    publicQuoteSubmitButton.disabled = busy;
    publicQuoteSubmitButton.textContent = busy ? "Uploading..." : "Get Instant Quote Range";
  }
}

function renderPublicQuoteResult(quoteRequest) {
  if (!publicQuoteResult || !quoteRequest) return;
  const estimate = `${quoteRequest.estimateCurrency || "INR"} ${Number(quoteRequest.estimateLow || 0).toLocaleString("en-IN")} - ${Number(
    quoteRequest.estimateHigh || 0,
  ).toLocaleString("en-IN")}`;
  const nextStepLabel = isCustomerUser() ? "View My Requests" : "Review Uploaded File";
  const nextStepCopy = isCustomerUser()
    ? "This instant budgetary range is now saved to your Brahmworks account. Open Requests to track the submission and any follow-up."
    : "This is an instant budgetary range. Your team can now review the upload internally and send the final commercial quote.";
  publicQuoteResult.className = "quote-result";
  publicQuoteResult.innerHTML = `
    <div class="list-title-row">
      <h3>${escapeHtml(quoteRequest.referenceCode)}</h3>
      <span class="status-badge good">Submitted</span>
    </div>
    <p>${escapeHtml(quoteRequest.process)} • ${escapeHtml(quoteRequest.material || "Configured material")} • Qty ${escapeHtml(quoteRequest.quantity)}</p>
    <div class="list-meta">
      <span class="pill">Budget ${escapeHtml(estimate)}</span>
      <span class="pill">Lead time ${escapeHtml(quoteRequest.estimatedLeadDays)} days</span>
    </div>
    <p class="notes-line">${escapeHtml(nextStepCopy)}</p>
    <div class="action-strip">
      <button type="button" class="table-button" data-action="review-quote-result" data-id="${escapeHtml(quoteRequest.id)}">${escapeHtml(nextStepLabel)}</button>
    </div>
  `;
}

function renderPublicQuoteConfigurator() {
  if (!state.quoteConfig || !publicQuoteProcess) return;
  const processList = Object.keys(state.quoteConfig.processes || {});
  if (!processList.includes(publicQuoteProcess.value)) {
    publicQuoteProcess.value = processList[0] || "CNC Machining";
  }
  if (publicQuoteProcessDisplay) {
    publicQuoteProcessDisplay.value = publicQuoteProcess.value || "CNC Machining";
  }
  if (publicQuoteFile) {
    publicQuoteFile.accept = publicQuoteProcess.value === "3D Printing" ? ".stl,.step,.stp,.iges,.igs" : ".step,.stp,.iges,.igs,.pdf,.png,.jpg,.jpeg,.zip";
  }
  if (publicQuoteStatus && !publicQuoteStatus.dataset.busy && !publicQuoteStatus.dataset.error) {
    publicQuoteStatus.textContent =
      publicQuoteProcess.value === "3D Printing"
        ? "Upload an STL or STEP file for instant additive costing, plus drawings if needed. Max 45 MB."
        : "Upload a STEP file, drawing, or compressed RFQ package up to 45 MB.";
  }
  quoteProcessCards.forEach((card) => {
    card.classList.toggle("active", card.dataset.process === publicQuoteProcess.value);
  });
  fillSimpleSelect(publicQuoteDesignUnits, state.quoteConfig.designUnits || [], publicQuoteDesignUnits.value || "mm");
  fillSimpleSelect(publicQuoteUnits, state.quoteConfig.quoteUnits || [], publicQuoteUnits.value || "pcs");
  renderPublicQuoteOptionFields();
}

function prefillCustomerQuoteForm() {
  if (!publicQuoteForm || !state.user) return;
  if (state.quoteEntryProcess && publicQuoteProcess) {
    publicQuoteProcess.value = state.quoteEntryProcess;
    if (publicQuoteProcessDisplay) publicQuoteProcessDisplay.value = state.quoteEntryProcess;
    renderPublicQuoteConfigurator();
  }
  if (!isCustomerUser()) return;
  const customer = (state.customers || []).find((entry) => entry.id === state.user.customerId) || null;
  const nameField = publicQuoteForm.elements.namedItem("name");
  const companyField = publicQuoteForm.elements.namedItem("company");
  const emailField = publicQuoteForm.elements.namedItem("email");
  const phoneField = publicQuoteForm.elements.namedItem("phone");
  if (nameField) nameField.value = customer?.contactPerson || state.user.name || "";
  if (companyField) companyField.value = customer?.name || "";
  if (emailField) emailField.value = customer?.email || state.user.email || "";
  if (phoneField) phoneField.value = customer?.phone || "";
}

async function bootstrap() {
  // Restore token from localStorage before any API call
  if (!state.token) {
    const stored = localStorage.getItem("bw_token");
    if (stored) state.token = stored;
  }
  const session = await api("/api/auth/session");
  if (!session.user) {
    state.token = null;
    localStorage.removeItem("bw_token");
    showLogin();
    syncLandingProcess(state.quoteEntryProcess);
    return;
  }

  const data = await api("/api/bootstrap");
  Object.assign(state, data);
  if (isCustomerUser()) {
    state.activeTab = "quotes";
  }
  ensureActiveTab();
  showApp();
  renderApp();
  prefillCustomerQuoteForm();
  if (canScreen("suppliers")) {
    await loadSuppliers(true);
    renderSuppliers();
  }
}

function ensureActiveTab() {
  if (!canScreen(state.activeTab)) {
    state.activeTab = state.permissions.screens[0] || "overview";
  }
}

function showLogin() {
  loginView.classList.remove("hidden");
  loginView.hidden = false;
  appView.classList.add("hidden");
  appView.hidden = true;
  syncLandingProcess(state.quoteEntryProcess);
}

function showApp() {
  loginView.classList.add("hidden");
  loginView.hidden = true;
  appView.classList.remove("hidden");
  appView.hidden = false;
}

function flashMessage(message, isError = false) {
  inventoryMessage.textContent = message;
  inventoryMessage.className = isError ? "error-text" : "success-text";
  window.setTimeout(() => {
    inventoryMessage.textContent = "";
    inventoryMessage.className = "success-text";
  }, 3500);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setActiveTab(tabName) {
  if (!panels[tabName]) return;
  state.activeTab = tabName;
  renderMetrics();
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  Object.entries(panels).forEach(([name, panel]) => {
    const isActive = name === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
    panel.style.display = isActive ? "" : "none";
  });
}

function renderPermissions() {
  if (!permissionSummary) return;
  permissionSummary.innerHTML = "";
  [state.user.role, ...state.permissions.screens].forEach((label, index) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "pill interactive-pill";
    pill.textContent = label;
    if (index === 0) {
      pill.dataset.action = "go-profile";
    } else {
      pill.dataset.action = "go-tab";
      pill.dataset.tab = label;
    }
    permissionSummary.appendChild(pill);
  });
}

function renderTabs() {
  tabs.forEach((tab) => {
    const label = tab.textContent.trim();
    const allowed = canScreen(tab.dataset.tab);
    tab.dataset.tooltip = label;
    tab.setAttribute("aria-label", label);
    tab.setAttribute("title", label);
    tab.classList.toggle("hidden", !allowed);
  });
}

function hideTabTooltip() {
  tabTooltip.classList.add("hidden");
  tabTooltip.textContent = "";
}

function showTabTooltip(tab) {
  const label = tab.dataset.tooltip || tab.getAttribute("aria-label") || "";
  if (!label) return;
  tabTooltip.textContent = label;
  tabTooltip.classList.remove("hidden");
  const rect = tab.getBoundingClientRect();
  const tooltipRect = tabTooltip.getBoundingClientRect();
  const left = Math.min(rect.right + 12, window.innerWidth - tooltipRect.width - 12);
  const top = Math.max(12, rect.top + rect.height / 2 - tooltipRect.height / 2);
  tabTooltip.style.left = `${left}px`;
  tabTooltip.style.top = `${top}px`;
}

function renderActionVisibility() {
  inventoryFormPanel.classList.toggle("hidden", !can("inventory.create"));
  movementPanel.classList.toggle("hidden", !can("inventory.adjust"));
  supplierFormPanel.classList.toggle("hidden", !can("suppliers.create"));
  purchaseOrderFormPanel.classList.toggle("hidden", !can("purchaseOrders.create"));
  exportReportButton.classList.toggle("hidden", !can("documents.export"));
  userFormPanel.classList.toggle("hidden", !can("users.manage"));
  challanFormPanel.classList.toggle("hidden", !can("logistics.manage"));
  packagingFormPanel.classList.toggle("hidden", !can("logistics.manage"));
  quoteReviewForm?.closest(".card")?.classList.toggle("hidden", !can("quotes.manage"));
}

function getBlogPostsForQuery() {
  const query = state.workspaceSearchTarget === "blogs" ? state.workspaceSearchQuery.trim().toLowerCase() : "";
  if (!query) return BLOG_POSTS;
  return BLOG_POSTS.filter((post) => {
    const text = [post.title, post.category, post.excerpt, ...post.sections.map((section) => `${section.heading} ${section.body}`)].join(" ").toLowerCase();
    return text.includes(query);
  });
}

function renderBlogs() {
  const blogCount = document.getElementById("blogCount");
  if (!blogList || !blogViewer) return;
  const posts = getBlogPostsForQuery();
  if (blogCount) {
    blogCount.textContent = `${posts.length} ${posts.length === 1 ? "guide" : "guides"}`;
  }
  if (!posts.length) {
    blogList.innerHTML = '<div class="empty-state">No blog posts match this workspace search.</div>';
    blogViewer.innerHTML = '<div class="empty-state">Try a different keyword to find a Brahmworks article.</div>';
    blogViewer.className = "blog-viewer empty-state";
    return;
  }

  if (!posts.some((post) => post.slug === state.selectedBlogSlug)) {
    state.selectedBlogSlug = posts[0].slug;
  }

  blogList.innerHTML = "";
  posts.forEach((post) => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = `blog-list-item ${state.selectedBlogSlug === post.slug ? "active" : ""}`;
    node.dataset.action = "select-blog";
    node.dataset.slug = post.slug;
    node.innerHTML = `
      <span class="blog-list-icon" aria-hidden="true">${post.icon}</span>
      <span class="blog-list-copy">
        <strong>${escapeHtml(post.title)}</strong>
        <span class="blog-list-meta">${escapeHtml(post.category)} • ${escapeHtml(post.readTime)}</span>
      </span>
    `;
    blogList.appendChild(node);
  });

  const activePost = posts.find((post) => post.slug === state.selectedBlogSlug) || posts[0];
  const heroImageMarkup = activePost.media?.heroImage
    ? `
        <div class="blog-figure-media">
          <img
            class="blog-figure-image"
            src="${escapeHtml(activePost.media.heroImage)}"
            alt="${escapeHtml(activePost.media.heroAlt || activePost.title)}"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
        </div>
      `
    : "";
  const supportImageMarkup = activePost.media?.supportImage
    ? `
        <section class="blog-support-media">
          <div class="section-heading">
            <div>
              <p class="section-kicker">Workshop View</p>
              <h3>Manufacturing Context</h3>
            </div>
          </div>
          <div class="blog-support-media-grid">
            <div class="blog-support-copy">
              <p>${escapeHtml(
                activePost.callout ||
                  "Brahmworks aligns each prototype and production decision with process capability, cost, and downstream production risk.",
              )}</p>
            </div>
            <img
              class="blog-support-image"
              src="${escapeHtml(activePost.media.supportImage)}"
              alt="${escapeHtml(activePost.media.supportAlt || activePost.title)}"
              loading="lazy"
              referrerpolicy="no-referrer"
            />
          </div>
        </section>
      `
    : "";
  blogViewer.className = "blog-viewer";
  blogViewer.innerHTML = `
    <article class="blog-article">
      <div class="blog-hero">
        <div class="blog-hero-mark">${activePost.icon}</div>
        <div class="blog-hero-copy">
          <p class="section-kicker">${escapeHtml(activePost.category)}</p>
          <h2>${escapeHtml(activePost.title)}</h2>
          <p class="blog-meta-line">${escapeHtml(activePost.readTime)} • Brahmworks Editorial</p>
          <p class="blog-excerpt">${escapeHtml(activePost.heroLead || activePost.excerpt)}</p>
        </div>
      </div>
      <div class="blog-stat-grid">
        ${(activePost.stats || [])
          .map(
            ([label, value]) => `
              <div class="blog-stat-card">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
      <section class="blog-figure blog-figure-${escapeHtml(activePost.figure?.theme || "default")}">
        <div class="blog-figure-copy">
          <p class="section-kicker">Visual Overview</p>
          <h3>${escapeHtml(activePost.figure?.title || "Manufacturing Overview")}</h3>
          <p>${escapeHtml(activePost.figure?.caption || activePost.excerpt)}</p>
        </div>
        ${heroImageMarkup}
        <div class="blog-figure-badges">
          ${(activePost.figure?.badges || []).map((badge) => `<span class="pill">${escapeHtml(badge)}</span>`).join("")}
        </div>
      </section>
      <section class="blog-process-block">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Process</p>
            <h3>Recommended Flow</h3>
          </div>
        </div>
        <div class="blog-process-grid">
          ${(activePost.processStages || [])
            .map(
              (stage, index) => `
                <div class="blog-stage-card">
                  <span class="blog-stage-index">0${index + 1}</span>
                  <h4>${escapeHtml(stage.title)}</h4>
                  <p>${escapeHtml(stage.text)}</p>
                </div>
              `,
            )
            .join("")}
        </div>
      </section>
      <section class="blog-bullet-grid">
        ${(activePost.bulletGroups || [])
          .map(
            (group) => `
              <div class="blog-bullet-card">
                <div class="blog-bullet-head">
                  <span class="blog-bullet-icon">${escapeHtml(group.icon || "•")}</span>
                  <h3>${escapeHtml(group.title)}</h3>
                </div>
                <div class="blog-bullet-items">
                  ${(group.items || []).map((item) => `<p><span class="blog-bullet-dot"></span>${escapeHtml(item)}</p>`).join("")}
                </div>
              </div>
            `,
          )
          .join("")}
      </section>
      ${supportImageMarkup}
      <div class="blog-section-stack">
        ${activePost.sections
          .map(
            (section) => `
              <section class="blog-section">
                <h3>${escapeHtml(section.heading)}</h3>
                <p>${escapeHtml(section.body)}</p>
              </section>
            `,
          )
          .join("")}
      </div>
      <section class="blog-callout">
        <p class="section-kicker">Brahmworks View</p>
        <h3>Practical Takeaway</h3>
        <p>${escapeHtml(activePost.callout || activePost.excerpt)}</p>
      </section>
    </article>
  `;
}

function renderMetrics() {
  if (!state.reports) return;
  metricsRoot.innerHTML = "";
  const openOrders = (state.purchaseOrders || []).filter((order) => order.status !== "Received");
  const approvedSuppliers = (state.suppliers || []).filter((supplier) => supplier.approvalStatus === "Approved");
  const selectedProject = (state.projects || []).find((project) => project.id === state.selectedProjectId);
  const cardsByTab = {
    overview: [
      ["Incoming Quotes", state.reports.metrics.quoteCount || 0, "Customer quote requests received through the portal", "quotes"],
      ["New Quotes", state.reports.metrics.newQuoteCount || 0, "Requests still waiting for internal triage", "quotes"],
      ["Inventory SKUs", state.reports.metrics.skuCount, "Live stock-keeping units in Brahmworks catalog", "inventory"],
      ["Reorder Alerts", state.reports.metrics.lowStockCount, "Items below or at reorder threshold", "inventory"],
      ["Stock Value", formatCurrency(state.reports.metrics.totalInventoryValue), "Current carrying value of inventory", "reports"],
      ["Open Purchase Orders", state.reports.metrics.openPurchaseOrders, "Orders still pending receipt or closure", "purchaseOrders"],
      ["Active Projects", state.reports.metrics.projectCount || 0, "Customer-linked jobs tracked in workspace", "projects"],
    ],
    quotes: [],
    requests: [
      ["Quote Requests", state.quoteRequests.length, "Customer RFQs currently visible in the workspace", "requests"],
      ["New Requests", (state.quoteRequests || []).filter((quote) => quote.status === "New").length, "Fresh requests awaiting internal review", "requests"],
      ["Quoted", (state.quoteRequests || []).filter((quote) => quote.status === "Quoted").length, "Requests already responded to commercially", "requests"],
    ],
    inventory: [
      ["Catalog SKUs", state.reports.metrics.skuCount, "Distinct parts and materials under stock control", "inventory"],
      ["Units On Hand", state.reports.metrics.unitsOnHand || 0, "Physical quantity currently available", "inventory"],
      ["Low Stock Items", state.reports.metrics.lowStockCount, "Items ready for replenishment action", "inventory"],
      ["Inventory Value", formatCurrency(state.reports.metrics.totalInventoryValue), "Valuation of current on-hand stock", "reports"],
    ],
    suppliers: [
      ["Vendor Directory", state.supplierTotalCount || state.suppliers.length, "Suppliers available in the workspace directory", "suppliers"],
      ["Approved Vendors", approvedSuppliers.length, "Vendors cleared for operational purchasing", "suppliers"],
      ["Relevant Vendors", Math.max((state.supplierTotalCount || state.suppliers.length) - approvedSuppliers.length, 0), "Known suppliers still awaiting approval", "suppliers"],
    ],
    purchaseOrders: [
      ["Open POs", openOrders.length, "Purchase orders still awaiting receipt", "purchaseOrders"],
      ["Received POs", (state.purchaseOrders || []).filter((order) => order.status === "Received").length, "Orders already received into stock", "purchaseOrders"],
      ["Open PO Value", formatCurrency(openOrders.reduce((sum, order) => sum + Number(order.totalValue || 0), 0)), "Outstanding procurement value", "purchaseOrders"],
    ],
    customers: [
      ["Customer Accounts", state.customers.length, "Customers available for project mapping", "customers"],
      ["Linked Projects", state.projects.length, "Projects currently mapped to customer accounts", "projects"],
    ],
    projects: [
      ["Active Projects", state.projects.length, "Live project records in the workspace", "projects"],
      ["Mapped Customers", state.customers.length, "Customer accounts available for assignment", "customers"],
      ["Service Lines", state.services.length, "Brahmworks service categories available to map", "projects"],
    ],
    projectWorkspace: selectedProject
      ? [
          ["Current Project", selectedProject.name, selectedProject.customer?.name || "No customer linked", "projectWorkspace"],
          ["Workspace Files", state.projectDocuments.length, "Documents uploaded into this project vault", "projectWorkspace"],
          ["Mapped Services", (selectedProject.services || []).length, "Brahmworks services attached to this project", "projects"],
        ]
      : [
          ["Available Projects", state.projects.length, "Choose a project to open its document workspace", "projects"],
        ],
    reports: [
      ["Inventory Value", formatCurrency(state.reports.metrics.totalInventoryValue), "Current carrying value across all stock", "reports"],
      ["Low Stock Items", state.reports.metrics.lowStockCount, "Items flagged below reorder threshold", "inventory"],
      ["Open Purchase Orders", state.reports.metrics.openPurchaseOrders, "Procurement orders still in progress", "purchaseOrders"],
      ["Customer Accounts", state.reports.metrics.customerCount || 0, "Customer records available in reporting scope", "customers"],
      ["Tracked Projects", state.reports.metrics.projectCount || 0, "Projects included in the operational report set", "projects"],
    ],
    logistics: [
      ["Delivery Challans", state.deliveryChallans.length, "Dispatch documents created for shipment movement", "logistics"],
      ["Packaging Docs", state.packagingDocuments.length, "Packing documents prepared for dispatch", "logistics"],
      ["Dispatch-Ready POs", openOrders.length, "Purchase orders available for dispatch coordination", "purchaseOrders"],
    ],
  };
  const cards = cardsByTab[state.activeTab] || [];
  metricsRoot.classList.toggle("hidden", !cards.length);
  metricsRoot.setAttribute("aria-hidden", String(!cards.length));
  dashboardRoot?.classList.toggle("metrics-collapsed", !cards.length);
  if (!cards.length) return;

  cards.forEach(([label, value, note, tab]) => {
    const fragment = metricTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".metric-card");
    card.dataset.action = "go-tab";
    card.dataset.tab = tab;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `${label}: ${value}. Open ${tab} tab`);
    fragment.querySelector(".metric-label").textContent = label;
    fragment.querySelector(".metric-value").textContent = value;
    fragment.querySelector(".metric-note").textContent = note;
    metricsRoot.appendChild(fragment);
  });
}

function renderUser() {
  userName.textContent = state.user.name;
  userMeta.textContent = `${state.user.role} • ${state.user.email}`;
  const firstName = String(state.user.name || "Workspace").trim().split(/\s+/)[0] || "Workspace";
  const chipLabel = workspaceDetailsButton?.querySelector(".workspace-chip-label");
  if (chipLabel) chipLabel.textContent = firstName;
  if (workspaceChipAvatar) workspaceChipAvatar.textContent = firstName.slice(0, 1).toUpperCase();
  workspaceDetailsButton?.setAttribute("aria-label", `Open workspace details for ${state.user.name}`);
}

function findWorkspaceSearchTarget(query) {
  const checks = [
    {
      tab: "overview",
      items: [...(state.reports?.lowStock || []), ...(state.movements || [])],
      message: `Showing workspace activity matches for "${query}".`,
    },
    {
      tab: "requests",
      items: state.quoteRequests || [],
      message: `Showing quote request matches for "${query}".`,
    },
    {
      tab: "inventory",
      items: state.inventory || [],
      message: `Showing inventory matches for "${query}".`,
      inventoryQuery: query,
    },
    {
      tab: "suppliers",
      items: (state.suppliersLoaded ? state.suppliers : state.supplierOptions) || [],
      message: `Showing supplier matches for "${query}".`,
      supplierQuery: query,
    },
    {
      tab: "purchaseOrders",
      items: state.purchaseOrders || [],
      message: `Showing purchase order, invoice, and GRN matches for "${query}".`,
    },
    {
      tab: "logistics",
      items: [...(state.deliveryChallans || []), ...(state.packagingDocuments || [])],
      message: `Showing logistics document matches for "${query}".`,
    },
    {
      tab: "customers",
      items: state.customers || [],
      message: `Showing customer matches for "${query}".`,
    },
    {
      tab: "projects",
      items: [...(state.projects || []), ...(state.services || []), ...(state.projectDocuments || [])],
      message: `Showing project and service matches for "${query}".`,
    },
    {
      tab: "users",
      items: state.users || [],
      message: `Showing user matches for "${query}".`,
    },
    {
      tab: "profile",
      items: state.user ? [state.user] : [],
      message: `Showing profile matches for "${query}".`,
    },
  ];

  const accessibleChecks = checks.filter((entry) => entry.tab === "profile" || canScreen(entry.tab));

  const scoredMatches = accessibleChecks
    .map((entry) => ({
      ...entry,
      matchCount: entry.items.filter((item) => matchesSearch(item, query)).length,
    }))
    .filter((entry) => entry.matchCount > 0)
    .sort((left, right) => right.matchCount - left.matchCount);

  if (scoredMatches.length) return scoredMatches[0];
  return { tab: "suppliers", message: `No exact workspace match found. Searching suppliers for "${query}".`, supplierQuery: query };
}

async function runWorkspaceSearch() {
  const query = workspaceSearchInput?.value.trim();
  if (!query) {
    const shouldRefreshSuppliers = state.workspaceSearchTarget === "suppliers" || state.activeTab === "suppliers";
    state.workspaceSearchQuery = "";
    state.workspaceSearchTarget = "";
    state.supplierSearchQuery = "";
    if (inventorySearchInput) inventorySearchInput.value = "";
    if (shouldRefreshSuppliers) {
      await loadSuppliers(true);
    }
    renderApp();
    return;
  }
  const target = findWorkspaceSearchTarget(query);
  state.workspaceSearchQuery = query;
  state.workspaceSearchTarget = target.tab;
  if (target.inventoryQuery && inventorySearchInput) {
    inventorySearchInput.value = target.inventoryQuery;
  }
  if (target.supplierQuery) {
    state.supplierSearchQuery = target.supplierQuery;
    await loadSuppliers(true);
    if (!state.suppliers.length) {
      flashMessage(`No workspace results found for "${query}".`, true);
      return;
    }
  }
  setActiveTab(target.tab);
  renderApp();
  flashMessage(target.message);
}

function queueWorkspaceSearch() {
  window.clearTimeout(workspaceSearchDebounce);
  workspaceSearchDebounce = window.setTimeout(() => {
    runWorkspaceSearch().catch((error) => flashMessage(error.message, true));
  }, 180);
}

function openWorkspaceDetails() {
  state.workspaceDetailsOpen = true;
  renderWorkspaceDetails();
}

function closeWorkspaceDetails() {
  state.workspaceDetailsOpen = false;
  renderWorkspaceDetails();
}

function renderWorkspaceDetails() {
  const isOpen = Boolean(state.workspaceDetailsOpen && state.user);
  workspaceDetailsModal.classList.toggle("hidden", !isOpen);
  workspaceDetailsModal.setAttribute("aria-hidden", String(!isOpen));
  workspaceDetailsButton?.setAttribute("aria-expanded", String(isOpen));
  if (!isOpen) return;
  window.requestAnimationFrame(() => {
    if (closeWorkspaceDetailsButton && typeof closeWorkspaceDetailsButton.focus === "function") {
      closeWorkspaceDetailsButton.focus();
    }
  });
}

function fillSelect(select, items, formatLabel, includeEmpty = false, emptyLabel = "Not linked") {
  select.innerHTML = "";
  if (includeEmpty) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = emptyLabel;
    select.appendChild(emptyOption);
  }
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = formatLabel(item);
    select.appendChild(option);
  });
}

function optionValue(option) {
  return typeof option === "string" ? option : option?.value;
}

function optionLabel(option) {
  return typeof option === "string" ? option : option?.label || option?.value;
}

function fillSimpleSelect(select, options, selectedValue = "") {
  if (!select) return;
  select.innerHTML = "";
  (options || []).forEach((optionEntry) => {
    const option = document.createElement("option");
    option.value = optionValue(optionEntry);
    option.textContent = optionLabel(optionEntry);
    if (option.value === selectedValue) option.selected = true;
    select.appendChild(option);
  });
}

function getQuoteProcessConfig(process) {
  return state.quoteConfig?.processes?.[process] || null;
}

function getMaterialFamilyConfig(process, familyValue) {
  return (getQuoteProcessConfig(process)?.materialFamilies || []).find((family) => family.value === familyValue) || null;
}

function getCurrentPublicQuoteSelections() {
  const process = publicQuoteProcess?.value || "CNC Machining";
  const selections = {};
  publicQuoteOptionFields?.querySelectorAll("[data-quote-option]").forEach((field) => {
    selections[field.name] = field.value;
  });
  const family = selections.materialFamily || getQuoteProcessConfig(process)?.materialFamilies?.[0]?.value || "";
  const familyConfig = getMaterialFamilyConfig(process, family);
  selections.materialFamily = family;
  selections.materialGrade = selections.materialGrade || familyConfig?.grades?.[0] || "";
  return selections;
}

function renderPublicQuoteOptionFields() {
  if (!publicQuoteOptionFields || !state.quoteConfig) return;
  const process = publicQuoteProcess?.value || Object.keys(state.quoteConfig.processes || {})[0];
  const processConfig = getQuoteProcessConfig(process);
  if (!processConfig) return;

  const existingSelections = getCurrentPublicQuoteSelections();
  publicQuoteOptionFields.innerHTML = "";

  (processConfig.fields || []).forEach((field) => {
    const label = document.createElement("label");
    label.className = "quote-option-field";
    label.innerHTML = `<span>${escapeHtml(field.label)}</span>`;
    const select = document.createElement("select");
    select.name = field.key;
    select.dataset.quoteOption = field.key;

    if (field.type === "material-family") {
      fillSimpleSelect(select, processConfig.materialFamilies.map((family) => ({ value: family.value, label: family.value })), existingSelections.materialFamily);
    } else if (field.type === "material-grade") {
      const familyValue = existingSelections.materialFamily || processConfig.materialFamilies?.[0]?.value || "";
      const familyConfig = getMaterialFamilyConfig(process, familyValue);
      fillSimpleSelect(select, (familyConfig?.grades || []).map((grade) => ({ value: grade, label: grade })), existingSelections.materialGrade);
    } else {
      fillSimpleSelect(select, field.options || [], existingSelections[field.key]);
    }

    label.appendChild(select);
    publicQuoteOptionFields.appendChild(label);
  });
}

function getSelectedProjectServiceIds() {
  return [...state.projectServiceSelection];
}

function renderProjectServiceSelection() {
  if (!projectSelectedServices) return;
  projectSelectedServices.innerHTML = "";
  if (!state.projectServiceSelection.length) {
    projectSelectedServices.innerHTML = '<div class="empty-state compact-empty">No services linked yet.</div>';
    projectServiceIds.value = "";
    return;
  }

  state.projectServiceSelection.forEach((serviceId) => {
    const service = (state.services || []).find((entry) => entry.id === serviceId);
    if (!service) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pill interactive-pill removable-pill";
    button.dataset.action = "remove-project-service";
    button.dataset.id = service.id;
    button.innerHTML = `<span>${escapeHtml(service.name)}</span><strong>&times;</strong>`;
    projectSelectedServices.appendChild(button);
  });
  projectServiceIds.value = state.projectServiceSelection.join(",");
}

function getProjectsForCustomer(customerId) {
  if (!customerId) return state.projects || [];
  return (state.projects || []).filter((project) => project.customerId === customerId);
}

function fillProjectSelect(select, customerId, includeEmpty = true, emptyLabel = "Not linked") {
  fillSelect(select, getProjectsForCustomer(customerId), (project) => project.name, includeEmpty, emptyLabel);
}

function syncCustomerProject(customerSelect, projectSelect) {
  const selectedProject = (state.projects || []).find((project) => project.id === projectSelect.value);
  if (selectedProject?.customerId) {
    customerSelect.value = selectedProject.customerId;
  }
}

function renderLowStock() {
  lowStockList.innerHTML = "";
  const query = state.workspaceSearchTarget === "overview" ? state.workspaceSearchQuery.trim() : "";
  const lowStock = query ? (state.reports.lowStock || []).filter((item) => matchesSearch(item, query)) : state.reports.lowStock;
  if (!lowStock.length) {
    lowStockList.innerHTML = query
      ? '<div class="empty-state">No low stock items match this workspace search.</div>'
      : '<div class="empty-state">All monitored items are above threshold.</div>';
    return;
  }

  lowStock.forEach((item) => {
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <div class="list-title-row">
        <h3>${item.name}</h3>
        <span class="status-badge low">Qty ${item.quantity}</span>
      </div>
      <p>${item.category} • ${item.sku}</p>
      <div class="list-meta">
        <span class="pill">Threshold ${item.threshold}</span>
        <span class="pill">${item.supplier ? item.supplier.name : "Unassigned supplier"}</span>
        <span class="pill">${item.customer?.name || "No customer"}</span>
        <span class="pill">${item.project?.name || "No project"}</span>
        <span class="pill">${item.location || "No location"}</span>
      </div>
    `;
    lowStockList.appendChild(node);
  });
}

function renderMovements() {
  movementLog.innerHTML = "";
  const query = state.workspaceSearchTarget === "overview" ? state.workspaceSearchQuery.trim() : "";
  const recent = query
    ? (state.movements || []).filter((entry) => matchesSearch(entry, query)).slice(0, 8)
    : state.movements.slice(0, 8);
  if (!recent.length) {
    movementLog.innerHTML = query
      ? '<div class="empty-state">No movement entries match this workspace search.</div>'
      : '<div class="empty-state">No movements recorded yet.</div>';
    return;
  }
  recent.forEach((entry) => {
    const badgeClass = entry.type === "in" ? "good" : "low";
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <div class="list-title-row">
        <h3>${entry.itemName}</h3>
        <span class="status-badge ${badgeClass}">${entry.type === "in" ? "+" : "-"}${entry.quantity}</span>
      </div>
      <p>${entry.note || "No note added"}</p>
      <div class="list-meta">
        <span class="pill">${entry.sku}</span>
        <span class="pill">${entry.project?.name || "No project"}</span>
        <span class="pill">${entry.createdBy}</span>
        <span class="pill">${formatDateTime(entry.createdAt)}</span>
      </div>
    `;
    movementLog.appendChild(node);
  });
}

function matchesSearch(item, query) {
  const seen = new Set();
  const toText = (value, depth = 0) => {
    if (value == null || depth > 3) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (typeof value !== "object" || seen.has(value)) return "";
    seen.add(value);
    if (Array.isArray(value)) {
      return value.map((entry) => toText(entry, depth + 1)).filter(Boolean).join(" ");
    }
    return Object.entries(value)
      .filter(([key]) => !["contentBase64", "fileUrl"].includes(key))
      .map(([, entry]) => toText(entry, depth + 1))
      .filter(Boolean)
      .join(" ");
  };
  return toText(item).toLowerCase().includes(query.toLowerCase());
}

function actionButtons(buttons) {
  return buttons.length ? `<div class="action-strip">${buttons.join("")}</div>` : `<span class="muted-text">No actions</span>`;
}

function getSupplierIndustries() {
  const industries = (state.supplierIndustries || []).length
    ? [...state.supplierIndustries].sort((left, right) => left.localeCompare(right))
    : [...new Set(state.suppliers.map((supplier) => supplier.industry || "General"))].sort((left, right) =>
        left.localeCompare(right),
      );
  return ["All", ...industries];
}

function getSupplierApprovalStatuses() {
  return ["All", "Approved", "Not Approved"];
}

function supplierBankStatus(supplier) {
  return supplier.bankDetails?.accountNumber ? "Found" : "Not Found";
}

function supplierBankSummary(supplier) {
  if (!supplier.bankDetails?.accountNumber) {
    return null;
  }
  const details = supplier.bankDetails;
  return [
    `Account Name: ${details.accountName || supplier.name}`,
    `Bank Name: ${details.bankName || "-"}`,
    `Account Number: ${details.accountNumber || "-"}`,
    `IFSC / SWIFT: ${details.ifscCode || "-"}`,
    `Branch: ${details.branch || "-"}`,
    `Notes: ${details.notes || "-"}`,
  ].join("\n");
}

function renderSupplierFilters() {
  supplierIndustryFilters.innerHTML = "";
  supplierApprovalFilters.innerHTML = "";
  getSupplierApprovalStatuses().forEach((status) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pill interactive-pill ${state.supplierApprovalFilter === status ? "active-filter-pill" : ""}`;
    button.dataset.action = "filter-suppliers-approval";
    button.dataset.approval = status;
    button.textContent = status;
    supplierApprovalFilters.appendChild(button);
  });
  getSupplierIndustries().forEach((industry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `pill interactive-pill ${state.supplierIndustryFilter === industry ? "active-filter-pill" : ""}`;
    button.dataset.action = "filter-suppliers";
    button.dataset.industry = industry;
    button.textContent = industry;
    supplierIndustryFilters.appendChild(button);
  });
  supplierGroupingButton.textContent = state.supplierGrouped ? "Grouped by Industry" : "Flat Supplier List";
}

function renderOnlineVendors() {
  onlineVendorList.innerHTML = "";
  if (!state.onlineVendors.length) {
    onlineVendorList.innerHTML = '<div class="empty-state">No global vendor results yet. Use the assistant with <strong>Global Vendors</strong> to search outside the directory.</div>';
    return;
  }
  state.onlineVendors.forEach((vendor) => {
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <div class="list-title-row">
        <h3>${escapeHtml(vendor.title)}</h3>
        <span class="status-badge pending">Global Result</span>
      </div>
      <p>${escapeHtml(vendor.snippet || "Web result outside the Brahmworks directory")}</p>
      <div class="list-meta">
        <a class="inline-link" href="${escapeHtml(vendor.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(vendor.url)}</a>
      </div>
    `;
    onlineVendorList.appendChild(node);
  });
}

function openSupplierEditor(supplierId, focusField = "name") {
  state.supplierEditor = {
    open: true,
    supplierId,
    focusField,
  };
  renderSupplierEditor();
}

function closeSupplierEditor() {
  state.supplierEditor = {
    open: false,
    supplierId: null,
    focusField: "name",
  };
  renderSupplierEditor();
}

function openBankEditor(supplierId) {
  state.bankEditor = {
    open: true,
    supplierId,
  };
  renderBankEditor();
}

function closeBankEditor() {
  state.bankEditor = {
    open: false,
    supplierId: null,
  };
  renderBankEditor();
}

function openInventoryEditor(inventoryId) {
  state.inventoryEditor = {
    open: true,
    inventoryId,
  };
  renderInventoryEditor();
}

function closeInventoryEditor() {
  state.inventoryEditor = {
    open: false,
    inventoryId: null,
  };
  renderInventoryEditor();
}

function openPurchaseOrderEditor(orderId) {
  state.purchaseOrderEditor = {
    open: true,
    orderId,
  };
  renderPurchaseOrderEditor();
}

function closePurchaseOrderEditor() {
  state.purchaseOrderEditor = {
    open: false,
    orderId: null,
  };
  renderPurchaseOrderEditor();
}

function renderSupplierEditor() {
  const supplier = state.suppliers.find((entry) => entry.id === state.supplierEditor.supplierId);
  const isOpen = state.supplierEditor.open && Boolean(supplier);
  supplierEditorModal.classList.toggle("hidden", !isOpen);
  supplierEditorModal.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  fillSelect(supplierEditorCustomerSelect, state.customers || [], (entry) => entry.name, true);
  fillProjectSelect(supplierEditorProjectSelect, "", true);
  const values = promptEditSupplier(supplier);
  supplierEditorForm.elements.name.value = values.name;
  supplierEditorForm.elements.customerId.value = values.customerId;
  fillProjectSelect(supplierEditorProjectSelect, values.customerId, true);
  supplierEditorForm.elements.projectId.value = values.projectId;
  supplierEditorForm.elements.industry.value = values.industry;
  supplierEditorForm.elements.approvalStatus.value = values.approvalStatus;
  supplierEditorForm.elements.contactPerson.value = values.contactPerson;
  supplierEditorForm.elements.city.value = values.city;
  supplierEditorForm.elements.email.value = values.email;
  supplierEditorForm.elements.phone.value = values.phone;
  supplierEditorForm.elements.leadTimeDays.value = String(values.leadTimeDays);
  supplierEditorForm.elements.rating.value = String(values.rating);

  const focusTarget = supplierEditorForm.elements[state.supplierEditor.focusField] || supplierEditorForm.elements.name;
  window.requestAnimationFrame(() => {
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus();
      if (typeof focusTarget.select === "function" && focusTarget.type !== "select-one") {
        focusTarget.select();
      }
    }
  });
}

function renderBankEditor() {
  const supplier = state.suppliers.find((entry) => entry.id === state.bankEditor.supplierId);
  const isOpen = state.bankEditor.open && Boolean(supplier);
  bankDetailsModal.classList.toggle("hidden", !isOpen);
  bankDetailsModal.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  const current = supplier.bankDetails || {};
  const hasBankDetails = Boolean(
    current.accountName || current.bankName || current.accountNumber || current.ifscCode || current.branch || current.notes
  );

  bankDetailsStatus.innerHTML = hasBankDetails
    ? `<strong>Found.</strong> Bank details are already saved for ${escapeHtml(supplier.name)}. You can review or update them below.`
    : `<strong>Not found.</strong> No bank details are saved for ${escapeHtml(supplier.name)} yet. You can add them now or choose Later.`;

  bankDetailsForm.elements.accountName.value = current.accountName || supplier.name || "";
  bankDetailsForm.elements.bankName.value = current.bankName || "";
  bankDetailsForm.elements.accountNumber.value = current.accountNumber || "";
  bankDetailsForm.elements.ifscCode.value = current.ifscCode || "";
  bankDetailsForm.elements.branch.value = current.branch || "";
  bankDetailsForm.elements.notes.value = current.notes || "";

  window.requestAnimationFrame(() => {
    bankDetailsForm.elements.accountName.focus();
    bankDetailsForm.elements.accountName.select();
  });
}

function renderInventoryEditor() {
  const item = state.inventory.find((entry) => entry.id === state.inventoryEditor.inventoryId);
  const isOpen = state.inventoryEditor.open && Boolean(item);
  inventoryEditorModal.classList.toggle("hidden", !isOpen);
  inventoryEditorModal.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  fillSelect(inventoryEditorCustomerSelect, state.customers || [], (entry) => entry.name, true);
  fillProjectSelect(inventoryEditorProjectSelect, "", true);
  fillSelect(inventoryEditorSupplierSelect, state.supplierOptions || [], (entry) => entry.name, true);
  const values = promptEditInventory(item);
  inventoryEditorForm.elements.name.value = values.name;
  inventoryEditorForm.elements.sku.value = values.sku;
  inventoryEditorForm.elements.category.value = values.category;
  inventoryEditorForm.elements.customerId.value = values.customerId;
  fillProjectSelect(inventoryEditorProjectSelect, values.customerId, true);
  inventoryEditorForm.elements.projectId.value = values.projectId;
  inventoryEditorForm.elements.quantity.value = String(values.quantity);
  inventoryEditorForm.elements.threshold.value = String(values.threshold);
  inventoryEditorForm.elements.cost.value = String(values.cost);
  inventoryEditorForm.elements.supplierId.value = values.supplierId;
  inventoryEditorForm.elements.location.value = values.location;
  inventoryEditorForm.elements.unit.value = values.unit;

  window.requestAnimationFrame(() => {
    inventoryEditorForm.elements.name.focus();
    inventoryEditorForm.elements.name.select();
  });
}

function renderPurchaseOrderEditor() {
  const order = state.purchaseOrders.find((entry) => entry.id === state.purchaseOrderEditor.orderId);
  const isOpen = state.purchaseOrderEditor.open && Boolean(order);
  purchaseOrderEditorModal.classList.toggle("hidden", !isOpen);
  purchaseOrderEditorModal.setAttribute("aria-hidden", String(!isOpen));
  if (!isOpen) return;

  fillSelect(purchaseOrderEditorCustomerSelect, state.customers || [], (entry) => entry.name, true);
  fillProjectSelect(purchaseOrderEditorProjectSelect, "", true);
  fillSelect(purchaseOrderEditorSupplierSelect, state.supplierOptions || [], (entry) => entry.name, true);
  const values = promptEditPurchaseOrder(order);
  purchaseOrderEditorForm.elements.customerId.value = values.customerId;
  fillProjectSelect(purchaseOrderEditorProjectSelect, values.customerId, true);
  purchaseOrderEditorForm.elements.projectId.value = values.projectId;
  purchaseOrderEditorForm.elements.supplierId.value = values.supplierId;
  purchaseOrderEditorForm.elements.status.value = values.status;
  purchaseOrderEditorForm.elements.quantity.value = String(values.quantity);
  purchaseOrderEditorForm.elements.cost.value = String(values.cost);
  purchaseOrderEditorForm.elements.orderDate.value = values.orderDate;
  purchaseOrderEditorForm.elements.expectedDate.value = values.expectedDate;
  purchaseOrderEditorForm.elements.notes.value = values.notes;

  window.requestAnimationFrame(() => {
    purchaseOrderEditorForm.elements.quantity.focus();
    purchaseOrderEditorForm.elements.quantity.select();
  });
}

async function loadSuppliers(reset = false) {
  if (!canScreen("suppliers")) return;
  if (reset) {
    state.supplierVisibleCount = 12;
  }
  const params = new URLSearchParams({
    query: state.supplierSearchQuery,
    industry: state.supplierIndustryFilter,
    approvalStatus: state.supplierApprovalFilter,
    limit: String(state.supplierVisibleCount),
    offset: "0",
  });
  const data = await api(`/api/suppliers?${params.toString()}`);
  state.suppliers = data.suppliers;
  state.supplierTotalCount = data.totalCount;
  state.suppliersLoaded = true;
}

function renderInventoryTable() {
  const query = inventorySearchInput?.value.trim() || "";
  const items = query ? state.inventory.filter((item) => matchesSearch(item, query)) : state.inventory;
  inventoryTableBody.innerHTML = "";
  if (!items.length) {
    inventoryTableBody.innerHTML = `<tr><td colspan="12"><div class="empty-state">No inventory items match this search.</div></td></tr>`;
    return;
  }

  items.forEach((item) => {
    const low = item.quantity <= item.threshold;
    const actions = [];
    if (can("inventory.edit")) actions.push(`<button class="table-button" data-action="edit-inventory" data-id="${item.id}">Edit</button>`);
    if (can("inventory.delete")) actions.push(`<button class="table-button danger-button" data-action="delete-inventory" data-id="${item.id}">Delete</button>`);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.sku}</td>
      <td>${item.category}</td>
      <td>${item.quantity} ${item.unit || ""}</td>
      <td>${item.threshold}</td>
      <td>${formatCurrency(item.cost)}</td>
      <td>${item.customer?.name || "-"}</td>
      <td>${item.project?.name || "-"}</td>
      <td>${item.supplier ? item.supplier.name : "-"}</td>
      <td>${item.location || "-"}</td>
      <td><span class="status-badge ${low ? "low" : "good"}">${low ? "Low Stock" : "Healthy"}</span></td>
      <td>${actionButtons(actions)}</td>
    `;
    inventoryTableBody.appendChild(row);
  });
}

function renderSuppliers() {
  supplierTableBody.innerHTML = "";
  supplierCountText.textContent = "";
  renderSupplierFilters();
  supplierRequirementInput.value = state.supplierRequirement;
  supplierScopeSelect.value = state.supplierScope;
  supplierAssistantSummary.textContent =
    state.supplierAssistantSummary || "Tell me your requirement and whether you want local or global vendors, and I’ll shortlist the best matches.";
  if (!state.suppliersLoaded) {
    supplierTableBody.innerHTML = `
      <tr>
        <td colspan="11"><div class="empty-state">Loading suppliers...</div></td>
      </tr>
    `;
    showMoreSuppliersButton.classList.add("hidden");
    renderOnlineVendors();
    return;
  }
  if (!state.suppliers.length) {
    supplierTableBody.innerHTML = `
      <tr>
        <td colspan="11"><div class="empty-state">No suppliers added yet.</div></td>
      </tr>
    `;
    showMoreSuppliersButton.classList.add("hidden");
    renderOnlineVendors();
    return;
  }
  const visibleSuppliers = state.suppliers;

  if (!visibleSuppliers.length) {
    supplierTableBody.innerHTML = `
      <tr>
        <td colspan="11"><div class="empty-state">No suppliers match the current search and filters.</div></td>
      </tr>
    `;
    showMoreSuppliersButton.classList.add("hidden");
    supplierCountText.textContent = `Showing 0 of ${state.supplierTotalCount} suppliers`;
    renderOnlineVendors();
    return;
  }

  let previousIndustry = null;
  visibleSuppliers.forEach((supplier) => {
    const actions = [];
    if (can("suppliers.edit")) actions.push(`<button class="table-button" data-action="edit-supplier" data-id="${supplier.id}">Edit</button>`);
    if (can("suppliers.delete")) actions.push(`<button class="table-button danger-button" data-action="delete-supplier" data-id="${supplier.id}">Delete</button>`);
    if (can("suppliers.bank.edit") && (supplier.approvalStatus || "Not Approved") === "Approved") {
      actions.unshift(`<button class="table-button" data-action="bank-supplier" data-id="${supplier.id}">Bank Details</button>`);
    }
    const industry = supplier.industry || "General";
    const approvalStatus = supplier.approvalStatus || "Not Approved";
    const bankStatus = approvalStatus === "Approved" ? supplierBankStatus(supplier) : "Restricted";

    if (state.supplierGrouped && industry !== previousIndustry) {
      const groupRow = document.createElement("tr");
      groupRow.className = "group-row";
      groupRow.innerHTML = `<td colspan="11"><div class="group-label">${industry}</div></td>`;
      supplierTableBody.appendChild(groupRow);
      previousIndustry = industry;
    }

    const row = document.createElement("tr");
    const industryControl = can("suppliers.edit")
      ? `<button class="inline-edit-button" data-action="change-industry" data-id="${supplier.id}">${escapeHtml(industry)}</button>`
      : escapeHtml(industry);
    row.innerHTML = `
      <td><strong>${supplier.name}</strong></td>
      <td>${industryControl}</td>
      <td>${supplier.customer?.name || "-"}</td>
      <td>${supplier.project?.name || "-"}</td>
      <td><span class="status-badge ${approvalStatus === "Approved" ? "good" : "pending"}">${approvalStatus}</span></td>
      <td>${supplier.contactPerson || "-"}</td>
      <td>${supplier.city || "-"}</td>
      <td>${supplier.leadTimeDays} days</td>
      <td><span class="status-badge good">${Number(supplier.rating).toFixed(1)} / 5</span></td>
      <td><span class="status-badge ${bankStatus === "Found" ? "good" : "pending"}">${bankStatus}</span></td>
      <td>${actionButtons(actions)}</td>
    `;
    supplierTableBody.appendChild(row);
  });

  const baseCountLabel =
    state.supplierIndustryFilter === "All"
      ? `${state.supplierTotalCount} suppliers`
      : `${state.supplierTotalCount} suppliers in ${state.supplierIndustryFilter}`;
  supplierCountText.textContent = `Showing ${visibleSuppliers.length} of ${baseCountLabel}`;
  showMoreSuppliersButton.classList.toggle("hidden", visibleSuppliers.length >= state.supplierTotalCount);
  renderOnlineVendors();
}

function purchaseOrderBadge(status) {
  if (status === "Received") return "good";
  if (status === "Pending") return "pending";
  return "low";
}

function documentButtons(order) {
  if (!can("documents.export")) return "";
  const buttons = [`<button class="table-button" data-action="open-po-doc" data-id="${order.id}">PO</button>`];
  if (order.invoiceId) buttons.push(`<button class="table-button" data-action="open-invoice-doc" data-id="${order.invoiceId}">Invoice</button>`);
  if (order.grnId) buttons.push(`<button class="table-button" data-action="open-grn-doc" data-id="${order.grnId}">GRN</button>`);
  return actionButtons(buttons);
}

function renderPurchaseOrders() {
  purchaseOrderList.innerHTML = "";
  const query = state.workspaceSearchTarget === "purchaseOrders" ? state.workspaceSearchQuery.trim() : "";
  const orders = query ? (state.purchaseOrders || []).filter((order) => matchesSearch(order, query)) : state.purchaseOrders;
  if (!orders.length) {
    purchaseOrderList.innerHTML = query
      ? '<div class="empty-state">No purchase orders, invoices, or GRNs match this workspace search.</div>'
      : '<div class="empty-state">No purchase orders yet.</div>';
    return;
  }
  orders.forEach((order) => {
    const actions = [];
    if (can("purchaseOrders.receive") && order.status !== "Received") actions.push(`<button class="secondary-button" data-action="receive-po" data-id="${order.id}">Mark Received</button>`);
    if (can("purchaseOrders.edit") && order.status !== "Received") actions.push(`<button class="table-button" data-action="edit-po" data-id="${order.id}">Edit</button>`);
    if (can("purchaseOrders.delete") && order.status !== "Received") actions.push(`<button class="table-button danger-button" data-action="delete-po" data-id="${order.id}">Delete</button>`);
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <div class="list-title-row">
        <h3>${order.poNumber}</h3>
        <span class="status-badge ${purchaseOrderBadge(order.status)}">${order.status}</span>
      </div>
      <p>${order.supplier ? order.supplier.name : "No supplier"} • ${formatCurrency(order.totalValue)}</p>
      <div class="list-meta">
        <span class="pill">${order.customer?.name || "No customer"}</span>
        <span class="pill">${order.project?.name || "No project"}</span>
        <span class="pill">Order ${formatDate(order.orderDate)}</span>
        <span class="pill">Expected ${formatDate(order.expectedDate)}</span>
        <span class="pill">${order.items[0].name} x ${order.items[0].quantity}</span>
      </div>
      ${order.notes ? `<p class="notes-line">${order.notes}</p>` : ""}
      ${documentButtons(order)}
      ${actionButtons(actions)}
    `;
    purchaseOrderList.appendChild(node);
  });
}

function renderReports() {
  topValueList.innerHTML = "";
  reportSummary.innerHTML = "";
  state.reports.topValueItems.forEach((item) => {
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <div class="list-title-row">
        <h3>${item.name}</h3>
        <span class="status-badge good">${formatCurrency(item.value)}</span>
      </div>
      <p>${item.sku}</p>
      <div class="list-meta"><span class="pill">${item.quantity} units</span></div>
    `;
    topValueList.appendChild(node);
  });
  [
    `Inventory value stands at ${formatCurrency(state.reports.metrics.totalInventoryValue)}.`,
    `${state.reports.metrics.lowStockCount} SKUs are below or at their reorder threshold.`,
    `${state.reports.metrics.openPurchaseOrders} purchase orders are still open.`,
    `${state.reports.metrics.projectCount || 0} projects are mapped across the workspace.`,
    `${state.reports.metrics.customerCount || 0} customers are available for project mapping.`,
    `${state.users.length} users currently have access to the system.`,
  ].forEach((line) => {
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `<p>${line}</p>`;
    reportSummary.appendChild(node);
  });
}

function renderProjects() {
  customerTableBody.innerHTML = "";
  customerCountText.textContent = "";
  projectTableBody.innerHTML = "";
  projectDocumentTableBody.innerHTML = "";
  serviceList.innerHTML = "";
  const query = ["projects", "customers"].includes(state.workspaceSearchTarget) ? state.workspaceSearchQuery.trim() : "";
  const customers = query ? (state.customers || []).filter((customer) => matchesSearch(customer, query)) : state.customers;
  const projects = query ? (state.projects || []).filter((project) => matchesSearch(project, query)) : state.projects;

  if (!customers.length) {
    customerTableBody.innerHTML = `
      <tr>
        <td colspan="5"><div class="empty-state">${query ? "No customers match this workspace search." : "No customers added yet."}</div></td>
      </tr>
    `;
  } else {
    customers.forEach((customer) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${escapeHtml(customer.name)}</strong></td>
        <td>${escapeHtml(customer.contactPerson || "-")}</td>
        <td>${escapeHtml(customer.phone || "-")}</td>
        <td>${escapeHtml(customer.email || "-")}</td>
        <td><span class="pill">${(state.projects || []).filter((project) => project.customerId === customer.id).length} projects</span></td>
      `;
      customerTableBody.appendChild(row);
    });
    customerCountText.textContent = `${customers.length} customers in directory`;
  }

  if (!projects.length) {
    projectTableBody.innerHTML = `
      <tr>
        <td colspan="6"><div class="empty-state">${query ? "No projects match this workspace search." : "No projects added yet."}</div></td>
      </tr>
    `;
  } else {
    projects.forEach((project) => {
      const row = document.createElement("tr");
      const isSelected = state.selectedProjectId === project.id;
      row.className = isSelected ? "selected-row" : "";
      row.innerHTML = `
        <td>
          <strong>${escapeHtml(project.name)}</strong>
          ${project.notes ? `<div class="table-subtext">${escapeHtml(project.notes)}</div>` : ""}
        </td>
        <td>${escapeHtml(project.customer?.name || "-")}</td>
        <td><span class="status-badge ${project.status === "On Hold" ? "pending" : "good"}">${escapeHtml(project.status)}</span></td>
        <td>${(project.services || []).length ? project.services.map((service) => `<span class="pill">${escapeHtml(service.name)}</span>`).join("") : '<span class="pill">No services</span>'}</td>
        <td><span class="pill">${Number(project.documentCount || 0)} docs</span></td>
        <td>${actionButtons([`<button class="table-button" data-action="select-project" data-id="${project.id}">${isSelected ? "Open" : "Select"}</button>`])}</td>
      `;
      projectTableBody.appendChild(row);
    });
  }

  if (!state.services.length) {
    serviceList.innerHTML = '<div class="empty-state">No services added yet.</div>';
  } else {
    serviceList.innerHTML = state.services
      .map((service) => `<span class="pill">${escapeHtml(service.name)}</span>`)
      .join("");
  }

  renderProjectWorkspace();
}

function renderProjectWorkspace() {
  disposeProjectDocumentViewer();
  const project = (state.projects || []).find((entry) => entry.id === state.selectedProjectId);
  if (!project) {
    setProjectDocumentUploadState("Select a project and choose a file to upload.");
    projectSelectionText.textContent = "Select a project to open its document workspace.";
    projectWorkspaceTitle.textContent = "Project Documents";
    projectWorkspaceMeta.textContent = "";
    projectDocumentTableBody.innerHTML = `
      <tr>
        <td colspan="6"><div class="empty-state">Select a project to load its files.</div></td>
      </tr>
    `;
    projectDocumentViewerTitle.textContent = "Select a document";
    projectDocumentViewer.innerHTML = "Choose a project document to preview it here.";
    projectDocumentViewer.className = "document-viewer workspace-viewer empty-state";
    return;
  }

  setProjectDocumentUploadState(`Upload a document into ${project.name}.`);
  projectSelectionText.textContent = `Workspace open for ${project.name}`;
  projectWorkspaceTitle.textContent = `${project.name} Workspace`;
  projectWorkspaceMeta.textContent = `${project.customer?.name || "No customer linked"} • ${(project.services || []).map((service) => service.name).join(", ") || "No services linked"}`;

  if (!state.projectDocuments.length) {
    projectDocumentTableBody.innerHTML = `
      <tr>
        <td colspan="6"><div class="empty-state">No documents added to this project yet.</div></td>
      </tr>
    `;
    projectDocumentViewerTitle.textContent = "Select a document";
    projectDocumentViewer.innerHTML = "Choose a project document to preview it here.";
    projectDocumentViewer.className = "document-viewer empty-state";
    return;
  }

  projectDocumentTableBody.innerHTML = "";
  state.projectDocuments.forEach((projectDocument) => {
    const row = window.document.createElement("tr");
    row.className = state.selectedProjectDocumentId === projectDocument.id ? "selected-row" : "";
    row.innerHTML = `
      <td>${escapeHtml(projectDocument.category)}</td>
      <td><strong>${escapeHtml(projectDocument.title)}</strong>${projectDocument.notes ? `<div class="table-subtext">${escapeHtml(projectDocument.notes)}</div>` : ""}</td>
      <td>${escapeHtml(projectDocument.originalName)}<div class="table-subtext">${formatBytes(projectDocument.fileSize)}</div></td>
      <td>${escapeHtml(projectDocument.createdBy || "-")}</td>
      <td>${escapeHtml(formatDateTime(projectDocument.updatedAt))}</td>
      <td>${actionButtons([
        `<button class="table-button" data-action="preview-project-document" data-id="${projectDocument.id}">Preview</button>`,
        `<button class="table-button" data-action="open-project-document" data-id="${projectDocument.id}">Open</button>`,
      ])}</td>
    `;
    projectDocumentTableBody.appendChild(row);
  });

  const selectedDocument =
    state.projectDocuments.find((projectDocument) => projectDocument.id === state.selectedProjectDocumentId) ||
    state.projectDocuments[0];
  if (selectedDocument) {
    state.selectedProjectDocumentId = selectedDocument.id;
    renderProjectDocumentViewer(selectedDocument);
  }
}

async function renderProjectDocumentViewer(document) {
  disposeProjectDocumentViewer();
  const renderToken = ++projectDocumentViewerRenderToken;
  projectDocumentViewerTitle.textContent = document.title;
  projectDocumentViewer.className = "document-viewer workspace-viewer";

  const fileName = document.originalName || "";
  const mimeType = String(document.mimeType || "");
  const isStepDocument = /\.(step|stp)$/i.test(fileName);
  const isSpreadsheetFile = isSpreadsheetDocument(document);
  const isPcb = isPcbDocument(document);
  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(fileName);

  if (mimeType.startsWith("image/")) {
    projectDocumentViewer.innerHTML = `<img class="document-image" src="${document.fileUrl}" alt="${escapeHtml(document.title)}" />`;
    return;
  }

  if (isPdf) {
    await renderPdfDocumentViewer(document, renderToken);
    return;
  }

  if (isStepDocument) {
    await renderStepDocumentViewer(document, renderToken);
    return;
  }

  if (isSpreadsheetFile) {
    await renderSpreadsheetDocumentViewer(document, renderToken);
    return;
  }

  if (isPcb) {
    await renderPcbDocumentViewer(document, renderToken);
    return;
  }

  if (isGerberDocument) {
    projectDocumentViewer.innerHTML = `
      <div class="engineering-viewer">
        <div class="viewer-meta">Gerber manufacturing file • ${escapeHtml(document.originalName)}</div>
        <div class="engineering-viewer-card">
          <h3>Gerber preview is not rendered visually here yet</h3>
          <p>This looks like an electronics manufacturing file. Open or download it in a PCB viewer like KiCad GerbView or another Gerber viewer for the correct board preview.</p>
          <div class="engineering-viewer-actions">
            <a class="table-button" href="${document.fileUrl}" target="_blank" rel="noreferrer">Open Gerber File</a>
            <a class="table-button secondary" href="${document.fileUrl}" download="${escapeHtml(document.originalName)}">Download</a>
          </div>
        </div>
      </div>
    `;
    return;
  }

  if (isTextPreviewDocument(document)) {
    try {
      const response = await fetch(document.fileUrl, { headers: state.token || localStorage.getItem("bw_token") ? { Authorization: `Bearer ${state.token || localStorage.getItem("bw_token")}` } : {} });
      const text = await response.text();
      projectDocumentViewer.innerHTML = `
        <div class="viewer-meta">Document preview • ${escapeHtml(document.originalName)}</div>
        <pre class="document-source">${escapeHtml(text.slice(0, 24000) || "File is empty.")}</pre>
      `;
    } catch (error) {
      projectDocumentViewer.className = "document-viewer empty-state";
      projectDocumentViewer.textContent = "Could not preview this document.";
    }
    return;
  }

  projectDocumentViewer.className = "document-viewer empty-state";
  projectDocumentViewer.innerHTML = `This file type does not have an inline browser preview yet. Use <a class="inline-link" href="${document.fileUrl}" target="_blank" rel="noreferrer">Open document</a>.`;
}

function renderProfile() {
  profileForm.name.value = state.user.name || "";
  profileForm.email.value = state.user.email || "";
  profileForm.role.value = state.user.role || "";
  profileSummary.innerHTML = "";
  [
    `Signed in as ${state.user.name}.`,
    `Role: ${state.user.role}.`,
    `Accessible screens: ${state.permissions.screens.join(", ")}.`,
  ].forEach((line) => {
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `<p>${line}</p>`;
    profileSummary.appendChild(node);
  });
}

function renderUsers() {
  userList.innerHTML = "";
  if (!state.users.length) {
    userList.innerHTML = '<div class="empty-state">No users found.</div>';
    return;
  }
  state.users.forEach((user) => {
    const actions = can("users.manage")
      ? [`<button class="table-button" data-action="edit-user" data-id="${user.id}">Edit Role</button>`]
      : [];
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <div class="list-title-row">
        <h3>${user.name}</h3>
        <span class="status-badge good">${user.role}</span>
      </div>
      <p>${user.email}</p>
      ${actionButtons(actions)}
    `;
    userList.appendChild(node);
  });
}

function renderLogistics() {
  challanList.innerHTML = "";
  packagingList.innerHTML = "";
  const query = state.workspaceSearchTarget === "logistics" ? state.workspaceSearchQuery.trim() : "";
  const challans = query ? (state.deliveryChallans || []).filter((challan) => matchesSearch(challan, query)) : state.deliveryChallans;
  const packagingDocs = query ? (state.packagingDocuments || []).filter((packaging) => matchesSearch(packaging, query)) : state.packagingDocuments;
  if (!challans.length) {
    challanList.innerHTML = query
      ? '<div class="empty-state">No delivery challans match this workspace search.</div>'
      : '<div class="empty-state">No delivery challans created yet.</div>';
  } else {
    challans.forEach((challan) => {
      const node = document.createElement("div");
      node.className = "list-item";
      node.innerHTML = `
        <div class="list-title-row">
          <h3>${challan.challanNumber}</h3>
          <span class="status-badge ${challan.challanType === "Returnable" ? "pending" : "good"}">${challan.challanType}</span>
        </div>
        <p>${challan.recipientCompany} • ${challan.destination}</p>
        <div class="list-meta">
          <span class="pill">${challan.poNumber || "No PO linked"}</span>
          <span class="pill">${challan.customer?.name || "No customer"}</span>
          <span class="pill">${challan.project?.name || "No project"}</span>
          <span class="pill">${challan.vehicleNumber || "No vehicle"}</span>
          <span class="pill">${formatDateTime(challan.createdAt)}</span>
        </div>
        ${actionButtons([`<button class="table-button" data-action="open-challan-doc" data-id="${challan.id}">Print Challan</button>`])}
      `;
      challanList.appendChild(node);
    });
  }

  if (!packagingDocs.length) {
    packagingList.innerHTML = query
      ? '<div class="empty-state">No packaging documents match this workspace search.</div>'
      : '<div class="empty-state">No packaging documents created yet.</div>';
  } else {
    packagingDocs.forEach((packaging) => {
      const node = document.createElement("div");
      node.className = "list-item";
      node.innerHTML = `
        <div class="list-title-row">
          <h3>${packaging.packagingNumber}</h3>
          <span class="status-badge good">${packaging.packageCount} packages</span>
        </div>
        <p>${packaging.challanNumber} • ${packaging.recipientCompany || "Dispatch"}</p>
        <div class="list-meta">
          <span class="pill">${packaging.customer?.name || "No customer"}</span>
          <span class="pill">${packaging.project?.name || "No project"}</span>
          <span class="pill">Gross ${packaging.grossWeight} kg</span>
          <span class="pill">Net ${packaging.netWeight} kg</span>
          <span class="pill">${formatDateTime(packaging.createdAt)}</span>
        </div>
        ${actionButtons([`<button class="table-button" data-action="open-packaging-doc" data-id="${packaging.id}">Print Packaging</button>`])}
      `;
      packagingList.appendChild(node);
    });
  }
}

function quoteStatusClass(status) {
  if (status === "Quoted" || status === "Closed") return "good";
  if (status === "Needs Clarification") return "low";
  return "pending";
}

function renderQuotes() {
  if (!quoteRequestList) return;
  quoteRequestList.innerHTML = "";
  const quotes = state.quoteRequests || [];
  const manageQuotes = can("quotes.manage");
  if (!quotes.length) {
    quoteRequestList.innerHTML = '<div class="empty-state">No quote requests have been submitted yet.</div>';
    return;
  }

  quotes.forEach((quote) => {
    const estimate = `${quote.estimateCurrency || "INR"} ${Number(quote.estimateLow || 0).toLocaleString("en-IN")} - ${Number(
      quote.estimateHigh || 0,
    ).toLocaleString("en-IN")}`;
    const node = document.createElement("div");
    node.className = "list-item";
    node.innerHTML = `
      <div class="list-title-row">
        <h3>${escapeHtml(quote.referenceCode)} • ${escapeHtml(quote.name)}</h3>
        <span class="status-badge ${quoteStatusClass(quote.status)}">${escapeHtml(quote.status)}</span>
      </div>
      <p>${escapeHtml(quote.company || "Independent buyer")} • ${escapeHtml(quote.process)} • ${escapeHtml(quote.originalName)}</p>
      <div class="list-meta">
        <span class="pill">${escapeHtml(quote.email)}</span>
        <span class="pill">Qty ${escapeHtml(quote.quantity)}</span>
        <span class="pill">${escapeHtml(quote.material || "Material TBD")}</span>
        <span class="pill">${escapeHtml(estimate)}</span>
        <span class="pill">${escapeHtml(quote.estimatedLeadDays)} day lead</span>
      </div>
      ${quote.notes ? `<p class="notes-line">${escapeHtml(quote.notes)}</p>` : ""}
      ${manageQuotes && quote.adminNotes ? `<p class="notes-line"><strong>Internal:</strong> ${escapeHtml(quote.adminNotes)}</p>` : ""}
      ${actionButtons([
        manageQuotes ? `<button class="table-button" data-action="review-quote" data-id="${quote.id}">Review</button>` : "",
        manageQuotes && quote.process === "Injection Molding"
          ? `<button class="table-button secondary" data-action="open-quote-dfm" data-id="${quote.id}">DFM Analysis</button>`
          : "",
        `<button class="table-button" data-action="open-quote-file" data-id="${quote.id}">Open File</button>`,
      ].filter(Boolean))}
    `;
    quoteRequestList.appendChild(node);
  });

  const selectedQuote =
    quotes.find((quote) => quote.id === quoteRequestSelect?.value) ||
    quotes[0];
  if (selectedQuote && quoteRequestSelect) {
    quoteRequestSelect.value = selectedQuote.id;
    if (quoteStatusSelect) quoteStatusSelect.value = selectedQuote.status || "New";
    if (quoteAdminNotes) quoteAdminNotes.value = selectedQuote.adminNotes || "";
  }
}

function renderSelects() {
  renderPublicQuoteConfigurator();
  fillSelect(supplierSelect, state.supplierOptions || [], (item) => item.name);
  fillSelect(inventoryCustomerSelect, state.customers || [], (item) => item.name, true);
  fillProjectSelect(inventoryProjectSelect, inventoryCustomerSelect.value, true);
  fillSelect(supplierCustomerSelect, state.customers || [], (item) => item.name, true);
  fillProjectSelect(supplierProjectSelect, supplierCustomerSelect.value, true);
  fillSelect(poSupplierSelect, state.supplierOptions || [], (item) => item.name);
  fillSelect(poCustomerSelect, state.customers || [], (item) => item.name, true);
  fillProjectSelect(poProjectSelect, poCustomerSelect.value, true);
  fillSelect(projectCustomerSelect, state.customers || [], (item) => item.name, true);
  fillSelect(projectServiceSelect, state.services || [], (item) => item.name, true, "Choose a service");
  renderProjectServiceSelection();
  fillSelect(itemSelect, state.inventory, (item) => `${item.name} (${item.quantity} ${item.unit})`);
  fillSelect(poInventorySelect, state.inventory, (item) => `${item.name} • ${item.sku}`);
  fillSelect(challanPoSelect, state.purchaseOrders, (item) => `${item.poNumber} • ${item.supplier?.name || "No supplier"}`, true);
  fillSelect(challanCustomerSelect, state.customers || [], (item) => item.name, true);
  fillProjectSelect(challanProjectSelect, challanCustomerSelect.value, true);
  fillSelect(packagingChallanSelect, state.deliveryChallans, (item) => `${item.challanNumber} • ${item.recipientCompany}`);
  fillSelect(packagingCustomerSelect, state.customers || [], (item) => item.name, true);
  fillProjectSelect(packagingProjectSelect, packagingCustomerSelect.value, true);
  fillSelect(quoteRequestSelect, state.quoteRequests || [], (item) => `${item.referenceCode} • ${item.process}`, true, "Choose a quote request");

  const selectedItem = state.inventory[0];
  if (selectedItem) {
    purchaseOrderForm.cost.value = selectedItem.cost;
  }
}

function renderApp() {
  renderUser();
  renderWorkspaceDetails();
  renderPermissions();
  renderTabs();
  renderActionVisibility();
  renderMetrics();
  renderSelects();
  renderLowStock();
  renderMovements();
  renderInventoryTable();
  renderQuotes();
  renderSuppliers();
  renderPurchaseOrders();
  renderProjects();
  renderReports();
  renderProfile();
  renderUsers();
  renderLogistics();
  renderBlogs();
  renderSupplierEditor();
  renderBankEditor();
  renderInventoryEditor();
  renderPurchaseOrderEditor();
  setActiveTab(state.activeTab);
}

async function reloadData() {
  const data = await api("/api/bootstrap");
  Object.assign(state, data);
  ensureActiveTab();
  if (canScreen("suppliers")) {
    await loadSuppliers(true);
  }
  if (state.selectedProjectId) {
    const stillExists = (state.projects || []).some((project) => project.id === state.selectedProjectId);
    if (stillExists) {
      await loadProjectDocuments(state.selectedProjectId);
    } else {
      state.selectedProjectId = "";
      state.selectedProjectDocumentId = "";
      state.projectDocuments = [];
    }
  }
  renderApp();
}

async function loadProjectDocuments(projectId) {
  if (!projectId) {
    state.projectDocuments = [];
    state.selectedProjectDocumentId = "";
    return;
  }
  const data = await api(`/api/projects/${projectId}/documents`);
  state.projectDocuments = data.documents || [];
  if (!state.projectDocuments.some((document) => document.id === state.selectedProjectDocumentId)) {
    state.selectedProjectDocumentId = state.projectDocuments[0]?.id || "";
  }
}

async function runSupplierAssistant() {
  const requirement = supplierRequirementInput.value.trim();
  if (!requirement) {
    supplierAssistantSummary.textContent = "Add a requirement first so I can shortlist vendors.";
    return;
  }
  state.supplierRequirement = requirement;
  state.supplierScope = supplierScopeSelect.value;
  const data = await api("/api/supplier-assistant", {
    method: "POST",
    body: JSON.stringify({
      requirement,
      scope: state.supplierScope,
    }),
  });
  state.suppliers = data.suppliers;
  state.supplierTotalCount = data.totalCount;
  state.onlineVendors = data.onlineVendors || [];
  state.suppliersLoaded = true;
  state.supplierAssistantSummary = [
    data.assistantMode === "openai" && data.assistantModel
      ? `OpenAI copilot is active with ${data.assistantModel}.`
      : "",
    data.message,
    data.onlineNote,
  ]
    .filter(Boolean)
    .join(" ");
  renderSuppliers();
}

function promptEditInventory(item) {
  return {
    name: item.name || "",
    sku: item.sku || "",
    category: item.category || "",
    customerId: item.customerId || "",
    projectId: item.projectId || "",
    quantity: Number(item.quantity || 0),
    threshold: Number(item.threshold || 0),
    cost: Number(item.cost || 0),
    supplierId: item.supplierId || "",
    location: item.location || "",
    unit: item.unit || "pcs",
  };
}

function promptEditSupplier(supplier) {
  return {
    name: supplier.name || "",
    customerId: supplier.customerId || "",
    projectId: supplier.projectId || "",
    industry: supplier.industry || "General",
    approvalStatus: supplier.approvalStatus || "Not Approved",
    contactPerson: supplier.contactPerson || "",
    city: supplier.city || "",
    email: supplier.email || "",
    phone: supplier.phone || "",
    leadTimeDays: Number(supplier.leadTimeDays || 0),
    rating: Number(supplier.rating || 0),
  };
}

function promptIndustryChange(supplier) {
  return {
    ...promptEditSupplier(supplier),
    industry: supplier.industry || "General",
  };
}

function promptBankDetails(supplier) {
  const current = supplier.bankDetails || {};
  return {
    accountName: current.accountName || supplier.name || "",
    bankName: current.bankName || "",
    accountNumber: current.accountNumber || "",
    ifscCode: current.ifscCode || "",
    branch: current.branch || "",
    notes: current.notes || "",
  };
}

function promptEditPurchaseOrder(order) {
  return {
    supplierId: order.supplierId || "",
    customerId: order.customerId || "",
    projectId: order.projectId || "",
    quantity: Number(order.items?.[0]?.quantity || 0),
    cost: Number(order.items?.[0]?.cost || 0),
    status: order.status || "Pending",
    orderDate: order.orderDate || "",
    expectedDate: order.expectedDate || "",
    notes: order.notes || "",
  };
}

function promptEditUser(user) {
  const name = window.prompt("Name", user.name);
  if (name === null) return null;
  const email = window.prompt("Email", user.email);
  if (email === null) return null;
  const role = window.prompt("Role (Admin, Operations, Procurement)", user.role);
  if (role === null) return null;
  const password = window.prompt("New password (leave blank to keep current)", "");
  if (password === null) return null;
  return { name, email, role, password };
}

function openDocument(path) {
  const link = document.createElement("a");
  link.href = path;
  link.target = "_blank";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

supplierEditorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supplierId = state.supplierEditor.supplierId;
  if (!supplierId) return;
  const formData = new FormData(supplierEditorForm);
  try {
    await api(`/api/suppliers/${supplierId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: String(formData.get("name") || "").trim(),
        customerId: String(formData.get("customerId") || ""),
        projectId: String(formData.get("projectId") || ""),
        industry: String(formData.get("industry") || "General").trim() || "General",
        approvalStatus: String(formData.get("approvalStatus") || "Not Approved").trim() || "Not Approved",
        contactPerson: String(formData.get("contactPerson") || "").trim(),
        city: String(formData.get("city") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        leadTimeDays: Number(formData.get("leadTimeDays") || 0),
        rating: Number(formData.get("rating") || 0),
      }),
    });
    closeSupplierEditor();
    await reloadData();
    flashMessage("Supplier updated.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

bankDetailsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const supplierId = state.bankEditor.supplierId;
  if (!supplierId) return;
  const formData = new FormData(bankDetailsForm);
  try {
    await api(`/api/suppliers/${supplierId}/bank-details`, {
      method: "PUT",
      body: JSON.stringify({
        accountName: String(formData.get("accountName") || "").trim(),
        bankName: String(formData.get("bankName") || "").trim(),
        accountNumber: String(formData.get("accountNumber") || "").trim(),
        ifscCode: String(formData.get("ifscCode") || "").trim(),
        branch: String(formData.get("branch") || "").trim(),
        notes: String(formData.get("notes") || "").trim(),
      }),
    });
    closeBankEditor();
    await reloadData();
    flashMessage("Supplier bank details updated.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

inventoryEditorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const inventoryId = state.inventoryEditor.inventoryId;
  if (!inventoryId) return;
  const formData = new FormData(inventoryEditorForm);
  try {
    await api(`/api/inventory/${inventoryId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: String(formData.get("name") || "").trim(),
        sku: String(formData.get("sku") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        customerId: String(formData.get("customerId") || ""),
        projectId: String(formData.get("projectId") || ""),
        quantity: Number(formData.get("quantity") || 0),
        threshold: Number(formData.get("threshold") || 0),
        cost: Number(formData.get("cost") || 0),
        supplierId: String(formData.get("supplierId") || ""),
        location: String(formData.get("location") || "").trim(),
        unit: String(formData.get("unit") || "pcs").trim() || "pcs",
      }),
    });
    closeInventoryEditor();
    await reloadData();
    flashMessage("Inventory item updated.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

purchaseOrderEditorForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const orderId = state.purchaseOrderEditor.orderId;
  if (!orderId) return;
  const formData = new FormData(purchaseOrderEditorForm);
  try {
    await api(`/api/purchase-orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify({
        supplierId: String(formData.get("supplierId") || ""),
        customerId: String(formData.get("customerId") || ""),
        projectId: String(formData.get("projectId") || ""),
        quantity: Number(formData.get("quantity") || 0),
        cost: Number(formData.get("cost") || 0),
        status: String(formData.get("status") || "Pending"),
        orderDate: String(formData.get("orderDate") || ""),
        expectedDate: String(formData.get("expectedDate") || ""),
        notes: String(formData.get("notes") || "").trim(),
      }),
    });
    closePurchaseOrderEditor();
    await reloadData();
    flashMessage("Purchase order updated.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

closeSupplierEditorButton.addEventListener("click", closeSupplierEditor);
cancelSupplierEditorButton.addEventListener("click", closeSupplierEditor);
supplierEditorModal.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action='close-supplier-modal']");
  if (!target) return;
  closeSupplierEditor();
});
closeBankDetailsButton.addEventListener("click", closeBankEditor);
cancelBankDetailsButton.addEventListener("click", closeBankEditor);
bankDetailsModal.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action='close-bank-modal']");
  if (!target) return;
  closeBankEditor();
});
closeWorkspaceDetailsButton.addEventListener("click", closeWorkspaceDetails);
workspaceDetailsButton.addEventListener("click", openWorkspaceDetails);
workspaceProfileButton.addEventListener("click", () => {
  closeWorkspaceDetails();
  setActiveTab("profile");
  panels.profile?.scrollIntoView({ block: "start", behavior: "smooth" });
});
workspaceDetailsModal.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action='close-workspace-modal']");
  if (!target) return;
  closeWorkspaceDetails();
});
closeInventoryEditorButton.addEventListener("click", closeInventoryEditor);
cancelInventoryEditorButton.addEventListener("click", closeInventoryEditor);
inventoryEditorModal.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action='close-inventory-modal']");
  if (!target) return;
  closeInventoryEditor();
});
closePurchaseOrderEditorButton.addEventListener("click", closePurchaseOrderEditor);
cancelPurchaseOrderEditorButton.addEventListener("click", closePurchaseOrderEditor);
purchaseOrderEditorModal.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action='close-po-modal']");
  if (!target) return;
  closePurchaseOrderEditor();
});
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.purchaseOrderEditor.open) closePurchaseOrderEditor();
  if (state.inventoryEditor.open) closeInventoryEditor();
  if (state.bankEditor.open) closeBankEditor();
  if (state.supplierEditor.open) closeSupplierEditor();
  if (state.workspaceDetailsOpen) closeWorkspaceDetails();
  hideTabTooltip();
});

window.addEventListener("scroll", hideTabTooltip, true);
window.addEventListener("resize", hideTabTooltip);
document.addEventListener("fullscreenchange", updateProjectDocumentFullscreenButton);

quoteProcessGrid?.addEventListener("click", (event) => {
  const button = event.target.closest(".quote-process-card");
  if (!button) return;
  publicQuoteProcess.value = button.dataset.process || "CNC Machining";
  state.quoteEntryProcess = publicQuoteProcess.value;
  if (publicQuoteProcessDisplay) publicQuoteProcessDisplay.value = publicQuoteProcess.value;
  renderPublicQuoteConfigurator();
});

publicQuoteOptionFields?.addEventListener("change", (event) => {
  if (event.target?.name === "materialFamily") {
    renderPublicQuoteOptionFields();
  }
});

publicQuoteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const file = publicQuoteFile.files?.[0];
    if (!file) {
      setPublicQuoteState("Choose a STEP, STL, drawing, or RFQ package first.", false, true);
      return;
    }
    if (file.size > 45 * 1024 * 1024) {
      setPublicQuoteState("This file is too large. Please keep uploads below 45 MB.", false, true);
      return;
    }

    const formData = new FormData(publicQuoteForm);
    const optionSelections = getCurrentPublicQuoteSelections();
    setPublicQuoteState(`Preparing ${file.name} (${formatBytes(file.size)})...`, true);
    const payload = {
      ...Object.fromEntries(formData.entries()),
      optionSelections,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      contentBase64: await readFileAsBase64(file),
    };
    setPublicQuoteState(`Uploading ${file.name}...`, true);
    const response = await api("/api/public/quote-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    renderPublicQuoteResult(response.quoteRequest);
    publicQuoteForm.reset();
    renderPublicQuoteConfigurator();
    prefillCustomerQuoteForm();
    setPublicQuoteState("Quote request submitted successfully.");
  } catch (error) {
    setPublicQuoteState(error.message, false, true);
  }
});

publicQuoteResult?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='review-quote-result']");
  if (!button?.dataset.id) return;
  if (isCustomerUser() && canScreen("requests")) {
    setActiveTab("requests");
    return;
  }
  window.open(`/quote-review.html?id=${encodeURIComponent(button.dataset.id)}`, "_blank", "noopener,noreferrer");
});

landingProcessGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-landing-process]");
  if (!button) return;
  syncLandingProcess(button.dataset.landingProcess || "CNC Machining");
});

customerAccessForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  customerAccessError.textContent = "";
  const formData = new FormData(customerAccessForm);
  const selectedProcess = String(formData.get("process") || state.quoteEntryProcess || "CNC Machining");
  try {
    customerAccessSubmitButton.disabled = true;
    customerAccessSubmitButton.textContent = "Creating account...";
    const signupResult = await api("/api/auth/customer-signup", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        company: formData.get("company"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        password: formData.get("password"),
      }),
    });
    if (signupResult.token) {
      state.token = signupResult.token;
      localStorage.setItem("bw_token", signupResult.token);
    }
    state.quoteEntryProcess = selectedProcess;
    customerAccessForm.reset();
    syncLandingProcess(selectedProcess);
    await bootstrap();
  } catch (error) {
    customerAccessError.textContent = error.message;
  } finally {
    customerAccessSubmitButton.disabled = false;
    customerAccessSubmitButton.textContent = "Create Account And Start Quote";
  }
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const formData = new FormData(loginForm);
  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
    });
    if (result.token) {
      state.token = result.token;
      localStorage.setItem("bw_token", result.token);
    }
    loginForm.reset();
    await bootstrap();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutButton.addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST" }); } catch (_) {}
  state.token = null;
  localStorage.removeItem("bw_token");
  closeWorkspaceDetails();
  state.user = null;
  showLogin();
});

tabsRoot?.addEventListener("click", async (event) => {
  const tab = event.target.closest(".tab[data-tab]");
  if (!tab) return;
  setActiveTab(tab.dataset.tab);
  if (tab.dataset.tab === "suppliers") {
    await loadSuppliers(true);
    renderSuppliers();
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("mouseenter", () => showTabTooltip(tab));
  tab.addEventListener("mouseleave", hideTabTooltip);
  tab.addEventListener("focus", () => showTabTooltip(tab));
  tab.addEventListener("blur", hideTabTooltip);
});

authModeTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.authView || "signup"));
});

authModeLinks.forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authViewTarget || "signup"));
});

syncLandingProcess(state.quoteEntryProcess);
setAuthMode("signup");

inventoryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/inventory", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(inventoryForm).entries())) });
    inventoryForm.reset();
    inventoryForm.quantity.value = 0;
    inventoryForm.threshold.value = 10;
    inventoryForm.unit.value = "pcs";
    await reloadData();
    flashMessage("Inventory item created.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/customers", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(customerForm).entries())) });
    customerForm.reset();
    await reloadData();
    flashMessage("Customer created.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = Object.fromEntries(new FormData(projectForm).entries());
    payload.serviceIds = getSelectedProjectServiceIds();
    await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
    projectForm.reset();
    state.projectServiceSelection = [];
    projectServiceIds.value = "";
    renderProjectServiceSelection();
    await reloadData();
    flashMessage("Project created.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

serviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/services", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(serviceForm).entries())) });
    serviceForm.reset();
    await reloadData();
    flashMessage("Service created.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

projectDocumentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    if (!state.selectedProjectId) {
      setProjectDocumentUploadState("Select a project before uploading a document.", false, true);
      flashMessage("Select a project first.", true);
      return;
    }
    const file = projectDocumentFile.files?.[0];
    if (!file) {
      setProjectDocumentUploadState("Choose a file to upload.", false, true);
      flashMessage("Choose a file to upload.", true);
      return;
    }
    if (file.size > 45 * 1024 * 1024) {
      setProjectDocumentUploadState("This file is too large. Please keep uploads below 45 MB.", false, true);
      flashMessage("File is too large. Keep uploads below 45 MB.", true);
      return;
    }
    setProjectDocumentUploadState(`Preparing ${file.name} (${formatBytes(file.size)})...`, true, false);
    const formData = new FormData(projectDocumentForm);
    const payload = {
      category: formData.get("category"),
      title: formData.get("title"),
      notes: formData.get("notes"),
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      contentBase64: await readFileAsBase64(file),
    };
    setProjectDocumentUploadState(`Uploading ${file.name}...`, true, false);
    await api(`/api/projects/${state.selectedProjectId}/documents`, { method: "POST", body: JSON.stringify(payload) });
    projectDocumentForm.reset();
    await loadProjectDocuments(state.selectedProjectId);
    await reloadData();
    setProjectDocumentUploadState("Document uploaded successfully.");
    flashMessage("Project document uploaded.");
  } catch (error) {
    setProjectDocumentUploadState(error.message, false, true);
    flashMessage(error.message, true);
    return;
  }
  setProjectDocumentUploadState("Select a file to upload another document.");
});

addProjectServiceButton.addEventListener("click", () => {
  const serviceId = projectServiceSelect.value;
  if (!serviceId) return;
  if (!state.projectServiceSelection.includes(serviceId)) {
    state.projectServiceSelection.push(serviceId);
  }
  projectServiceSelect.value = "";
  renderProjectServiceSelection();
});

projectSelectedServices.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="remove-project-service"]');
  if (!button) return;
  state.projectServiceSelection = state.projectServiceSelection.filter((serviceId) => serviceId !== button.dataset.id);
  renderProjectServiceSelection();
});

openProjectCreateButton?.addEventListener("click", () => {
  setActiveTab("projects");
  projectNameInput?.focus();
  projectNameInput?.scrollIntoView({ block: "center", behavior: "smooth" });
});

projectTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest('[data-action="select-project"]');
  if (!button) return;
  state.selectedProjectId = button.dataset.id;
  await loadProjectDocuments(state.selectedProjectId);
  renderApp();
  setActiveTab("projectWorkspace");
});

projectDocumentFullscreenButton?.addEventListener("click", async () => {
  try {
    await toggleProjectDocumentFullscreen();
  } catch (error) {
    flashMessage(error.message || "Could not open fullscreen preview.", true);
  }
});

projectDocumentTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const document = state.projectDocuments.find((entry) => entry.id === button.dataset.id);
  if (!document) return;
  if (button.dataset.action === "preview-project-document") {
    state.selectedProjectDocumentId = document.id;
    renderProjects();
  }
  if (button.dataset.action === "open-project-document") {
    openDocument(document.fileUrl);
  }
});

movementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/inventory/adjust", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(movementForm).entries())) });
    movementForm.reset();
    movementForm.quantity.value = 1;
    await reloadData();
    flashMessage("Stock movement recorded.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

supplierForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/suppliers", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(supplierForm).entries())) });
    supplierForm.reset();
    supplierForm.industry.value = "";
    supplierForm.rating.value = 4.5;
    await reloadData();
    flashMessage("Supplier added.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

purchaseOrderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/purchase-orders", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(purchaseOrderForm).entries())) });
    purchaseOrderForm.reset();
    setPurchaseOrderDefaults();
    await reloadData();
    flashMessage("Purchase order created.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);
  const payload = { name: formData.get("name"), password: formData.get("password") };
  try {
    await api("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
    profileForm.password.value = "";
    await reloadData();
    flashMessage("Profile updated.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/users", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(userForm).entries())) });
    userForm.reset();
    userForm.password.value = "welcome123";
    await reloadData();
    flashMessage("User created.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

challanForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/delivery-challans", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(challanForm).entries())) });
    challanForm.reset();
    await reloadData();
    flashMessage("Delivery challan created.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

packagingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/packaging-documents", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(packagingForm).entries())) });
    packagingForm.reset();
    packagingForm.packageCount.value = 1;
    packagingForm.grossWeight.value = 0;
    packagingForm.netWeight.value = 0;
    await reloadData();
    flashMessage("Packaging document created.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

quoteReviewForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(quoteReviewForm);
  const quoteId = String(formData.get("quoteId") || "");
  if (!quoteId) {
    flashMessage("Choose a quote request first.", true);
    return;
  }
  try {
    await api(`/api/quote-requests/${quoteId}`, {
      method: "PUT",
      body: JSON.stringify({
        status: String(formData.get("status") || "New"),
        adminNotes: String(formData.get("adminNotes") || "").trim(),
      }),
    });
    await reloadData();
    flashMessage("Quote request updated.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

purchaseOrderList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === "receive-po") {
      await api("/api/purchase-orders/receive", { method: "POST", body: JSON.stringify({ orderId: id }) });
      await reloadData();
      flashMessage("Purchase order received and inventory updated.");
    }
    if (action === "edit-po") {
      openPurchaseOrderEditor(id);
      return;
    }
    if (action === "delete-po") {
      if (!window.confirm("Delete this purchase order?")) return;
      await api(`/api/purchase-orders/${id}`, { method: "DELETE" });
      await reloadData();
      flashMessage("Purchase order deleted.");
    }
    if (action === "open-po-doc") openDocument(`/api/documents/purchase-order/${id}`);
    if (action === "open-invoice-doc") openDocument(`/api/documents/invoice/${id}`);
    if (action === "open-grn-doc") openDocument(`/api/documents/grn/${id}`);
  } catch (error) {
    flashMessage(error.message, true);
  }
});

quoteRequestList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const quote = state.quoteRequests.find((entry) => entry.id === button.dataset.id);
  if (!quote) return;
  if (button.dataset.action === "review-quote") {
    window.open(`/quote-review.html?id=${encodeURIComponent(quote.id)}`, "_blank", "noopener,noreferrer");
    return;
  }
  if (button.dataset.action === "open-quote-dfm") {
    window.open(`/quote-dfm.html?id=${encodeURIComponent(quote.id)}`, "_blank", "noopener,noreferrer");
    return;
  }
  if (button.dataset.action === "select-quote") {
    quoteRequestSelect.value = quote.id;
    quoteStatusSelect.value = quote.status || "New";
    quoteAdminNotes.value = quote.adminNotes || "";
    return;
  }
  if (button.dataset.action === "open-quote-file") {
    openDocument(quote.fileUrl);
  }
});

blogList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='select-blog']");
  if (!button) return;
  state.selectedBlogSlug = button.dataset.slug;
  renderBlogs();
});

if (permissionSummary) {
  permissionSummary.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "go-profile") {
      setActiveTab("profile");
    }
    if (button.dataset.action === "go-tab") {
      setActiveTab(button.dataset.tab);
    }
  });
}

metricsRoot.addEventListener("click", (event) => {
  const card = event.target.closest(".metric-card[data-tab]");
  if (!card) return;
  setActiveTab(card.dataset.tab);
});

metricsRoot.addEventListener("keydown", (event) => {
  const card = event.target.closest(".metric-card[data-tab]");
  if (!card) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  setActiveTab(card.dataset.tab);
});

supplierTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === "change-industry") {
      openSupplierEditor(id, "industry");
      return;
    }
    if (action === "bank-supplier") {
      openBankEditor(id);
      return;
    }
    if (action === "edit-supplier") {
      openSupplierEditor(id, "name");
      return;
    }
    if (action === "delete-supplier") {
      if (!window.confirm("Delete this supplier?")) return;
      await api(`/api/suppliers/${id}`, { method: "DELETE" });
      await reloadData();
      flashMessage("Supplier deleted.");
    }
  } catch (error) {
    flashMessage(error.message, true);
  }
});

supplierIndustryFilters.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='filter-suppliers']");
  if (!button) return;
  state.supplierIndustryFilter = button.dataset.industry;
  await loadSuppliers(true);
  renderSuppliers();
});

supplierApprovalFilters.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='filter-suppliers-approval']");
  if (!button) return;
  state.supplierApprovalFilter = button.dataset.approval;
  await loadSuppliers(true);
  renderSuppliers();
});

supplierGroupingButton.addEventListener("click", () => {
  state.supplierGrouped = !state.supplierGrouped;
  renderSupplierFilters();
  renderSuppliers();
});

supplierAssistantForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await runSupplierAssistant();
  } catch (error) {
    supplierAssistantSummary.textContent = error.message;
  }
});

resetSupplierSearchButton.addEventListener("click", async () => {
  state.supplierRequirement = "";
  state.supplierScope = "local";
  state.supplierAssistantSummary = "";
  state.onlineVendors = [];
  await loadSuppliers(true);
  renderSuppliers();
});

showMoreSuppliersButton.addEventListener("click", async () => {
  state.supplierVisibleCount += 12;
  if (state.supplierRequirement) {
    await runSupplierAssistant();
  } else {
    await loadSuppliers();
    renderSuppliers();
  }
});

inventoryTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === "edit-inventory") {
      openInventoryEditor(id);
      return;
    }
    if (action === "delete-inventory") {
      if (!window.confirm("Delete this inventory item?")) return;
      await api(`/api/inventory/${id}`, { method: "DELETE" });
      await reloadData();
      flashMessage("Inventory item deleted.");
    }
  } catch (error) {
    flashMessage(error.message, true);
  }
});

userList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action !== "edit-user") return;
  try {
    const payload = promptEditUser(state.users.find((entry) => entry.id === id));
    if (!payload) return;
    await api(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    await reloadData();
    flashMessage("User updated.");
  } catch (error) {
    flashMessage(error.message, true);
  }
});

challanList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "open-challan-doc") {
    openDocument(`/api/documents/delivery-challan/${button.dataset.id}`);
  }
});

packagingList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "open-packaging-doc") {
    openDocument(`/api/documents/packaging-document/${button.dataset.id}`);
  }
});

workspaceSearchInput?.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  await runWorkspaceSearch();
});

workspaceSearchInput?.addEventListener("input", () => {
  queueWorkspaceSearch();
});

inventorySearchInput?.addEventListener("input", renderInventoryTable);

inventoryCustomerSelect.addEventListener("change", () => fillProjectSelect(inventoryProjectSelect, inventoryCustomerSelect.value, true));
supplierCustomerSelect.addEventListener("change", () => fillProjectSelect(supplierProjectSelect, supplierCustomerSelect.value, true));
poCustomerSelect.addEventListener("change", () => fillProjectSelect(poProjectSelect, poCustomerSelect.value, true));
challanCustomerSelect.addEventListener("change", () => fillProjectSelect(challanProjectSelect, challanCustomerSelect.value, true));
packagingCustomerSelect.addEventListener("change", () => fillProjectSelect(packagingProjectSelect, packagingCustomerSelect.value, true));
supplierEditorCustomerSelect.addEventListener("change", () => fillProjectSelect(supplierEditorProjectSelect, supplierEditorCustomerSelect.value, true));
inventoryEditorCustomerSelect.addEventListener("change", () => fillProjectSelect(inventoryEditorProjectSelect, inventoryEditorCustomerSelect.value, true));
purchaseOrderEditorCustomerSelect.addEventListener("change", () => fillProjectSelect(purchaseOrderEditorProjectSelect, purchaseOrderEditorCustomerSelect.value, true));
inventoryProjectSelect.addEventListener("change", () => syncCustomerProject(inventoryCustomerSelect, inventoryProjectSelect));
supplierProjectSelect.addEventListener("change", () => syncCustomerProject(supplierCustomerSelect, supplierProjectSelect));
poProjectSelect.addEventListener("change", () => syncCustomerProject(poCustomerSelect, poProjectSelect));
challanProjectSelect.addEventListener("change", () => syncCustomerProject(challanCustomerSelect, challanProjectSelect));
packagingProjectSelect.addEventListener("change", () => syncCustomerProject(packagingCustomerSelect, packagingProjectSelect));
supplierEditorProjectSelect.addEventListener("change", () => syncCustomerProject(supplierEditorCustomerSelect, supplierEditorProjectSelect));
inventoryEditorProjectSelect.addEventListener("change", () => syncCustomerProject(inventoryEditorCustomerSelect, inventoryEditorProjectSelect));
purchaseOrderEditorProjectSelect.addEventListener("change", () => syncCustomerProject(purchaseOrderEditorCustomerSelect, purchaseOrderEditorProjectSelect));

poInventorySelect.addEventListener("change", () => {
  const selected = state.inventory.find((item) => item.id === poInventorySelect.value);
  if (selected) {
    purchaseOrderForm.cost.value = selected.cost;
    if (!poSupplierSelect.value && selected.supplierId) poSupplierSelect.value = selected.supplierId;
    if (selected.customerId) {
      poCustomerSelect.value = selected.customerId;
      fillProjectSelect(poProjectSelect, selected.customerId, true);
    }
    if (selected.projectId) poProjectSelect.value = selected.projectId;
  }
});

challanPoSelect.addEventListener("change", () => {
  const selected = state.purchaseOrders.find((item) => item.id === challanPoSelect.value);
  if (!selected) return;
  if (selected.customerId) {
    challanCustomerSelect.value = selected.customerId;
    fillProjectSelect(challanProjectSelect, selected.customerId, true);
  }
  if (selected.projectId) challanProjectSelect.value = selected.projectId;
});

packagingChallanSelect.addEventListener("change", () => {
  const selected = state.deliveryChallans.find((item) => item.id === packagingChallanSelect.value);
  if (!selected) return;
  if (selected.customerId) {
    packagingCustomerSelect.value = selected.customerId;
    fillProjectSelect(packagingProjectSelect, selected.customerId, true);
  }
  if (selected.projectId) packagingProjectSelect.value = selected.projectId;
});

quoteRequestSelect?.addEventListener("change", () => {
  const quote = state.quoteRequests.find((entry) => entry.id === quoteRequestSelect.value);
  if (!quote) return;
  quoteStatusSelect.value = quote.status || "New";
  quoteAdminNotes.value = quote.adminNotes || "";
});

exportReportButton.addEventListener("click", () => openDocument("/api/documents/inventory-report"));

function setPurchaseOrderDefaults() {
  purchaseOrderForm.orderDate.value = new Date().toISOString().slice(0, 10);
  purchaseOrderForm.expectedDate.value = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10);
  purchaseOrderForm.quantity.value = 1;
}

setPurchaseOrderDefaults();

// ── Theme (light/dark) toggle ────────────────────────────────────────
(function initTheme() {
  const THEME_KEY = "bw_theme";
  const root = document.documentElement;
  const btn = document.getElementById("themeToggleBtn");

  // Apply persisted theme on load (default is dark)
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light") root.setAttribute("data-theme", "light");

  if (btn) {
    btn.addEventListener("click", () => {
      const isLight = root.getAttribute("data-theme") === "light";
      if (isLight) {
        root.removeAttribute("data-theme");
        localStorage.setItem(THEME_KEY, "dark");
      } else {
        root.setAttribute("data-theme", "light");
        localStorage.setItem(THEME_KEY, "light");
      }
    });
  }
})();

// Load quote config early — public endpoint, no auth needed
// Powers the process/material/option dropdowns on the landing quote form
fetch("/api/quote-config")
  .then((r) => r.json())
  .then((data) => {
    if (data.quoteConfig) {
      state.quoteConfig = data.quoteConfig;
      renderPublicQuoteConfigurator();
    }
  })
  .catch(() => {});

bootstrap().catch((error) => {
  loginError.textContent = error.message;
  showLogin();
});
