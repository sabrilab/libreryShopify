/* ==========================================================================
   LIBRERY — données du site (v2, d'après le catalogue A4 v4)
   Ces objets correspondent 1:1 à ce qui sera créé dans Shopify :
   produits (+ métachamps : accroche, notes, parfumeur, matières),
   collections, métaobjets « parfumeur » et « point de vente ».
   Les prix marqués PRIX_A_CONFIRMER sont provisoires.
   ========================================================================== */

const IMG = '/assets/img/v2/';
const CATALOGUE_URL = 'https://librery-catalogue-3d.vercel.app/';
const CATALOGUE_PDF = 'https://librery-catalogue-3d.vercel.app/telechargements/LIBRERY-catalogue-doubles-pages.pdf';

/* Visuels produit : pack = flacon détouré sur fond clair (grille façon D'orsay),
   pack / pack30 = packshots studio à échelle commune (flacon ≈ 40 % du cadre),
   scene = mise en situation révélée au survol (ou `video` : boucle muette, métafield Shopify). */

/* Formats — catalogue : « Extrait de Parfum 25 % · 100 ml & 30 ml » ; échantillon 2 ml (« dès 6 € », maquette Canva). */
/* Familles olfactives (filtre Bibliothèque) — classement proposé, À VALIDER par la maison */
const FAMILIES = {
  'Gourmand': 'Vanille, caramel, praline, chocolat : des notes que l’on voudrait presque goûter.',
  'Floral': 'Rose, jasmin, tubéreuse, fleur d’oranger : le cœur fleuri de la parfumerie.',
  'Fruité': 'Baies, mangue, abricot : l’éclat juteux des fruits mûrs.',
  'Ambré': 'Ambre, résines, benjoin : une chaleur enveloppante et sensuelle.',
  'Boisé': 'Santal, cèdre, bois modernes : la structure et la profondeur.'
};

/* Services — promesses affichées partout (bandeau, fiche produit, panier) */
const SERVICES = [
  { i: 'vial', t: 'Essayez-le avant de l’ouvrir', d: 'Un échantillon 2 ml du parfum glissé avec chaque flacon : testez-le d’abord, retour gratuit si le flacon reste scellé.' },
  { i: 'vials', t: 'Deux échantillons offerts', d: 'À choisir dans la bibliothèque, avec chaque commande.' },
  { i: 'gift', t: 'Écrin & mot manuscrit', d: 'Emballage cadeau offert, message personnalisé, facture sans prix sur demande.' },
  { i: 'parcel', t: 'Livraison offerte dès 100 €', d: 'Expédition soignée depuis Paris, retours gratuits sous 30 jours.' }
];

const FORMATS = [
  { id: '100', label: '100 ml', price: 170 },
  { id: '30', label: '30 ml', price: 75 },   // PRIX_A_CONFIRMER
  { id: '2', label: '2 ml', price: 6 }
];

const PERFUMERS = {
  'chris-maurice': {
    name: 'Chris Maurice', role: 'Maître parfumeur', image: 'chris-maurice',
    works: 'Hot Sand · Mango Wave · Palmeira · Ambert Sunset',
    bio: [
      "Chris Maurice, maître parfumeur et directeur de Carbonnel S.A., est issu d’une prestigieuse lignée de parfumeurs espagnols. Plongé dès l’enfance dans l’univers des fragrances de niche, il a affiné son expertise dans la création d’essences raffinées, incarnant sa vision de la Haute Parfumerie.",
      "Grâce à une vaste expérience auprès de maisons renommées comme Xerjoff, Nishane, Fragrance Du Bois et Masque Milano, il s’est imposé comme une figure clé du secteur. Il est également le fondateur de CDe La Niche, une entreprise dédiée à la création de parfums uniques et intemporels.",
      "Ses compositions, telles que Lira, Alexandria II ou More Than Words, sont plébiscitées par les amateurs du monde entier. Son talent, sa passion et sa créativité font de lui l’un des parfumeurs les plus respectés de l’industrie."
    ]
  },
  'nathalie-feisthauer': {
    name: 'Nathalie Feisthauer', role: 'Parfumeure', image: 'nathalie-feisthauer',
    works: 'Sun Ice',
    bio: [
      "Nathalie Feisthauer a toujours été fascinée par les parfums, une passion révélée par Opium d’Yves Saint Laurent. En 1983, elle intègre l’école de parfumerie Roure à Grasse, devenant la première stagiaire sans héritage familial dans un milieu encore très fermé. Sa carrière prend son essor à New York chez Estée Lauder.",
      "Pendant plus de trente ans, elle façonne des parfums pour Hermès, Cartier ou État Libre d’Orange, au sein de Givaudan puis de Symrise. Aujourd’hui indépendante, elle a fondé LABscent à Montmartre, installant son laboratoire dans une ancienne galerie d’art.",
      "Son talent lui a valu de nombreuses distinctions, dont le prix FIFI du parfumeur de l’année en 2019."
    ]
  },
  'coralie-spicher': {
    name: 'Coralie Spicher', role: 'Parfumeure · dsm-firmenich', image: 'coralie-spicher',
    works: 'Vanilla Plum · Magnetic Flowers · Tonka Love',
    quote: "J’aime l’idée que chaque parfum puisse être une vie que je n’ai pas vécue. C’est peut-être pour cela que je fais ce métier : pour en vivre mille.",
    bio: [
      "Depuis l’enfance, Coralie Spicher entretient une relation intime avec les odeurs. Son premier souvenir olfactif — l’herbe fraîchement coupée du jardin familial, à Genève — est resté fondateur et nourrit encore son lien profond à la nature et aux matières premières.",
      "Très tôt, elle comprend que les parfums sont plus que des odeurs : des passages vers d’autres mondes. À l’adolescence, cette fascination devient une vocation. Après plusieurs années de persévérance dans l’industrie, elle intègre en 2018 l’école de parfumerie de dsm-firmenich, où elle se forme pendant trois ans auprès de Nathalie Lorson et Fabrice Pellegrin.",
      "Aujourd’hui parfumeure, Coralie puise son inspiration dans le quotidien, les voyages, la musique et les matières naturelles. Sa sensibilité se nourrit autant d’une lumière, d’une texture ou d’un instant fugace que de ses rencontres avec les producteurs et les terres où naissent les ingrédients.",
      "Son approche de la création est profondément musicale. Comme une pianiste, elle cherche une mélodie — une note centrale, intuitive, qui résonne — puis construit autour d’elle les nuances et la profondeur qui donnent au parfum toute sa dimension."
    ]
  }
};

