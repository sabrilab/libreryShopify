/* ==========================================================================
   LIBRERY — données de la maquette
   Ces objets correspondent 1:1 à ce qui sera créé dans Shopify :
   produits (+ métachamps notes / parfumeur / matières), collections,
   métaobjets « parfumeur » et « point de vente ».
   Les prix marqués PRIX_A_CONFIRMER sont des valeurs provisoires.
   ========================================================================== */

const IMG = '/assets/img/';

/* Formats et prix — maquette Canva : 100 ml à 170 €, « dès 6 € » (2 ml).
   Le 30 ml est un prix provisoire à confirmer par le client. */
const FORMATS = [
  { id: '100', label: '100 ml', price: 170 },
  { id: '30', label: '30 ml', price: 75 },   // PRIX_A_CONFIRMER
  { id: '2', label: '2 ml', price: 6 }
];

const PERFUMERS = {
  'chris-maurice': {
    name: 'Chris Maurice',
    bio: [
      "Chris Maurice, maître parfumeur et directeur de Carbonnel S.A., est issu d’une prestigieuse lignée de parfumeurs espagnols. Plongé dès l’enfance dans l’univers des fragrances de niche, il a affiné son expertise dans la création d’essences raffinées, incarnant sa vision de la Haute Parfumerie.",
      "Grâce à une vaste expérience auprès de marques renommées comme Xerjoff, Nishane, Fragrance Du Bois et Masque Milano, Chris s’est imposé comme une figure clé du secteur. Il est également le fondateur de CDe La Niche, une entreprise dédiée à la création de parfums uniques et intemporels.",
      "Ses compositions, telles que Lira, Alexandria II ou More Than Words, sont plébiscitées par les amateurs du monde entier. Collaborant avec des maisons prestigieuses, son talent, sa passion et sa créativité font de lui l’un des parfumeurs les plus respectés de l’industrie."
    ]
  },
  'nathalie-feisthauer': {
    name: 'Nathalie Feisthauer',
    bio: [
      "Nathalie Feisthauer a toujours été fascinée par les parfums, une passion révélée par Opium d’Yves Saint Laurent. En 1983, elle intègre l’école de parfumerie Roure à Grasse, devenant la première stagiaire sans héritage familial dans un milieu encore très fermé. Sa carrière prend son essor à New York chez Estée Lauder, où elle découvre l’énergie et l’audace du marché américain, enrichissant ainsi sa créativité.",
      "Pendant plus de 30 ans, elle façonne des parfums pour des maisons prestigieuses comme Hermès, Cartier ou État Libre d’Orange, évoluant au sein de Givaudan puis Symrise. Aujourd’hui indépendante, elle fonde LABscent à Montmartre, installant son laboratoire dans une ancienne galerie d’art. Forte de son expérience et de sa renommée, elle compose des créations olfactives pour des marques de niche aux quatre coins du monde.",
      "Son talent lui a valu de multiples récompenses, dont le prix FIFI du parfumeur de l’année en 2019 et plusieurs distinctions pour ses compositions emblématiques."
    ]
  },
  'coralie-spicher': {
    name: 'Coralie Spicher',
    bio: [
      "Née à Genève, Coralie Spicher découvre sa passion pour la parfumerie à l’âge de douze ans, lorsqu’elle reçoit son premier parfum. Une première rencontre olfactive qui l’emmène dans un univers magique et émotionnel, et qui deviendra son terrain d’expression.",
      "Après des études de biochimie à l’Université de Genève, elle rejoint l’École Supérieure du Parfum à Paris pour y effectuer son Master. Son parcours débute chez dsm-firmenich à Genève, dans le domaine de la chromatographie, avant qu’elle n’intègre en 2018 l’école de parfumerie dsm-firmenich Fine Fragrance.",
      "Curieuse et profondément inspirée par le monde qui l’entoure, Coralie puise ses idées dans les lieux, les rencontres, l’architecture, l’art, la gastronomie et les voyages. Elle aime observer les cultures, les gestes, les habitudes et les odeurs du quotidien, autant de sources d’inspiration qui nourrissent sa vision de la parfumerie.",
      "Animée par une volonté constante d’apprendre et d’explorer, elle associe patience, persévérance et sensibilité pour donner naissance à des créations qui transmettent des émotions authentiques. Entre force et sensibilité, Coralie Spicher explore de nouveaux territoires olfactifs sans jamais perdre de vue ce qui l’a poussée, à l’origine, à aimer le parfum."
    ]
  }
};

