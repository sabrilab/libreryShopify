/* ==========================================================================
   LIBRERY — données du site (v2, d'après le catalogue A4 v4)
   Ces objets correspondent 1:1 à ce qui sera créé dans Shopify :
   produits (+ métachamps : accroche, notes, parfumeur, matières),
   collections, métaobjets « parfumeur » et « point de vente ».
   Prix confirmés par LIBRERY le 12/10/2026 (100 ml 170 €, 30 ml 90 €, 2 ml 7 €, coffrets 40 / 430 / 250 €).
   ========================================================================== */

const IMG = (LIBRERY_BASE + '/assets/img/v2/');
const CATALOGUE_URL = 'https://librery-catalogue-3d.vercel.app/';
const CATALOGUE_PDF = 'https://librery-catalogue-3d.vercel.app/telechargements/LIBRERY-catalogue-doubles-pages.pdf';
// Le catalogue en ligne reprend-il l'image clé du chevet de l'accueil (décor « chevet », docs/chevet.md du dépôt
// librery-catalogue-3d) ? Oui, déployé (librery-catalogue-3d 88e3c77) : depuis la section, le catalogue s'ouvre dans le
// même décor. À repasser à false pour revenir au lecteur habituel partout — le catalogue peut aussi l'annoncer lui-même
// (« pret » portant decors: ['chevet'], main.js : initLecteur).
const CATALOGUE_DECOR_CHEVET = true;

/* Visuels produit : pack = flacon détouré sur fond clair (grille façon D'orsay),
   pack / pack30 = packshots studio à échelle commune (flacon ≈ 40 % du cadre),
   scene = mise en situation révélée au survol (ou `video` : boucle muette, métafield Shopify). */

/* Formats — catalogue : « Extrait de Parfum 25 % · 100 ml & 30 ml » ; échantillon 2 ml. */
/* Familles olfactives (filtre Bibliothèque) — classement proposé, À VALIDER par la maison */
const FAMILIES = {
  'Gourmand': 'Vanille, caramel, praline, chocolat : des notes que l’on voudrait presque goûter.',
  'Floral': 'Rose, jasmin, tubéreuse, fleur d’oranger : le cœur fleuri de la parfumerie.',
  'Fruité': 'Baies, mangue, abricot : l’éclat juteux des fruits mûrs.',
  'Ambré': 'Ambre, résines, benjoin : une chaleur enveloppante et sensuelle.',
  'Boisé': 'Santal, cèdre, bois modernes : la structure et la profondeur.'
};
/* Image de chaque famille (métaobjet Shopify « famille » : nom, texte, image ; les produits y sont reliés
   par un métachamp liste, la première famille étant la famille principale) */
const FAMILY_ART = { 'Gourmand': 'famille-gourmand', 'Floral': 'famille-floral', 'Fruité': 'famille-fruite', 'Ambré': 'famille-ambre', 'Boisé': 'famille-boise' };   // matières en gros plan (retour de Nolwenn, 13/10)

/* Services — promesses affichées partout (bandeau, fiche produit, panier) */
const SERVICES = [
  { i: 'vial', t: 'Essayez-le avant de l’ouvrir', d: 'Un échantillon 2 ml du parfum glissé avec chaque flacon : testez-le d’abord, retour gratuit si le flacon reste scellé.' },
  { i: 'vials', t: 'Deux échantillons offerts', d: 'À choisir dans la bibliothèque, avec chaque commande.' },
  { i: 'parcel', t: 'Livraison offerte dès 100 €', d: 'Expédition soignée depuis Paris, retours gratuits sous 30 jours.' }
];