const PRODUCTS = [
  /* ============ Skin Obsession — Collection II (nouveauté) ============ */
  {
    handle: 'vanilla-plum', folio: 39, name: 'Vanilla Plum', collection: 'skin-obsession', isNew: true, perfumer: 'coralie-spicher',
    tagline: 'L’obsession d’une douceur que l’on veut retenir.',
    keyNotes: 'Prune · Accord lait · Vanille', families: ['Gourmand', 'Ambré'],
    pack: 'vanilla-plum-pack', card: 'vanilla-plum-1', pack30: 'vanilla-plum-pack30', scene: 'vanilla-plum-2',
    gallery: ['vanilla-plum-pack', 'vanilla-plum-pack30', 'vanilla-plum-2', 'vanilla-plum-mod', 'prune-livres', 'vanilla-plum-1'],
    description: [
      "Il y a les parfums que l’on découvre. Et il y a ceux vers lesquels on se surprend à revenir.",
      "Vanilla Plum est né du désir de retrouver une sensation : celle d’un fruit mûr enveloppé dans une étreinte chaude, crémeuse et réconfortante.",
      "Dès les premières notes, la prune révèle une facette riche et concentrée, comme un fruit délicatement confit. La cannelle apporte une touche chaude et épicée, tandis que l’amande adoucit la composition de sa rondeur crémeuse.",
      "À mesure que le parfum se déploie, il se rapproche de la peau. Un accord lait velouté rencontre un cuir chaud, créant une tension inattendue entre douceur et caractère. La vanille émerge peu à peu, jusqu’à devenir le cœur de cette obsession.",
      "Dans le sillage, deux vanilles révèlent leurs facettes contrastées : la vanille de Tahiti, douce, poudrée et amandée, puis la vanille Planifolia de Madagascar, plus riche et plus profonde. Le benjoin Siam, la tonka et les bois ambrés prolongent cette chaleur."
    ],
    coda: ['Une sensation à découvrir.', 'Une empreinte à retenir.', 'Une irrésistible envie d’y revenir.'],
    notes: { tete: 'Prune, Cannelle', coeur: 'Accord lait, Cuir de Grasse, Myrrhe, Vanille de Tahiti', fond: 'Vanille Planifolia de Madagascar, Ambre, Benjoin Siam' },
    materials: {
      title: 'Entre douceur et profondeur',
      list: { tete: 'Cannelle SFE, Prune séchée STT, Amande', coeur: 'Accord lait, Cuir de Grasse, Vanille Tahitensis (infusion)', fond: 'Vanille Planifolia Madagascar SFE, Benjoin Siam, Accord tonka' },
      text: [
        "Au cœur de Vanilla Plum, deux vanilles d’exception révèlent deux facettes complémentaires de la précieuse gousse. La vanille de Tahiti apporte une expression délicate, poudrée, amandée et subtilement florale ; douce et raffinée, elle prolonge naturellement la note d’amande.",
        "À l’inverse, la vanille Planifolia de Madagascar, extraite par SFE — extraction au CO₂ supercritique —, révèle une expression plus riche et plus profonde. Ce procédé capte avec une précision remarquable les facettes naturelles de la gousse et lui donne chaleur, profondeur et densité.",
        "En ouverture, la prune séchée STT — Smell the Taste — restitue par l’odorat la richesse d’un fruit sec : une prune mûre, concentrée, presque confite. L’approche Smell the Taste de dsm-firmenich traduit l’expérience d’un ingrédient à la fois par le goût et par l’odeur.",
        "Au cœur, un accord lait apporte une texture veloutée et enveloppante ; en contraste, le cuir de Grasse introduit une facette plus chaude, plus sombre et texturée. En fond, le benjoin Siam, balsamique, vanillé et amandé, prolonge la chaleur de la composition."
      ]
    }
  },
  {
    handle: 'magnetic-flowers', folio: 41, name: 'Magnetic Flowers', collection: 'skin-obsession', isNew: true, perfumer: 'coralie-spicher',
    tagline: 'L’obsession d’une attraction florale.',
    keyNotes: 'Poire · Tubéreuse · Santal', families: ['Floral'],
    pack: 'magnetic-flowers-pack', card: 'magnetic-flowers-1', pack30: 'magnetic-flowers-pack30', scene: 'magnetic-flowers-1',
    gallery: ['magnetic-flowers-pack', 'magnetic-flowers-pack30', 'magnetic-flowers-1', 'magnetic-flowers-mod', 'poire-livres', 'magnetic-flowers-30'],
    description: [
      "Certaines fleurs sont admirées pour leur beauté. D’autres possèdent un pouvoir d’attraction presque instinctif.",
      "Magnetic Flowers est né de cette fascination : un bouquet de fleurs blanches, lumineux et opulent, dont les facettes se dévoilent lentement sur la peau.",
      "En ouverture, la poire juteuse apporte fraîcheur et lumière, tandis que la sauge sclarée introduit une note verte et aromatique. Le sésame ajoute une chaleur toastée inattendue.",
      "Puis le bouquet s’épanouit. Le néroli et la fleur d’oranger apportent éclat et fraîcheur, tandis que la tubéreuse crémeuse et le jasmin Sambac composent un cœur floral riche et enveloppant. L’ylang-ylang adoucit la composition de son caractère crémeux et exotique.",
      "En s’installant, le santal enveloppe les fleurs d’une chaleur douce et crémeuse. L’ambre approfondit le sillage, tandis que les muscs blancs laissent une impression propre et enveloppante."
    ],
    coda: ['Un bouquet qui attire.', 'Une présence qui demeure.', 'Une sensation que l’on veut revivre.'],
    notes: { tete: 'Accord poire, Sauge sclarée, Sésame', coeur: 'Accord néroli, Tubéreuse, Jasmin Sambac, Ylang-ylang, Fleur d’oranger', fond: 'Santal d’Australie, Ambre, Muscs blancs' },
    materials: {
      title: 'L’attraction des fleurs blanches',
      list: { tete: 'Accord poire, Sauge sclarée FirAbs, Sésame SFE', coeur: 'Accord néroli, Tubéreuse FirAbs, Jasmin Sambac Inde Abs, Ylang Ess, Fleur d’oranger Abs', fond: 'Santal d’Australie FirAbs, Accord ambre, Muscs blancs' },
      text: [
        "Magnetic Flowers se construit sur la tension entre la fraîcheur, les facettes vertes et l’opulence crémeuse des fleurs blanches.",
        "En ouverture, la poire apporte une fraîcheur juteuse et lumineuse. Elle rencontre la sauge sclarée FirAbs, qui introduit une dimension verte et aromatique, tandis que le sésame SFE révèle des facettes toastées, céréalières et gourmandes.",
        "Au cœur, les fleurs blanches prennent le devant de la scène. La tubéreuse FirAbs apporte un caractère crémeux, solaire et opulent ; l’absolue de jasmin Sambac d’Inde ajoute de la profondeur ; l’huile essentielle d’ylang-ylang assure une transition soyeuse vers les fleurs plus riches.",
        "En fond, le santal d’Australie FirAbs apporte une texture boisée crémeuse, lactée et chaude. L’ambre renforce la profondeur, les muscs blancs adoucissent la structure. Fraîche et chaude, verte et crémeuse, lumineuse et enveloppante : une architecture olfactive construite sur le contraste."
      ]
    }
  },
  {
    handle: 'tonka-love', folio: 43, name: 'Tonka Love', collection: 'skin-obsession', isNew: true, perfumer: 'coralie-spicher',
    tagline: 'L’irrésistible chaleur de la tonka.',
    keyNotes: 'Amande grillée · Caramel salé · Tonka', families: ['Gourmand', 'Boisé'],
    pack: 'tonka-love-pack', card: 'tonka-love-1', pack30: 'tonka-love-pack30', scene: 'tonka-love-1',
    gallery: ['tonka-love-pack', 'tonka-love-pack30', 'tonka-love-1', 'tonka-love-mod', 'tonka-capot', 'tonka-love-2'],
    description: [
      "Certains ingrédients ont une présence qui s’attarde dans la mémoire. La tonka est de ceux-là. Chaude, veloutée, naturellement addictive, elle est au cœur de Tonka Love.",
      "Le parfum s’ouvre sur l’amande grillée, à la facette chaude et toastée, éclairée par la bergamote d’Italie. Le poivre et la cardamome du Guatemala ajoutent une étincelle vive et aromatique.",
      "Puis la tonka se révèle. L’absolue de fève tonka prend le premier rôle, avec son caractère chaud, amandé et poudré. Elle fond dans un accord caramel salé riche et gourmand, tandis que la vanille renforce discrètement sa chaleur crémeuse.",
      "À mesure que la composition se déploie, le cœur gourmand rencontre une structure boisée plus profonde : Dreamwood pour la modernité, cèdre de Virginie pour la verticalité, Cashmeran pour la texture."
    ],
    coda: ['Une première impression grillée.', 'Un cœur chaud et addictif.', 'Un sillage qui reste.'],
    notes: { tete: 'Amande grillée, Bergamote d’Italie, Poivre, Cardamome du Guatemala', coeur: 'Caramel salé, Fève tonka, Vanille', fond: 'Dreamwood, Cèdre de Virginie, Cashmeran' },
    materials: {
      title: 'La signature de la tonka',
      list: { tete: 'Amande grillée STT, Bergamote Italie Ess, Poivre Ess, Cardamome Guatemala Ess', coeur: 'Caramel salé NP, Tonka Abs, Vanille', fond: 'Dreamwood®, Cèdre Virginie Ess, Cashmeran' },
      text: [
        "Tonka Love explore les multiples facettes de la tonka, de sa douceur chaude et amandée à sa profondeur poudrée et son affinité avec les bois.",
        "En ouverture, l’amande grillée STT — Smell the Taste — traduit par l’odorat l’impression d’une amande torréfiée. L’huile essentielle de bergamote d’Italie apporte l’éclat ; le poivre et la cardamome du Guatemala, distillée à partir des graines et des gousses, une vibration épicée.",
        "Au cœur, l’absolue de fève tonka, obtenue par extraction puis purification, capte le caractère riche de la fève, aux facettes de caramel, d’amande et de vanille. Sa coumarine naturelle lui donne sa chaleur poudrée caractéristique. Le caramel salé NP en amplifie la gourmandise, sa facette salée gardant la douceur en équilibre.",
        "En fond, Dreamwood® — né de la biotechnologie blanche et inspiré de la chaleur du santal — apporte une dimension boisée crémeuse et moderne ; l’essence de cèdre de Virginie donne la structure, le Cashmeran la texture."
      ]
    }
  },

  /* ============ Summer Vibes — Collection I ============ */
  {
    handle: 'hot-sand', folio: 21, name: 'Hot Sand', collection: 'summer-vibes', perfumer: 'chris-maurice',
    tagline: 'Jasmin lumineux, chocolat blanc fondant et santal crémeux, dans une gourmandise solaire et addictive.',
    keyNotes: 'Jasmin · Chocolat blanc · Santal', families: ['Gourmand', 'Floral'],
    pack: 'hot-sand-pack', card: 'hot-sand-1', pack30: 'hot-sand-pack30', scene: 'hot-sand-1',
    gallery: ['hot-sand-pack', 'hot-sand-pack30', 'hot-sand-1', 'hot-sand-mod', 'camp-colonne', 'hot-sand-30'],
    description: [
      "Hot Sand capture la douceur aérienne d’une gourmandise d’été, où le sable encore tiède caresse la peau dorée par le soleil.",
      "En tête, l’eau de jasmin et l’orchidée flottent comme un souffle léger et lumineux, tandis que la ganache de chocolat blanc, la crème chantilly et le lait d’amande fondent en un cœur délicieusement crémeux. En fond, le cèdre, le santal crémeux et le musc blanc enveloppent la peau d’une chaleur douce et réconfortante, comme le souvenir tendre d’une journée au soleil.",
      "Hot Sand invite à prolonger l’instant suspendu d’un été radieux, entre douceur et légèreté, comme un chapitre délicatement écrit sur la peau."
    ],
    notes: { tete: 'Eau de jasmin, Orchidée', coeur: 'Ganache de chocolat blanc, Crème chantilly, Lait d’amande', fond: 'Cèdre, Bois de santal, Musc blanc' }
  },
  {
    handle: 'mango-wave', folio: 23, name: 'Mango Wave', collection: 'summer-vibes', perfumer: 'chris-maurice',
    tagline: 'Mangue juteuse, framboise éclatante et ambre gourmand, dans un sillage solaire, fruité et irrésistible.',
    keyNotes: 'Mangue · Framboise · Ambre', families: ['Fruité', 'Ambré'],
    pack: 'mango-wave-pack', card: 'mango-wave-1', pack30: 'mango-wave-pack30', scene: 'mango-wave-1',
    gallery: ['mango-wave-pack', 'mango-wave-pack30', 'mango-wave-1', 'mango-wave-2', 'summer-socles', 'mango-wave-30'],
    description: [
      "Mango Wave est une vague d’énergie fruitée et de douceur gourmande. En tête, la mangue juteuse et l’orange acidulée éclatent comme un souffle lumineux, vibrant sur la peau.",
      "Le cœur, fruité et floral, mêle grenade, framboise et jasmin, esquissant la douceur d’un soir d’été suspendu entre chaleur et éclat. En fond, l’ambre, la mousse de chêne et la cassonade caramélisée composent un sillage captivant, riche et enveloppant.",
      "Mango Wave invite à vibrer, ralentir et savourer chaque instant, comme un chapitre solaire que l’on relit avec délice."
    ],
    notes: { tete: 'Mangue, Orange, Pêche, Safran', coeur: 'Grenade, Framboise, Jasmin', fond: 'Ambre, Mousse de chêne, Cassonade' }
  },
  {
    handle: 'sun-ice', folio: 25, name: 'Sun Ice', collection: 'summer-vibes', perfumer: 'nathalie-feisthauer',
    tagline: 'Pistache grillée, vanille de Tahiti et bois de santal, dans une gourmandise solaire, crémeuse et enveloppante.',
    keyNotes: 'Cassis · Pistache grillée · Vanille', families: ['Gourmand', 'Fruité'],
    pack: 'sun-ice-pack', card: 'sun-ice-1', pack30: 'sun-ice-pack30', scene: 'sun-ice-1',
    gallery: ['sun-ice-pack', 'sun-ice-pack30', 'sun-ice-1', 'sun-ice-2', 'camp-livre', 'sun-ice-30'],
    description: [
      "Sun Ice est une composition solaire, florale et gourmande, inspirée du plaisir d’une glace artisanale à la pistache, ce délice glacé qui fond lentement sous le soleil d’été, entre douceur sucrée et fraîcheur réconfortante.",
      "La fragrance s’ouvre sur une envolée pétillante de cassis et de bergamote d’Italie. Au cœur, la pomme croquante, la pistache grillée, le toffee caramélisé et l’héliotrope velouté composent une partition savoureuse, rappelant les notes dorées d’une gelateria au bord de mer.",
      "Le fond dévoile une base boisée et sensuelle, où cèdre de Virginie, vanille de Tahiti, musc, fève tonka, santal et ambre s’entrelacent — une signature qui prolonge l’empreinte d’un été infini, entre glace fondante et étreinte d’un soir d’août."
    ],
    notes: { tete: 'Cassis, Bergamote d’Italie', coeur: 'Pomme, Pistache grillée, Toffee, Héliotrope', fond: 'Cèdre de Virginie, Vanille de Tahiti, Musc, Fève tonka, Santal, Ambre' }
  },
  {
    handle: 'palmeira', folio: 27, name: 'Palmeira', collection: 'summer-vibes', perfumer: 'chris-maurice',
    tagline: 'Fruits rouges juteux, violette et rose élégante, puis praline et santal, dans un sillage fruité, floral et chaleureux.',
    keyNotes: 'Framboise · Violette · Praline', families: ['Fruité', 'Floral'],
    pack: 'palmeira-pack', card: 'palmeira-1', pack30: 'palmeira-pack30', scene: 'palmeira-1',
    gallery: ['palmeira-pack', 'palmeira-pack30', 'palmeira-1', 'palmeira-2', 'baies-colonne', 'hero-summer'],
    description: [
      "Palmeira s’ouvre comme une promenade sous les frondaisons d’un jardin d’été, où la lumière danse entre les feuilles et s’attarde sur les fruits.",
      "En tête, framboise, fraise, cassis et myrtille éclatent en un accord lumineux et juteux, comme un panier de baies fraîchement cueillies. Au cœur, un bouquet élégant de violette, rose, prune et Ambroxan apporte profondeur et sophistication, telle une lumière qui traverse les pages d’un récit d’été.",
      "En fond, la praline gourmande, le santal velouté et le musc blanc soyeux créent un sillage chaleureux et enveloppant, comme le souvenir d’un après-midi suspendu entre rêve et réalité."
    ],
    notes: { tete: 'Framboise, Fraise, Cassis, Myrtille', coeur: 'Violette, Rose, Prune, Ambroxan', fond: 'Praline, Bois de santal, Musc blanc' }
  },
  {
    handle: 'ambert-sunset', folio: 29, name: 'Ambert Sunset', collection: 'summer-vibes', perfumer: 'chris-maurice',
    tagline: 'Abricot doré, safran et osmanthus, puis rose, iris et jasmin, sur un fond d’ambre, de cuir et de santal.',
    keyNotes: 'Abricot · Iris · Cuir · Ambre', families: ['Ambré', 'Floral'],
    pack: 'ambert-sunset-pack', card: 'ambert-sunset-1', pack30: 'ambert-sunset-pack30', scene: 'ambert-sunset-1',
    gallery: ['ambert-sunset-pack', 'ambert-sunset-pack30', 'ambert-sunset-1', 'ambert-sunset-2', 'ambert-sunset-mod', 'hero-collection'],
    description: [
      "Ambert Sunset s’ouvre comme le dernier souffle d’un jour d’été, lorsque le ciel se pare de teintes dorées et que l’air devient plus doux, presque tangible.",
      "Dès l’ouverture, l’abricot velouté, le safran épicé et l’osmanthus lumineux esquissent les premiers rayons d’un coucher de soleil. Au cœur, la rose, l’iris pallida poudré et le jasmin composent une partition florale noble et vibrante, presque crépusculaire. En fond, le cuir, l’ambre et le santal s’entrelacent en un sillage riche, sophistiqué et profondément sensuel.",
      "Ambert Sunset est une ode au crépuscule, ce moment suspendu où le ciel se pare d’or liquide et où la lumière déclinante devient caresse."
    ],
    notes: { tete: 'Abricot, Safran, Osmanthus', coeur: 'Rose, Iris pallida, Jasmin', fond: 'Cuir, Ambre, Bois de santal' }
  },

  /* ============ Coffrets — exclusivité site ============ */
  {
    handle: 'coffret-decouverte', name: 'Coffret Découverte', subtitle: 'Discovery set · 2 ml', collection: 'coffrets', type: 'Coffret', exclusive: true,
    card: 'coffret-2ml', scene: 'summer-100',
    gallery: ['coffret-2ml', 'summer-100', 'skin-trio'],
    formats: [
      { id: 'sv', label: 'Summer Vibes · 5 × 2 ml', price: 30 },   // PRIX_A_CONFIRMER
      { id: 'so', label: 'Skin Obsession · 3 × 2 ml', price: 18 }  // PRIX_A_CONFIRMER
    ],
    keyNotes: 'Formats 2 ml · Valeur recréditée',
    tagline: 'Une préface à la collection.',
    description: [
      "La maison LIBRERY vous invite à parcourir sa bibliothèque olfactive. Pensé comme une préface à la collection, le Coffret Découverte ouvre les premières pages de nos créations à travers des formats de 2 ml. Chaque fragrance révèle un souvenir, une émotion, un chapitre à explorer au fil de votre lecture sensorielle.",
      "À la suite de votre commande, un code d’une valeur équivalente à celle du coffret vous est envoyé par e-mail. Valable 90 jours, il peut être utilisé lors de l’achat d’un parfum 100 ml."
    ]
  },
  {
    handle: 'coffret-a-composer', name: 'Coffret à composer', subtitle: 'Cinq extraits · 2 ml', collection: 'coffrets', type: 'Coffret', exclusive: true, builder: 5,
    card: 'summer-100', scene: 'coffret-2ml',
    gallery: ['summer-100', 'skin-trio', 'coffret-2ml'],
    formats: [{ id: '5x2', label: '5 × 2 ml', price: 30 }],   // PRIX_A_CONFIRMER
    keyNotes: 'Vos cinq parfums · Valeur recréditée',
    tagline: 'Composez votre propre préface : cinq parfums de la bibliothèque, choisis par vous.',
    description: [
      "Parce que chaque lecteur a sa manière de parcourir une bibliothèque, le Coffret à composer vous laisse choisir cinq extraits parmi toutes nos créations, en format 2 ml.",
      "Comme pour le Coffret Découverte, un code de la valeur du coffret vous est envoyé après commande, valable 90 jours sur un flacon 100 ml."
    ]
  },
  {
    handle: 'coffret-collection', name: 'Coffret Collection', subtitle: 'Discovery set · 30 ml', collection: 'coffrets', type: 'Coffret', exclusive: true,
    card: 'coffret-30ml', scene: 'coffret-30ml-2',
    gallery: ['coffret-30ml', 'coffret-30ml-2', 'camp-coffrets'],
    formats: [
      { id: 'sv', label: 'Summer Vibes · 5 × 30 ml', price: 320 },  // PRIX_A_CONFIRMER
      { id: 'so', label: 'Skin Obsession · 3 × 30 ml', price: 200 } // PRIX_A_CONFIRMER
    ],
    keyNotes: 'Extraits 30 ml · Une collection entière',
    tagline: 'Un chapitre entier, à parcourir.',
    description: [
      "Nos coffrets en extrait de parfum 30 ml réunissent les créations d’une même collection.",
      "Une immersion plus profonde dans chaque univers, pour parcourir ses chapitres, en saisir les subtilités, ressentir les émotions qu’il raconte et les souvenirs qu’il renferme — comme on feuillette un livre dont chaque page écrit un peu de votre propre histoire."
    ]
  }
];