const PRODUCTS = [
  /* ---------------- Skin Obsession (nouvelle collection) ---------------- */
  {
    handle: 'tonka-love', name: 'Tonka Love', collection: 'skin-obsession', isNew: true,
    perfumer: 'coralie-spicher', tone: '#b8a48c',
    keyNotes: 'Fève de tonka · Caramel salé · Cèdre',
    short: "Une gourmandise charnelle, enveloppante et affirmée, qui s’impose sur la peau avec une présence immédiatement envoûtante.",
    description: [
      "Tonka Love explore une gourmandise plus charnelle, presque instinctive, où la douceur devient tension et où le confort glisse vers l’addiction. Une fragrance pensée comme une attraction lente, profonde, difficile à interrompre.",
      "L’ouverture installe immédiatement un contraste vivant : entre la chaleur légèrement grillée de l’amande, l’éclat hespéridé et la vibration épicée des notes de tête. Une entrée dense, texturée, qui accroche les sens sans jamais les brusquer.",
      "Peu à peu, la composition se resserre autour d’un cœur plus enveloppant. Le caramel salé apporte une gourmandise trouble, jamais lisse, tandis que la tonka et la vanille construisent une chaleur crémeuse, presque tactile, qui semble fusionner avec la peau.",
      "Le fond prolonge cette sensation d’attachement. Les bois secs et ambrés dessinent une structure douce mais persistante, tandis que les muscs et les matières modernes prolongent la sensation de peau chauffée, habitée, presque familière.",
      "Tonka Love ne cherche pas la séduction immédiate. Il installe une présence, puis une habitude, puis une nécessité. Une fragrance qui s’ancre lentement, mais dont on ne se détache plus vraiment."
    ],
    notes: {
      tete: 'Amande grillée, Bergamote d’Italie, Poivre, Cardamome du Guatemala',
      coeur: 'Caramel salé, Tonka, Vanille',
      fond: 'Dreamwood, Cèdre de Virginie, Cashmeran'
    },
    materials: {
      list: {
        tete: 'Amande grillée STT, Bergamote Italie Ess, Poivre Ess, Cardamome Guatemala Ess',
        coeur: 'Caramel Salé NP, Tonka Abs, Vanille',
        fond: 'Dreamwood, Cèdre Virginie USA Ess, Cashmeran'
      },
      text: [
        "Tonka Love repose sur une construction de matières où chaque ingrédient est travaillé pour exprimer une chaleur précise, entre tension épicée et douceur enveloppante.",
        "L’ouverture associe une amande grillée révélée en Smell-The-Taste™, qui restitue sa dimension gourmande et toastée, à une bergamote d’Italie en essence pour l’éclat, tandis que le poivre et la cardamome du Guatemala en essences apportent une vibration épicée nette et structurante.",
        "Le cœur s’articule autour de matières gourmandes traitées pour leur intensité et leur texture : un caramel salé en NaturePrint™, plus vrai que nature dans son effet addictif, une fève tonka en absolue aux facettes rondes et sensuelles, et une vanille qui vient adoucir et lier l’ensemble dans une continuité crémeuse.",
        "Le fond s’appuie sur des bois et molécules de structure sélectionnés pour leur tenue et leur confort olfactif : Dreamwood pour sa modernité boisée douce, un cèdre de Virginie en essence pour la verticalité, et le Cashmeran pour sa signature musquée-boisée, chaleureuse et enveloppante."
      ]
    }
  },
  {
    handle: 'magnetic-flowers', name: 'Magnetic Flowers', collection: 'skin-obsession', isNew: true,
    perfumer: 'coralie-spicher', tone: '#d8cbbb',
    keyNotes: 'Poire · Tubéreuse · Fleur d’oranger · Santal',
    short: "Une présence douce et magnétique qui s’installe sur la peau comme une évidence, entre éclat et sensualité.",
    description: [
      "Magnetic Flowers s’inscrit dans une esthétique de l’attraction immédiate, celle des matières lumineuses qui captent avant même de se dévoiler pleinement. Une fragrance construite comme un champ de tension douce, entre éclat floral et sensualité enveloppante.",
      "L’ouverture surprend par un accord de poire juteuse, à la fois frais et pulpeux, relevé par la sauge sclarée dont l’aspect aromatique apporte une verticalité légèrement herbacée. Le sésame, plus inattendu, introduit une nuance toastée, subtilement texturée, qui donne déjà au parfum une dimension tactile et addictive.",
      "Le cœur s’ouvre ensuite sur un bouquet floral dense et vibrant. Le néroli apporte une lumière presque solaire, tandis que la tubéreuse déploie sa richesse crémeuse et charnelle. Le jasmin Sambac intensifie cette profondeur florale, soutenu par la sensualité enveloppante de l’ylang et la douceur lumineuse de la fleur d’oranger.",
      "En fond, le santal d’Australie structure la composition avec une chaleur boisée soyeuse. L’accord ambré prolonge cette sensation de peau réchauffée, tandis que les muscs blancs ancrent le parfum dans une douceur propre, presque seconde peau.",
      "Magnetic Flowers se déploie ainsi comme une caresse : une fleur en mouvement, qui ne cesse de capter, d’envelopper et de retenir."
    ],
    notes: {
      tete: 'Accord poire, Sauge sclarée, Sésame',
      coeur: 'Accord néroli, Tubéreuse, Jasmin Sambac, Ylang, Fleur d’oranger',
      fond: 'Santal d’Australie, Ambre, Muscs blancs'
    },
    materials: {
      list: {
        tete: 'Accord poire, Sauge sclarée Firabs, Sésame SFE',
        coeur: 'Accord néroli, Tubéreuse fleur Firabs, Jasmin Sambac Inde Abs, Ylang Ess, Fleur d’oranger Abs',
        fond: 'Santal Album Australie Firabs, Accord Ambre, Muscs blancs'
      },
      text: [
        "Magnetic Flowers s’appuie sur une sélection de matières travaillées pour préserver leur éclat naturel tout en révélant des textures précises et contemporaines.",
        "L’ouverture associe une poire construite en accord pour en restituer toute la jutosité lumineuse, une sauge sclarée Firabs qui apporte une facette aromatique plus nette et aérienne, et un sésame extrait en SFE, révélant des nuances douces, légèrement grillées et texturées.",
        "Le cœur met en scène des matières florales traitées pour exprimer toute leur densité : un néroli lumineux et structuré, une tubéreuse Firabs travaillée dans sa richesse crémeuse, un jasmin Sambac d’Inde en absolue pour sa profondeur charnelle, complété par l’ylang en essence et la fleur d’oranger en absolue, apportant volume, éclat et sensualité.",
        "Le fond s’ancre dans des matières boisées et musquées sélectionnées pour leur tenue et leur douceur : un santal Album d’Australie Firabs aux facettes lactées et boisées précises, un accord ambré moderne structurant la composition, et des muscs blancs qui prolongent la sensation de peau propre et enveloppante."
      ]
    }
  },
  {
    handle: 'vanilla-plum', name: 'Vanilla Plum', collection: 'skin-obsession', isNew: true,
    perfumer: 'coralie-spicher', tone: '#8e6f73',
    keyNotes: 'Prune · Vanille · Accord lait · Cannelle',
    short: "Plus qu’un parfum, une présence qui s’installe sur la peau comme une caresse profonde, où l’éclat fruité de la prune et la chaleur solaire de la vanille fusionnent dans une étreinte charnelle et addictive.",
    description: [
      "Vanilla Plum explore une gourmandise dense et texturée, où la douceur se charge progressivement de profondeur et de sensualité. Une fragrance construite autour de l’attraction : celle des matières chaudes, enveloppantes, presque tactiles, qui donnent immédiatement envie d’y revenir.",
      "L’ouverture mêle la richesse veloutée de la prune à l’éclat épicé de la cannelle. Dès les premières secondes, la composition oscille entre intensité fruitée et chaleur diffuse, créant une sensation à la fois familière et troublante.",
      "Au cœur, l’accord lait apporte une texture crémeuse et addictive, tandis que le cuir de Grasse révèle une facette plus sensuelle, presque charnelle. La myrrhe vient troubler l’ensemble d’une profondeur résineuse subtile, avant que la vanille de Tahiti ne déploie sa chaleur solaire et enveloppante au contact de la peau.",
      "Le fond prolonge cette sensation de confort obsessionnel. La vanille Planifolia de Madagascar s’y exprime avec richesse et relief, soutenue par la rondeur ambrée et les accents balsamiques du benjoin Siam. Peu à peu, le parfum devient plus qu’une odeur : une présence chaude, addictive, qui semble naturellement appartenir à la peau.",
      "Vanilla Plum laisse ainsi une impression persistante, intime et profondément sensorielle."
    ],
    notes: {
      tete: 'Prune, Cannelle',
      coeur: 'Accord lait, Cuir de Grasse, Myrrhe, Vanille de Tahiti',
      fond: 'Vanille Planifolia Madagascar, Ambre, Benjoin Siam'
    },
    materials: {
      list: {
        tete: 'Cannelle SFE, Prune séchée STT, Amande',
        coeur: 'Accord lait, Cuir de Grasse Firbest, Vanille Tahitensis Infusion',
        fond: 'Vanille Planifolia Madagascar SFE, Amberever Neo, Benjoin Siam Res, Accord Tonka'
      },
      text: [
        "Vanilla Plum repose sur un travail d’extraction précis, où chaque matière est révélée dans sa vérité la plus juste, entre naturalité et maîtrise technique.",
        "L’ouverture associe une cannelle obtenue par SFE, qui en préserve la chaleur sèche tout en en affinant les aspérités, à une prune travaillée en Smell-The-Taste™, restituant une impression gustative dense et réaliste.",
        "Le cœur met en avant des matières travaillées pour leur texture : un accord lait aux facettes crémeuses proches de la sensation peau, un cuir de Grasse affiné dans sa souplesse olfactive, et une vanille Tahitensis obtenue par infusion, développant une rondeur chaude et nuancée.",
        "Le fond révèle la profondeur des matières dans leur expression la plus stable : une vanille Planifolia de Madagascar extraite en SFE, plus pure et structurée, un Amberever Neo aux accents ambrés modernes, un benjoin Siam résineux et enveloppant qui prolonge la sensation de douceur."
      ]
    }
  },

  /* ---------------- Summer Vibes ---------------- */
  {
    handle: 'hot-sand', name: 'Hot Sand', collection: 'summer-vibes',
    perfumer: 'chris-maurice',
    images: ['produits/hot-sand-1.webp', 'site/Hot_sand_visu_copy.webp', 'produits/hot-sand-3.webp'],
    keyNotes: 'Jasmin · Chocolat blanc · Santal',
    short: "Hot Sand mêle jasmin lumineux, chocolat blanc fondant et santal crémeux dans une gourmandise solaire et addictive.",
    description: [
      "Hot Sand capture la douceur aérienne d’une gourmandise d’été, où le sable encore tiède caresse la peau dorée par le soleil.",
      "En tête, l’eau de jasmin et l’orchidée flottent comme un souffle léger et lumineux, tandis que la ganache de chocolat blanc, la crème chantilly et le lait d’amande fondent en un cœur délicieusement sucré et fondant. En fond, le cèdre, le santal crémeux et le musc blanc enveloppent la peau d’une chaleur douce et réconfortante, comme un souvenir tendre d’une journée au soleil.",
      "Hot Sand invite à prolonger l’instant suspendu d’un été radiant, entre douceur et légèreté, comme un chapitre délicatement écrit sur la peau."
    ],
    notes: {
      tete: 'Eau de Jasmin et Orchidée',
      coeur: 'Ganache de chocolat blanc, Crème chantilly et Lait d’amande',
      fond: 'Cèdre, Bois de Santal et Musc Blanc'
    }
  },
  {
    handle: 'mango-wave', name: 'Mango Wave', collection: 'summer-vibes',
    perfumer: 'chris-maurice',
    images: ['produits/mango-wave-1.webp', 'site/Mango_visu.webp', 'produits/mango-wave-3.webp'],
    keyNotes: 'Mangue · Framboise · Ambre',
    short: "Mango Wave mêle mangue juteuse, framboise éclatante et ambre gourmand dans un sillage solaire, fruité et addictif.",
    description: [
      "Mango Wave est une vague d’énergie fruitée et de douceur gourmande. En tête, la mangue juteuse et l’orange acidulée éclatent comme un souffle lumineux, vibrant sur la peau.",
      "Le cœur, fruité et floral, mêle grenade, framboise et jasmin, esquissant la douceur d’un soir d’été, suspendu entre chaleur et éclat. En fond, l’ambre, la mousse de chêne et la cassonade caramélisée composent un sillage captivant, riche et enveloppant.",
      "Mango Wave invite à vibrer, ralentir et savourer chaque instant, comme un chapitre solaire que l’on relit avec délice."
    ],
    notes: {
      tete: 'Mangue, Orange, Pêche et Safran',
      coeur: 'Grenade, Framboise et Jasmin',
      fond: 'Ambre, Mousse de Chêne et Cassonade'
    }
  },
  {
    handle: 'sun-ice', name: 'Sun Ice', collection: 'summer-vibes',
    perfumer: 'nathalie-feisthauer',
    images: ['produits/sun-ice-1.webp', 'site/SunIcevisu.webp', 'produits/sun-ice-3.webp'],
    keyNotes: 'Cassis · Pistache grillée · Vanille de Tahiti',
    short: "Sun Ice mêle pistache grillée, vanille de Tahiti et bois de santal dans une gourmandise solaire, crémeuse et enveloppante.",
    description: [
      "Sun Ice est une composition solaire, florale et gourmande, née de l’évocation d’une glace à la pistache artisanale, ce plaisir glacé qui fond lentement sous le soleil d’été, entre douceur sucrée et fraîcheur réconfortante.",
      "La fragrance s’ouvre sur une envolée pétillante de cassis et de bergamote d’Italie, telle une brise légère caressant la peau. En cœur, la pomme croquante, la pistache grillée, le toffee caramélisé et l’héliotrope velouté composent une partition savoureuse et addictive, rappelant les notes dorées d’une gelateria au bord de mer.",
      "Enfin, le fond dévoile une base boisée et sensuelle, où cèdre de Virginie, vanille de Tahiti, musc, fève tonka, bois de santal et ambre s’entrelacent. Une signature chaleureuse, enveloppante et élégante, qui prolonge sur la peau l’empreinte d’un été infini, entre crème glacée fondante et étreinte d’un soir d’août."
    ],
    notes: {
      tete: 'Cassis et Bergamote d’Italie',
      coeur: 'Pomme, Pistache grillée, Toffee et Héliotrope',
      fond: 'Cèdre de Virginie, Vanille de Tahiti, Musc, Fève de tonka, Santal et Ambre'
    }
  },
  {
    handle: 'palmeira', name: 'Palmeira', collection: 'summer-vibes',
    perfumer: 'chris-maurice',
    images: ['produits/palmeira-1.webp', 'site/Palmeiravisu.webp', 'produits/palmeira-3.webp'],
    keyNotes: 'Framboise · Violette · Praline',
    short: "Palmeira mêle fruits rouges juteux, violette et rose élégante, puis praline et santal dans un sillage fruité, floral et chaleureux.",
    description: [
      "Palmeira s’ouvre comme une promenade sous les frondaisons d’un jardin estival, où la lumière joue avec les feuilles et les fruits.",
      "En tête, framboise, fraise, cassis et myrtille forment une envolée lumineuse et juteuse, comme un panier de fruits fraîchement cueillis, éclatant de douceur et de vitalité. Au cœur, un bouquet élégant de violette, rose, prune et Ambroxan apporte profondeur et sophistication, équilibrant délicatesse florale et intensité fruitée, telle une lumière qui traverse les pages d’un récit d’été.",
      "En fond, la praline gourmande, le bois de santal velouté et le musc blanc soyeux créent un sillage chaleureux et enveloppant, réconfortant et captivant, comme le souvenir d’un après-midi suspendu entre rêve et réalité."
    ],
    notes: {
      tete: 'Framboise, Fraise, Cassis et Myrtille',
      coeur: 'Violette, Rose, Prune et Ambroxan',
      fond: 'Praline, Bois de Santal et Musc Blanc'
    }
  },
  {
    handle: 'ambert-sunset', name: 'Ambert Sunset', collection: 'summer-vibes',
    perfumer: 'chris-maurice',
    images: ['produits/ambert-sunset-1.webp', 'site/Ambervisu.webp', 'produits/ambert-sunset-3.webp'],
    keyNotes: 'Abricot · Iris · Cuir · Ambre',
    short: "Ambert Sunset mêle abricot doré, safran et osmanthus, puis rose, iris et jasmin, sur un fond d’ambre, cuir et santal dans un sillage chaud, floral et sensuel.",
    description: [
      "Ambert Sunset s’ouvre comme le dernier souffle d’un jour d’été, lorsque le ciel se pare de teintes dorées et que l’air devient plus doux, presque tangible.",
      "Dès l’ouverture, l’abricot velouté, le safran épicé et l’osmanthus lumineux esquissent les premiers rayons d’un coucher de soleil doré, fruité, floral et ambré, comme un chapitre s’ouvrant sur la lumière d’un soir d’été. Au cœur, la rose, l’iris pallida aux reflets poudrés et le jasmin composent une partition florale noble et vibrante, presque crépusculaire, où chaque note semble suspendre le temps. En fond, le cuir, l’ambre et le bois de santal s’entrelacent pour créer un sillage riche, sophistiqué et infiniment sensuel.",
      "Ambert Sunset est une ode au crépuscule, ce moment suspendu où le ciel se pare d’or liquide et où la lumière devient caresse, un hommage à la beauté d’un jour qui s’éteint, tout en volupté."
    ],
    notes: {
      tete: 'Abricot, Safran et Osmanthus',
      coeur: 'Rose, Iris pallida et Jasmin',
      fond: 'Cuir, Ambre et Bois de Santal'
    }
  },

  /* ---------------- Coffrets (exclusivité site) ---------------- */
  {
    handle: 'coffret-decouverte-2ml', name: 'Coffret Découverte', subtitle: 'Discovery set · 2 ml', collection: 'coffrets',
    type: 'Coffret', exclusive: true, tone: '#e4dccf',
    formats: [
      { id: 'sv', label: 'Summer Vibes · 5 × 2 ml', price: 30 },   // PRIX_A_CONFIRMER
      { id: 'so', label: 'Skin Obsession · 3 × 2 ml', price: 18 }  // PRIX_A_CONFIRMER
    ],
    keyNotes: 'Formats 2 ml · Crédité sur votre 100 ml',
    short: "La maison LIBRERY vous invite à parcourir sa bibliothèque olfactive. Pensé comme une préface à la collection, le Coffret Découverte ouvre les premières pages de nos créations à travers des formats de 2 ml.",
    description: [
      "La maison LIBRERY vous invite à parcourir sa bibliothèque olfactive. Pensé comme une préface à la collection, le Coffret Découverte ouvre les premières pages de nos créations à travers des formats de 2 ml. Chaque fragrance révèle un souvenir, une émotion, un chapitre à explorer au fil de votre lecture sensorielle.",
      "À la suite de votre commande, un code d’une valeur équivalente à celle du coffret vous sera envoyé par e-mail. Valable pendant 90 jours, il pourra être utilisé lors de l’achat d’un parfum 100 ml."
    ]
  },
  {
    handle: 'coffret-decouverte-30ml', name: 'Coffret Collection', subtitle: 'Discovery set · 30 ml', collection: 'coffrets',
    type: 'Coffret', exclusive: true, tone: '#d9cfc0',
    formats: [
      { id: 'sv', label: 'Summer Vibes · 5 × 30 ml', price: 320 },  // PRIX_A_CONFIRMER
      { id: 'so', label: 'Skin Obsession · 3 × 30 ml', price: 200 } // PRIX_A_CONFIRMER
    ],
    keyNotes: 'Extraits de parfum 30 ml · Une collection complète',
    short: "Nos coffrets en extrait de parfum 30 ml, réunissant les créations d’une même collection.",
    description: [
      "Découvrez également nos coffrets découverte en extrait de parfum 30 ml, réunissant les créations d’une même collection.",
      "Une immersion plus profonde dans chaque univers, pour parcourir ses chapitres, en saisir les subtilités, ressentir les émotions qu’il raconte et les souvenirs qu’il renferme — comme on feuillette un livre dont chaque page écrit un peu de votre propre histoire."
    ]
  }
];