const FORMATS = [
  { id: '100', label: '100 ml', price: 170 },
  { id: '30', label: '30 ml', price: 90 },
  { id: '2', label: '2 ml', price: 7 }
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
    keyNotes: 'Prune · Cuir · Vanille', families: ['Gourmand', 'Ambré'],
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
    notes: { tete: 'Prune, Cannelle', coeur: 'Lait, Cuir de Grasse, Myrrhe, Vanille de Tahiti', fond: 'Vanille Planifolia de Madagascar, Ambre, Benjoin Siam' },
    materials: {
      title: 'Entre douceur et profondeur',
      list: { tete: 'Cannelle SFE, Prune séchée STT, Amande', coeur: 'Lait, Cuir de Grasse, Vanille Tahitensis (infusion)', fond: 'Vanille Planifolia Madagascar SFE, Benjoin Siam, Tonka' },
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
    keyNotes: 'Sésame · Tubéreuse · Santal', families: ['Floral', 'Fruité'],
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
    notes: { tete: 'Poire, Sauge sclarée, Sésame', coeur: 'Néroli, Tubéreuse, Jasmin Sambac, Ylang-ylang, Fleur d’oranger', fond: 'Santal d’Australie, Ambre, Muscs blancs' },
    materials: {
      title: 'L’attraction des fleurs blanches',
      list: { tete: 'Poire, Sauge sclarée, Sésame SFE', coeur: 'Néroli, Tubéreuse, Jasmin Sambac Inde Abs, Ylang Ess, Fleur d’oranger Abs', fond: 'Santal d’Australie, Ambre, Muscs blancs' },
      text: [
        "Magnetic Flowers se construit sur la tension entre la fraîcheur, les facettes vertes et l’opulence crémeuse des fleurs blanches.",
        "En ouverture, la poire apporte une fraîcheur juteuse et lumineuse. Elle rencontre la sauge sclarée, qui introduit une dimension verte et aromatique, tandis que le sésame SFE révèle des facettes toastées, céréalières et gourmandes.",
        "Au cœur, les fleurs blanches prennent le devant de la scène. La tubéreuse apporte un caractère crémeux, solaire et opulent ; l’absolue de jasmin Sambac d’Inde ajoute de la profondeur ; l’huile essentielle d’ylang-ylang assure une transition soyeuse vers les fleurs plus riches.",
        "En fond, le santal d’Australie apporte une texture boisée crémeuse, lactée et chaude. L’ambre renforce la profondeur, les muscs blancs adoucissent la structure. Fraîche et chaude, verte et crémeuse, lumineuse et enveloppante : une architecture olfactive construite sur le contraste."
      ]
    }
  },
  {
    handle: 'tonka-love', folio: 43, name: 'Tonka Love', collection: 'skin-obsession', isNew: true, perfumer: 'coralie-spicher',
    tagline: 'L’irrésistible chaleur de la tonka.',
    keyNotes: 'Cardamome · Tonka · Cèdre', families: ['Gourmand', 'Boisé'],
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
    gallery: ['hot-sand-pack', 'hot-sand-pack30', 'hot-sand-1', 'hot-sand-mod', 'camp-blanche', 'hero-portrait'],
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
    pack: 'mango-wave-pack', card: 'mango-wave-pack', pack30: 'mango-wave-pack30', scene: 'mango-wave-reflet',
    gallery: ['mango-wave-pack', 'mango-wave-pack30', 'mango-wave-reflet', 'mango-wave-mangue', 'cover-pile'],
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
    gallery: ['sun-ice-pack', 'sun-ice-pack30', 'sun-ice-1', 'sun-ice-2', 'camp-livre'],
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
    pack: 'palmeira-pack', card: 'palmeira-pack', pack30: 'palmeira-pack30', scene: 'palmeira-bois',
    gallery: ['palmeira-pack', 'palmeira-pack30', 'palmeira-bois', 'hero-summer', 'cover-pile'],
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
    handle: 'coffret-decouverte', name: 'Coffret Découverte', subtitle: 'Les huit parfums · 2 ml', collection: 'coffrets', type: 'Coffret', exclusive: true,
    card: 'discovery-2ml-ouvert', scene: 'discovery-2ml-ferme',
    gallery: ['discovery-2ml-ouvert', 'discovery-2ml-ferme', 'coffret-2ml', 'camp-coffrets'],
    formats: [{ id: '8x2', label: '8 × 2 ml', price: 40 }],   // Discovery Set 2 ml : les deux collections
    keyNotes: 'Formats 2 ml · Valeur recréditée',
    tagline: 'Une préface à la collection.',
    description: [
      "La maison LIBRERY vous invite à parcourir sa bibliothèque olfactive. Pensé comme une préface à la collection, le Coffret Découverte ouvre les premières pages de nos créations à travers des formats de 2 ml. Chaque fragrance révèle un souvenir, une émotion, un chapitre à explorer au fil de votre lecture sensorielle.",
      "À la suite de votre commande, un code d’une valeur équivalente à celle du coffret vous est envoyé par e-mail. À usage unique et valable 30 jours, il s’utilise uniquement sur un parfum 100 ml."
    ]
  },
  {
    // en pause (12/10/2026, « pas pour maintenant ») : retiré des listes, son adresse mène au Coffret Découverte ; le rallumer = supprimer paused: true
    handle: 'coffret-a-composer', name: 'Coffret à composer', subtitle: 'Cinq extraits · 2 ml', collection: 'coffrets', type: 'Coffret', exclusive: true, builder: 5, paused: true,
    card: 'camp-mains', scene: 'skin-trio',
    gallery: ['camp-mains', 'skin-trio', 'cover-pile'],
    formats: [{ id: '5x2', label: '5 × 2 ml', price: 40 }],   // prix à fixer le jour où il revient
    keyNotes: 'Vos cinq parfums · Valeur recréditée',
    tagline: 'Composez votre propre préface : cinq parfums de la bibliothèque, choisis par vous.',
    description: [
      "Parce que chaque lecteur a sa manière de parcourir une bibliothèque, le Coffret à composer vous laisse choisir cinq extraits parmi toutes nos créations, en format 2 ml.",
      "Comme pour le Coffret Découverte, un code de la valeur du coffret vous est envoyé après commande, valable 30 jours sur un flacon 100 ml."
    ]
  },
  {
    handle: 'coffret-collection', name: 'Coffret Collection', subtitle: 'Une collection · 30 ml', collection: 'coffrets', type: 'Coffret', exclusive: true,
    card: 'discovery-sv-ouvert', scene: 'discovery-so-ouvert',
    gallery: ['discovery-sv-ouvert', 'discovery-sv-ferme', 'discovery-so-ouvert', 'discovery-so-ferme', 'coffret-30ml', 'camp-coffrets'],
    // la galerie suit la version choisie (packshots Nano Banana 2.1 d'après les photos de LIBRERY, 12/10)
    fmtImages: { sv: ['discovery-sv-ouvert', 'discovery-sv-ferme'], so: ['discovery-so-ouvert', 'discovery-so-ferme'] },
    formats: [
      { id: 'sv', label: 'Summer Vibes · 5 × 30 ml', price: 430 },
      { id: 'so', label: 'Skin Obsession · 3 × 30 ml', price: 250 }
    ],
    keyNotes: 'Extraits 30 ml · Une collection entière',
    tagline: 'Un chapitre entier, à parcourir.',
    description: [
      "Nos coffrets en extrait de parfum 30 ml réunissent les créations d’une même collection.",
      "Une immersion plus profonde dans chaque univers, pour parcourir ses chapitres, en saisir les subtilités, ressentir les émotions qu’il raconte et les souvenirs qu’il renferme — comme on feuillette un livre dont chaque page écrit un peu de votre propre histoire."
    ]
  }
];