const COLLECTIONS = {
  'skin-obsession': {
    mosaic: [['camp-lit', 'Skin Obsession, la campagne'], ['skin-homme-tonka', 'Tonka Love'], ['vanilla-plum-mod', 'Vanilla Plum']], wide: 'skin-trio',
    title: 'Skin Obsession', folio: 32, number: '03', chapter: 'Collection II', kicker: 'Nouvelle collection',
    hero: 'hero-skin', side: 'skin-femme-flacons',
    epigraph: 'La peau est le livre. Le parfum est l’histoire. L’obsession, le désir de le relire.',
    intro: [
      "Il est un instant, presque imperceptible, lors d’une première rencontre : un éveil qui trouble les sens. La découverte d’un monde soudain révélé, une matière qui intrigue, un accord qui émeut.",
      "Skin Obsession est née de cette émotion. Cet instant où un parfum cesse d’être une simple odeur pour devenir une sensation, une émotion, un souvenir. Le moment où quelque chose de plus profond prend forme : la fascination, puis le désir de revivre cette sensation, encore et encore."
    ],
    chapters: [
      { h: 'Peau', p: [
        "Chez LIBRERY, la peau est au cœur de tout. Elle est la toile vivante sur laquelle le parfum s’écrit ; là où les notes émergent, se transforment, s’intensifient puis s’effacent peu à peu.",
        "La peau est le livre dans lequel chaque parfum raconte son histoire. Car un parfum ne se révèle jamais entièrement seul : il prend vie au contact de celui qui le porte."
      ] },
      { h: 'Obsession', p: [
        "L’obsession naît de ce qui ne se laisse pas entièrement saisir. Pour cette collection, LIBRERY a créé trois fragrances signatures autour de matières précieuses, d’une qualité exceptionnelle. Intemporelles, complexes et énigmatiques, elles résistent à toute classification immédiate.",
        "Dès que l’on croit avoir compris un parfum, une autre facette apparaît. On y revient pour retrouver une sensation déjà éprouvée, tout en espérant découvrir autre chose. C’est précisément là que commence l’obsession."
      ] },
      { h: 'La naissance de Skin Obsession', p: [
        "Développée avec dsm-firmenich, Skin Obsession prolonge l’approche sensorielle de la maison. Créées par la parfumeure Coralie Spicher, les trois compositions sont nées d’une connivence immédiate avec le fondateur : dès les premiers échanges, une compréhension instinctive de la vision créative s’est imposée.",
        "Ensemble, ils ont imaginé trois extraits de parfum concentrés à 25 %, construits autour de matières d’exception et d’accords travaillés en profondeur — des compositions pensées pour évoluer, surprendre et révéler peu à peu leur personnalité sur la peau."
      ] }
    ]
  },
  'summer-vibes': {
    mosaic: [['camp-baie', 'Summer Vibes, la campagne'], ['hot-sand-mod', 'Hot Sand'], ['summer-socles', 'Les cinq fragments']], wide: 'hero-summer',
    title: 'Summer Vibes', folio: 14, number: '02', chapter: 'Collection I', kicker: 'Collection',
    hero: 'hero-summer', side: 'summer-socles',
    epigraph: 'Certains étés ne s’achèvent jamais vraiment. Ils persistent sous la peau, dans l’éclat des souvenirs, dans cette chaleur invisible que l’on croyait avoir laissée derrière soi.',
    intro: [
      "L’été a quelque chose de singulier. Pendant quelques semaines précieuses, le temps semble ralentir. Les jours s’étirent sous une lumière sans fin, les heures perdent de leur importance et le quotidien s’éloigne doucement.",
      "Le parfum d’une peau chauffée par le soleil. Le sel sur les lèvres. L’odeur des fruits mûrs. La fraîcheur d’un sorbet dans la chaleur de l’après-midi. L’ombre des arbres. La lumière dorée des dernières heures du jour. Parfois, il suffit d’une sensation pour que tout revienne."
    ],
    chapters: [
      { h: 'Chronique d’un été sans fin', p: [
        "LIBRERY a voulu capturer cet instant fugace. Non pas l’été comme une saison, mais ce qu’il laisse en nous : un sentiment de liberté, une douceur tranquille, la sensation rare d’avoir suspendu le temps.",
        "Summer Vibes est né de ce désir : enfermer le souvenir de l’été dans un flacon. Cinq parfums, comme cinq fragments d’une même parenthèse sans fin. Chaque fragrance devient une porte ouverte sur la mémoire."
      ] },
      { h: 'Un voyage capturé en parfum', p: [
        "Hot Sand s’ouvre sur un rivage encore chauffé par le soleil. Avec Mango Wave, l’été éclate en couleurs. Puis vient la fraîcheur de Sun Ice, comme une brise glacée dans la chaleur. Palmeira ralentit le temps, sous la canopée. Enfin, le jour cède au crépuscule avec Ambert Sunset.",
        "Summer Vibes n’est pas seulement une collection inspirée de l’été. C’est une tentative de le retenir. Car certains souvenirs ne disparaissent jamais vraiment : ils attendent simplement qu’un parfum les réveille."
      ] }
    ]
  },
  'coffrets': {
    mosaic: [['coffret-30ml-2', 'Le coffret Collection'], ['cover-pile', 'La bibliothèque'], ['camp-coffrets', 'L’écrin']],
    title: 'Coffrets Découverte', number: '—', chapter: 'Exclusivité site', kicker: 'Préface',
    hero: 'hero-collection', side: 'coffret-30ml',
    epigraph: 'Parcourir la bibliothèque avant d’y choisir son livre.',
    intro: ["Nos coffrets ouvrent les premières pages de chaque collection. La valeur du coffret 2 ml vous est recréditée sur l’achat d’un parfum 100 ml, pendant 90 jours."],
    chapters: []
  },
  'bougies': {
    title: 'Bougies', number: '—', chapter: 'Chapitre à venir', kicker: 'Bientôt',
    hero: 'camp-coffrets', soon: true,
    epigraph: 'Un nouveau chapitre s’écrit.',
    intro: ["Les récits LIBRERY s’apprêtent à quitter la peau pour habiter l’espace. Inscrivez-vous pour être parmi les premiers à les découvrir."],
    chapters: []
  }
};