const COLLECTIONS = {
  'skin-obsession': {
    title: 'Skin Obsession', kicker: 'Nouvelle collection', chapter: 'Chapitre II',
    lead: "Entre sensualité, mémoire et émotion, Skin Obsession capture cette envie irrésistible de revenir à une odeur familière, presque instinctivement. Une collection habitée par la peau, pensée pour laisser une empreinte durable — dans l’instant comme dans la mémoire.",
    body: [
      { p: [
        "Skin Obsession est une exploration de l’attachement invisible qui unit le parfum à la peau. Une collection de trois fragrances pensées comme autant de variations d’une même idée : celle de l’addiction olfactive, de ce besoin subtil mais irrépressible de revenir vers une odeur, encore et encore.",
        "Ici, la peau n’est pas un support. Elle est le point de départ, le berceau de l’émotion. C’est elle qui donne vie au parfum, qui en révèle la chaleur, la texture, la singularité. Chaque fragrance s’y dépose comme une seconde nature, évolue avec elle, et crée une signature intime, presque instinctive.",
        "Skin Obsession ne cherche pas la discrétion. Elle travaille l’attraction, ce moment précis où une senteur accroche la mémoire et s’y installe durablement. Porter Skin Obsession, c’est entrer dans un dialogue continu avec sa propre peau.",
        "Skin Obsession n’est pas une collection que l’on porte. C’est une collection à laquelle on revient. Toujours."
      ] },
      { h: 'La naissance de Skin Obsession', p: [
        "Chez LIBRERY, chaque parfum est pensé comme un chapitre vivant au sein d’une bibliothèque olfactive où les histoires ne se lisent pas : elles se ressentent. Chaque création prend vie sur la peau, évolue au fil des heures et révèle une interprétation différente selon celui ou celle qui la porte.",
        "Développée avec DSM-Firmenich, la collection Skin Obsession prolonge cette approche sensorielle du parfum. Réalisées par la parfumeure Coralie Spicher, les trois créations sont nées d’une alchimie immédiate avec le fondateur de la maison. Dès les premiers échanges, une compréhension instinctive des briefs s’est imposée, donnant naissance à une collection fidèle à l’écriture émotionnelle et immersive propre à LIBRERY.",
        "Ensemble, ils ont imaginé trois extraits de parfum concentrés à 25 %, conçus pour explorer ce lien invisible entre le parfum et la peau, entre l’attraction et la mémoire, entre la présence et le manque. De cette rencontre entre narration, intuition et maîtrise des matières naissent trois interprétations singulières de l’obsession olfactive."
      ] },
      { h: 'La peau, territoire vivant du parfum', p: [
        "Le parfum n’existe jamais isolé. Il trouve sa vérité dans la rencontre intime avec la peau, là où il cesse d’être une formule pour devenir une présence.",
        "Chaque peau possède sa propre chimie, sa propre intensité. Elle retient certaines notes, en révèle d’autres, en modifie parfois la perception. Ainsi, un même parfum ne se répète jamais. Il devient une lecture unique, une interprétation intime, profondément liée à celui ou celle qui le porte.",
        "Ici, le parfum ne se porte pas. Il s’accorde. Il s’intègre. Il devient."
      ] }
    ]
  },
  'summer-vibes': {
    title: 'Summer Vibes', kicker: 'Collection', chapter: 'Chapitre I',
    image: 'site/fond2_horizontal.webp',
    lead: "Il est des étés qui ne s’achèvent jamais vraiment. Des étés qui persistent sous la peau, dans la lumière des souvenirs, dans la chaleur invisible que l’on croit avoir oubliée.",
    body: [
      { p: [
        "LIBRERY les a retenus, non pour les figer, mais pour les relire. Les assembler comme un roman lumineux, dont chaque page exhale une émotion différente : Summer Vibes. Une collection comme une traversée.",
        "Cinq récits solaires s’y déploient, non pas comme des parfums isolés, mais comme les fragments d’une même histoire continue — celle d’un été éternel. Un été que l’on ne regarde pas seulement, mais que l’on reconnaît instinctivement, comme s’il avait toujours existé en nous.",
        "Dès les premières pages, la lumière se fait matière. Elle glisse sur la peau, s’y dépose, s’y attarde. Puis viennent les fruits — pulpe éclatante, chair juteuse, excès de vie. Plus loin, le temps se rafraîchit. Un souffle glacé traverse la chaleur, comme un sorbet au cœur de l’après-midi. Et enfin, le jour décline. Le crépuscule s’étire, doré, silencieux.",
        "Fidèle à l’esprit de LIBRERY, cette collection n’impose rien. Elle ouvre. Elle ne raconte pas un été unique. Elle en réveille mille. Et chacun y retrouve le sien."
      ] },
      { h: 'Chronique d’un été qui ne s’achève jamais', p: [
        "Il suffit d’effleurer le flacon pour que la première page s’ouvre. Des grains de sable encore tièdes se mêlent à l’eau de jasmin et à l’orchidée, tandis que la douceur d’une ganache au chocolat blanc fond sous le soleil. Hot Sand est un prélude sensuel où la mer s’étire comme une encre ambrée sur la peau.",
        "Le chapitre suivant jaillit comme une vague tropicale. Mangue juteuse, orange acidulée et pêche veloutée s’élancent avec énergie. Mango Wave respire l’exubérance des marchés lointains, enveloppée d’ambre et de mousse de chêne, comme un souffle de soleil vibrant.",
        "Quand la chaleur devient mirage, surgit Sun Ice, granité glacé porté au nez. Cassis pétillant et bergamote italienne givrent l’air, tandis que la pomme croquante s’allie à la pistache grillée et au caramel.",
        "Palmeira est une sieste sous les frondaisons. Une brassée de framboises, fraises et cassis ruisselle dans la lumière ; violette, rose et prune tissent un hamac floral, tandis qu’une praline boisée fond doucement au creux du soir.",
        "Au bord du jour qui s’éteint, Ambert Sunset déploie son coucher de soleil éternel. L’abricot s’enflamme de safran, l’osmanthus dialogue avec la rose et l’iris, puis un cuir mordoré et un ambre incandescent ferment la scène, laissant derrière eux un sillage dense comme un ciel de juillet baigné d’or liquide."
      ] }
    ]
  },
  'coffrets': {
    title: 'Coffrets Découverte', kicker: 'Exclusivité site', chapter: 'Préface',
    lead: "Parcourir la bibliothèque avant d’y choisir son livre. Nos coffrets ouvrent les premières pages de chaque collection — et la valeur du coffret 2 ml vous est restituée sur l’achat d’un 100 ml.",
    body: []
  },
  'bougies': {
    title: 'Bougies', kicker: 'Bientôt', chapter: 'Chapitre à venir',
    lead: "Un nouveau chapitre s’écrit. Les récits LIBRERY s’apprêtent à quitter la peau pour habiter l’espace. Inscrivez-vous pour être parmi les premiers à les découvrir.",
    body: [], soon: true
  }
};

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