/* Collections.
   `video` / `videoMobile` (facultatifs) : boucle muette, seule à l'ouverture, sans image d'attente (Shopify : métachamps de collection).
   `tiles` : 'end' = rangée « Coffret · Portrait olfactif · Nos adresses » en fin de page ; 'grid' = une tuile qui complète la grille des parfums. */
const COLLECTIONS = {
  'skin-obsession': {
    mosaic: [['skin-livres', 'Skin Obsession, la collection'], ['skin-voiture', 'La campagne'], ['skin-cabriolet', 'Skin Obsession, la campagne']], wide: 'skin-trio',
    title: 'Skin Obsession', folio: 32, number: '03', chapter: 'Collection II', kicker: 'Nouvelle collection',
    hero: 'hero-skin', tiles: 'end',
    video: (LIBRERY_BASE + '/assets/video/skin-obsession.mp4'), videoMobile: (LIBRERY_BASE + '/assets/video/skin-obsession-m.mp4'),
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
    mosaic: [['summer-canape', 'Summer Vibes, la campagne'], ['camp-trente', 'La collection en 30 ml'], ['mango-wave-mangue', 'Mango Wave']], wide: 'hero-portrait',
    title: 'Summer Vibes', folio: 14, number: '02', chapter: 'Collection I', kicker: 'Collection',
    tiles: 'grid',
    hero: 'hero-summer',
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
    mosaic: [['summer-fenetre', 'La campagne'], ['prune-vanille', 'Vanilla Plum'], ['camp-trente', 'La bibliothèque']],
    title: 'Coffrets Découverte', number: '—', chapter: 'Exclusivité site', kicker: 'Préface',
    hero: 'hero-collection',
    epigraph: 'Parcourir la bibliothèque avant d’y choisir son livre.',
    intro: ["Nos coffrets ouvrent les premières pages de chaque collection. La valeur du Coffret Découverte 2 ml vous est recréditée sur l’achat d’un parfum 100 ml, pendant 30 jours."],
    chapters: []
  },
  'bougies': {
    title: 'Bougies', number: '—', chapter: 'Chapitre à venir', kicker: 'Bientôt',
    hero: 'hero-collection', soon: true, hidden: true, // en pause en attendant les photos (12/10) ; Shopify : collection dépubliée + redirection d'URL
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
  { img: 'baies-colonne', t: 'Les baies', h: 'palmeira' },
  { img: 'sun-ice-2', t: 'Le cassis', h: 'sun-ice' },
  { img: 'ambert-sunset-2', t: 'L’abricot', h: 'ambert-sunset' },
  { img: 'hot-sand-1', t: 'Le jasmin', h: 'hot-sand' }
];

/* Points de vente — liste envoyée par LIBRERY le 12/10/2026 (13/10 : Imm Couture et Odor BXL retirés, Olfactions ajouté), géocodée avec OpenStreetMap (Nominatim).
   Au niveau de la rue seulement : Les Passionnez, La Rouge, Kyomu, Amyris Essenze. `online` : sans adresse ni repère. */
const STORES = [
  { name: 'Maison Diaphane', address: '11 Rue des Lices', city: '49100 Angers', country: 'France', phone: '+33 2 41 09 15 70', url: 'https://maison-diaphane.com/', lat: 47.4686, lng: -0.5539 },
  { name: 'Les Passionnez', address: '43 avenue Fortuné Ferrini', city: '13080 Aix-en-Provence', country: 'France', phone: '+33 6 83 22 24 45', url: 'https://lespassionnez.com/', lat: 43.4879, lng: 5.4236 },
  { name: 'NF Senteurs', address: '30 Avenue Charles de Gaulle', city: '84130 Le Pontet', country: 'France', phone: '+33 6 82 49 50 45', lat: 43.9589, lng: 4.8527 },
  { name: 'Parfumerie Basic', address: '39 Rue Jeanne-d’Arc', city: '51100 Reims', country: 'France', phone: '+33 7 67 77 67 05', url: 'https://www.parfumerie-basic.fr/', lat: 49.2548, lng: 4.025 },
  { name: 'Secret Garden', address: '90 Avenue Pasteur', city: '93260 Les Lilas', country: 'France', url: 'https://secretsgarden.fr', lat: 48.876, lng: 2.4153 },
  { name: 'DSB Parfums', address: '186 Boulevard de Stalingrad', city: '94500 Champigny-sur-Marne', country: 'France', phone: '+33 1 80 91 22 16', url: 'https://dsb-parfums.fr/', lat: 48.8235, lng: 2.4968 },
  { name: 'Olfactions', address: '10 Avenue Winston Churchill', city: '31100 Toulouse', country: 'France', url: 'https://olfactions.fr', lat: 43.5688, lng: 1.4013 },
  { name: 'Sillâge', address: '9 Rue aux Juifs', city: '76000 Rouen', country: 'France', url: 'https://sillage-parfums.fr/', lat: 49.4416, lng: 1.0939 },
  { name: 'UNI/VERE Parfumerie', address: '30 Rue d’Aboukir', city: '75002 Paris', country: 'France', phone: '+33 9 86 47 67 13', lat: 48.867, lng: 2.3446 },
  { name: 'Smell Fragrance', address: '26 Rue des Cordeliers', city: '64000 Pau', country: 'France', phone: '+33 6 59 67 00 91', url: 'https://smellfragrance.fr/', lat: 43.2972, lng: -0.3718 },
  { name: 'BL Parfumerie', address: 'Avenue de Béthusy 38B', city: '1005 Lausanne', country: 'Suisse', lat: 46.5213, lng: 6.6461 },
  { name: 'Scent Split', address: '1800 Post Oak Blvd, Ste 6140', city: 'Houston, TX 77056', country: 'États-Unis', url: 'https://www.scentsplit.com', lat: 29.7472, lng: -95.4618 },
  { name: 'Absolute Fragrance', address: '2150 W First St, Ste 3B', city: 'Fort Myers, FL 33901', country: 'États-Unis', phone: '+1 215-251-4466', url: 'https://www.absolutefragrances.com/', lat: 26.639, lng: -81.8777 },
  { name: 'Scents Eternal', address: '9351 Warren Parkway', city: 'Frisco, TX 75035', country: 'États-Unis', url: 'https://scentseternal.com/', lat: 33.1092, lng: -96.8019 },
  { name: 'BeautyLIV', address: '', city: '', country: 'États-Unis', url: 'https://www.beautyliv.com', online: true },
  { name: 'Parfum Exquis', address: '4956 Boulevard Décarie', city: 'Montréal, QC H3X 2H7', country: 'Canada', phone: '+1 438-930-5109', url: 'https://parfumexquis.com/', lat: 45.4827, lng: -73.6279 },
  { name: 'Pua Pua Duftkonzept', address: 'Lammstraße 7', city: '76133 Karlsruhe', country: 'Allemagne', phone: '+49 721 96316088', url: 'https://puapua.de/', lat: 49.0092, lng: 8.4028 },
  { name: 'La Rouge Perfumes', address: 'G5, Park View', city: 'Erbil 44001', country: 'Irak', phone: '+964 750 600 8000', url: 'http://larouge.vip/', lat: 36.2095, lng: 43.9822 },
  { name: 'House of Merlo', address: 'Mokotowska 46', city: '00-543 Varsovie', country: 'Pologne', phone: '+48 531 015 416', url: 'https://houseofmerlo.pl', lat: 52.2247, lng: 21.0215 },
  { name: 'Edulge', address: 'Berkeley Square House, 2e étage', city: 'Londres W1J 6BD', country: 'Royaume-Uni', phone: '+44 20 3397 6641', url: 'http://www.edulge.com/', lat: 51.5094, lng: -0.1443 },
  { name: 'Kyomu', address: 'Calle Valle de Nocito 5', city: '28803 Alcalá de Henares', country: 'Espagne', phone: '+34 657 757 948', url: 'https://www.kyomu-brand.es/', lat: 40.4733, lng: -3.3723 },
  { name: 'Amyris Essenze', address: 'Piazza Rosolino Pilo 27', city: '00152 Rome', country: 'Italie', phone: '+39 06 4549 6069', url: 'https://amyrisessenze.com/', lat: 41.8818, lng: 12.461 },
  { name: 'ParfuMaria Parfumsalon', address: 'Tinbergenlaan 5', city: '3401 MT IJsselstein', country: 'Pays-Bas', note: 'Sur rendez-vous', lat: 52.0148, lng: 5.0605 },
  { name: 'Oligarch Perfumery', address: '765 Glen Huntly Rd', city: 'Caulfield VIC 3162', country: 'Australie', url: 'https://oligarch.com.au/', lat: -37.8866, lng: 145.0211 }
];

/* Produits en pause : retirés des listes, réactivés en supprimant leur `paused: true`. */
const PAUSED_PRODUCTS = PRODUCTS.filter(p => p.paused);
for (let i = PRODUCTS.length; i--;) if (PRODUCTS[i].paused) PRODUCTS.splice(i, 1);