/* L'étagère des matières : une nature morte par parfum (métaobjet Shopify « matiere ») */
const SHELF = [
  { img: 'prune-livres', t: 'La prune', h: 'vanilla-plum' },
  { img: 'poire-livres', t: 'La poire', h: 'magnetic-flowers' },
  { img: 'tonka-capot', t: 'La fève tonka', h: 'tonka-love' },
  { img: 'mango-wave-2', t: 'La mangue', h: 'mango-wave' },
  { img: 'baies-colonne', t: 'Les baies', h: 'palmeira' },
  { img: 'sun-ice-2', t: 'Le cassis', h: 'sun-ice' },
  { img: 'ambert-sunset-2', t: 'L’abricot', h: 'ambert-sunset' },
  { img: 'hot-sand-1', t: 'Le jasmin', h: 'hot-sand' }
];

/* Points de vente — coordonnées géocodées depuis les adresses du site actuel */
const STORES = [
  { name: 'UNI/VERE Parfumerie', address: '56 bis Rue du Louvre', city: '75002 Paris', country: 'France', phone: '+33 9 86 47 67 13', url: 'http://www.univereparfumerie.com', lat: 48.8658, lng: 2.3435 },
  { name: 'Sayhar', address: '27 rue de Marignan', city: '75008 Paris', country: 'France', phone: '+33 1 88 61 46 96', url: 'https://sayhar.fr/', lat: 48.8695, lng: 2.3064 },
  { name: 'Vanora', address: '30/32 Rue Henri Barbusse', city: '92000 Nanterre', country: 'France', phone: '+33 6 14 10 08 74', lat: 48.8902, lng: 2.1954 },
  { name: 'Parfumerie Basic', address: '39 Rue Jeanne-d’Arc', city: '51100 Reims', country: 'France', phone: '+33 7 67 77 67 05', url: 'https://www.parfumerie-basic.fr/', lat: 49.2548, lng: 4.0250 },
  { name: 'La Galerie du Flair', address: '41 Avenue Clemenceau', city: '68100 Mulhouse', country: 'France', lat: 47.7456, lng: 7.3409 },
  { name: 'Evok Shoes', address: '19 Rue du Président Édouard Herriot', city: '69001 Lyon', country: 'France', phone: '+33 4 78 39 61 98', lat: 45.7650, lng: 4.8340 },
  { name: 'Mon Flacon', address: '16 Rue Carnot', city: '69190 Saint-Fons', country: 'France', phone: '+33 6 62 33 65 74', url: 'https://monflaconparfum.com', lat: 45.7081, lng: 4.8571 },
  { name: 'Smell Fragrance', address: '26 Rue des Cordeliers', city: '64000 Pau', country: 'France', phone: '+33 6 59 67 00 91', url: 'https://www.smellfragrance.fr/', lat: 43.2972, lng: -0.3718 },
  { name: 'Parfum 352', address: '1 Rue du Stade', city: '4488 Belvaux Sanem', country: 'Luxembourg', phone: '+352 691 146 250', lat: 49.5095, lng: 5.9281 },
  { name: 'PuaPua', address: 'Lammstraße 7', city: '76133 Karlsruhe', country: 'Allemagne', phone: '+49 721 96316088', url: 'https://puapua.de', lat: 49.0092, lng: 8.4028 },
  { name: 'BL Fragrance', address: 'Avenue de Béthusy 38B', city: '1005 Lausanne', country: 'Suisse', url: 'https://bl-parfumerie.ch/', lat: 46.5213, lng: 6.6461 },
  { name: 'Parfumologue', address: 'Chemin du Trabandan 16', city: '1006 Lausanne', country: 'Suisse', phone: '+41 76 628 99 28', lat: 46.5146, lng: 6.6429 },
  { name: 'Oligarch', address: '765 Glen Huntly Rd', city: 'Caulfield VIC 3162', country: 'Australie', phone: '+61 3 9193 6953', url: 'https://oligarch.com.au/', lat: -37.8866, lng: 145.0211 }
];
