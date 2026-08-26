import type { TimelineEvent, Tradition, TraditionId } from './timeline-types'

export const DATA_VERSION = 1

export const TRADITIONS: Tradition[] = [
  {
    id: 'east-syriac',
    name: 'Church of the East',
    blurb: 'The East Syriac church of Persia, Central Asia and China.',
    lane: 0,
    family: 'sapphire',
  },
  {
    id: 'oriental',
    name: 'Oriental Orthodox',
    blurb: 'Coptic, Syriac, Armenian, Ethiopian and Indian churches.',
    lane: 1,
    family: 'sapphire',
  },
  {
    id: 'orthodox',
    name: 'Eastern Orthodox',
    blurb: 'The Greek and Slavic communion of autocephalous churches.',
    lane: 2,
    family: 'sapphire',
  },
  {
    id: 'undivided',
    name: 'Undivided Church',
    blurb: 'The shared trunk of the first millennium — and later attempts to rejoin it.',
    lane: 3,
    family: 'gold',
  },
  {
    id: 'catholic',
    name: 'Roman Catholic',
    blurb: 'The Latin West gathered around the See of Rome.',
    lane: 4,
    family: 'ruby',
  },
  {
    id: 'protestant',
    name: 'Lutheran & Reformed',
    blurb: 'The magisterial Reformation of Luther, Zwingli and Calvin.',
    lane: 5,
    family: 'emerald',
  },
  {
    id: 'radical',
    name: 'Anabaptist & Baptist',
    blurb: 'The Radical Reformation and the free-church tradition.',
    lane: 6,
    family: 'emerald',
  },
  {
    id: 'anglican',
    name: 'Anglican',
    blurb: 'The Church of England and the worldwide Anglican Communion.',
    lane: 7,
    family: 'amethyst',
  },
  {
    id: 'methodist',
    name: 'Methodist & Holiness',
    blurb: 'Wesleyan revival, Methodism and the Holiness movement.',
    lane: 8,
    family: 'amethyst',
  },
  {
    id: 'pentecostal',
    name: 'Pentecostal',
    blurb: 'Twentieth-century Pentecostal and charismatic Christianity.',
    lane: 9,
    family: 'amethyst',
  },
]

export const TRADITION_MAP: Record<TraditionId, Tradition> = TRADITIONS.reduce(
  (acc, tradition) => {
    acc[tradition.id] = tradition
    return acc
  },
  {} as Record<TraditionId, Tradition>,
)

const wiki = (slug: string) => `https://en.wikipedia.org/wiki/${slug}`

export const SEED_EVENTS: TimelineEvent[] = [
  {
    id: 'pentecost',
    year: 33,
    dateLabel: 'c. AD 33',
    title: 'Pentecost',
    tradition: 'undivided',
    parents: [],
    kind: 'event',
    icon: { type: 'lucide', name: 'Flame' },
    summary:
      'Fifty days after the resurrection, the Spirit falls on the disciples gathered in Jerusalem and the church begins to preach publicly.',
    detail:
      'Acts 2 describes tongues of fire, a rush of wind and Peter preaching to a crowd drawn from across the Mediterranean world. Roughly three thousand are baptised in a single day.\n\nEvery branch on this chart traces its descent through this moment. Whatever else divides them, Pentecost is the common root: a Jewish messianic movement in Jerusalem that within a generation had congregations from Rome to Mesopotamia.',
    keyFigures: ['Peter', 'The Eleven', 'Mary and the women of Galilee'],
    links: [
      { label: 'Pentecost — Wikipedia', url: wiki('Pentecost') },
      { label: 'Acts 2 (Bible Gateway)', url: 'https://www.biblegateway.com/passage/?search=Acts%202' },
    ],
  },
  {
    id: 'jerusalem-council',
    year: 50,
    dateLabel: 'c. AD 50',
    title: 'Council of Jerusalem',
    tradition: 'undivided',
    parents: ['pentecost'],
    kind: 'council',
    icon: { type: 'lucide', name: 'Users' },
    summary:
      'The apostles rule that Gentile believers need not be circumcised, opening the church beyond its Jewish matrix.',
    detail:
      'Acts 15 records the first great controversy: must Gentile converts keep the Law of Moses? Paul and Barnabas argue no; James proposes a minimal set of conditions; the assembly agrees.\n\nThe decision is the reason there is a world church rather than a Jewish sect. It also establishes the pattern that would define the next thousand years — disputed questions settled by a gathered council rather than by a single voice.',
    keyFigures: ['James the Just', 'Paul of Tarsus', 'Barnabas', 'Peter'],
    links: [{ label: 'Council of Jerusalem — Wikipedia', url: wiki('Council_of_Jerusalem') }],
  },
  {
    id: 'edict-milan',
    year: 313,
    dateLabel: '313',
    title: 'Edict of Milan',
    tradition: 'undivided',
    parents: ['jerusalem-council'],
    kind: 'event',
    icon: { type: 'lucide', name: 'ScrollText' },
    summary:
      'Constantine and Licinius grant Christians legal toleration, ending three centuries of intermittent persecution.',
    detail:
      'Property is restored, worship is legalised and bishops begin to receive imperial patronage. Within a lifetime Christianity moves from an illegal association to the favoured religion of the Roman state.\n\nThe consequences run in both directions. The church gains basilicas, archives and public influence; it also gains an emperor with opinions about doctrine, which shapes every council that follows.',
    keyFigures: ['Constantine I', 'Licinius'],
    links: [{ label: 'Edict of Milan — Wikipedia', url: wiki('Edict_of_Milan') }],
  },
  {
    id: 'nicaea',
    year: 325,
    dateLabel: '325',
    title: 'First Council of Nicaea',
    tradition: 'undivided',
    parents: ['edict-milan'],
    kind: 'council',
    icon: { type: 'lucide', name: 'Landmark' },
    summary:
      'The first ecumenical council rejects Arianism and confesses the Son as "of one substance" with the Father.',
    detail:
      'Around three hundred bishops meet at Constantine\'s summons to answer the Alexandrian presbyter Arius, who taught that the Son was the first and highest creature. The council answers with the term homoousios — of one being with the Father.\n\nNicaea also fixed the dating of Easter and issued canons on church order. Its creed, expanded at Constantinople in 381, remains the one confession recited by Catholics, Orthodox, Anglicans and most Protestants alike.',
    keyFigures: ['Athanasius of Alexandria', 'Arius', 'Constantine I', 'Ossius of Córdoba'],
    links: [
      { label: 'First Council of Nicaea — Wikipedia', url: wiki('First_Council_of_Nicaea') },
      { label: 'Nicene Creed — Wikipedia', url: wiki('Nicene_Creed') },
    ],
  },
  {
    id: 'constantinople-i',
    year: 381,
    dateLabel: '381',
    title: 'First Council of Constantinople',
    tradition: 'undivided',
    parents: ['nicaea'],
    kind: 'council',
    icon: { type: 'lucide', name: 'Feather' },
    summary:
      'Nicaea is reaffirmed and the creed is expanded to confess the deity of the Holy Spirit.',
    detail:
      'Half a century of Arian ascendancy is finally reversed under Theodosius I. The Cappadocian theologians — Basil, Gregory of Nazianzus, Gregory of Nyssa — supply the vocabulary of one essence in three persons.\n\nThe council also raised the bishop of Constantinople to a rank second only to Rome, a status claim that would irritate the Latin West for centuries and feed the estrangement that ends in 1054.',
    keyFigures: ['Gregory of Nazianzus', 'Basil the Great', 'Theodosius I'],
    links: [
      { label: 'First Council of Constantinople — Wikipedia', url: wiki('First_Council_of_Constantinople') },
    ],
  },
  {
    id: 'ephesus',
    year: 431,
    dateLabel: '431',
    title: 'Council of Ephesus',
    tradition: 'undivided',
    parents: ['constantinople-i'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Scale' },
    summary:
      'Nestorius is condemned and Mary is confessed as Theotokos — the first lasting division in the church.',
    detail:
      'The dispute was about how divinity and humanity are united in Christ, and whether Mary can properly be called Mother of God. Cyril of Alexandria pressed the case against Nestorius, patriarch of Constantinople, whose formula seemed to divide Christ into two subjects.\n\nEphesus produced the first branch on this chart that never rejoined. The East Syriac church beyond the Roman frontier refused the condemnation of its teachers and continued as a separate communion.',
    keyFigures: ['Cyril of Alexandria', 'Nestorius', 'Theodosius II'],
    links: [{ label: 'Council of Ephesus — Wikipedia', url: wiki('Council_of_Ephesus') }],
  },
  {
    id: 'church-of-east',
    year: 431,
    dateLabel: '431 onward',
    title: 'Church of the East',
    tradition: 'east-syriac',
    parents: ['ephesus'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Compass' },
    summary:
      'The Syriac-speaking church of the Persian Empire declines the Ephesine settlement and develops its own hierarchy under the Catholicos of Seleucia-Ctesiphon.',
    detail:
      'Outside Roman jurisdiction, the East Syriac church answered to the Sasanian shahs rather than the emperor, and its theology preserved the Antiochene emphasis on the full humanity of Christ.\n\nFar from marginal, it became the most geographically extensive church of the Middle Ages, with metropolitans in Merv, Herat, India and China. Modern heirs include the Assyrian Church of the East and the Chaldean Catholic Church.',
    keyFigures: ['Babai the Great', 'Narsai of Nisibis'],
    links: [{ label: 'Church of the East — Wikipedia', url: wiki('Church_of_the_East') }],
  },
  {
    id: 'chalcedon',
    year: 451,
    dateLabel: '451',
    title: 'Council of Chalcedon',
    tradition: 'undivided',
    parents: ['ephesus'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Gavel' },
    summary:
      'Christ is defined as one person in two natures — a formula much of Egypt, Syria and Armenia could not accept.',
    detail:
      'The Chalcedonian Definition steered between Nestorius and Eutyches: one person, made known in two natures, without confusion, change, division or separation. Pope Leo\'s Tome was read as the standard of orthodoxy.\n\nThe wording split the Eastern church. Those who held to Cyril\'s "one incarnate nature" — miaphysites — rejected the council, and imperial pressure hardened the divide into permanent separation. Modern dialogue suggests much of the quarrel was over vocabulary rather than substance.',
    keyFigures: ['Pope Leo I', 'Marcian', 'Dioscorus of Alexandria'],
    links: [
      { label: 'Council of Chalcedon — Wikipedia', url: wiki('Council_of_Chalcedon') },
      { label: 'Chalcedonian Definition — Wikipedia', url: wiki('Chalcedonian_Definition') },
    ],
  },
  {
    id: 'oriental-communion',
    year: 451,
    dateLabel: '451 onward',
    title: 'Oriental Orthodox Communion',
    tradition: 'oriental',
    parents: ['chalcedon'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Sun' },
    summary:
      'The Coptic, Syriac, Armenian, Ethiopian and later Indian churches continue outside the Chalcedonian settlement.',
    detail:
      'These churches accept the first three ecumenical councils and confess one united nature of the incarnate Word. Their liturgies — Coptic, West Syriac, Armenian, Ge\'ez — are among the oldest continuously used rites in Christianity.\n\nSeverus of Antioch gave the position its mature theological form. Under Muslim rule from the seventh century, these communities became durable minority churches, several of which survive as majority-shaping institutions in Egypt, Armenia and Ethiopia.',
    keyFigures: ['Severus of Antioch', 'Jacob Baradaeus', 'Dioscorus of Alexandria'],
    links: [{ label: 'Oriental Orthodoxy — Wikipedia', url: wiki('Oriental_Orthodoxy') }],
  },
  {
    id: 'dvin',
    year: 506,
    dateLabel: '506',
    title: 'Council of Dvin',
    tradition: 'oriental',
    parents: ['oriental-communion'],
    kind: 'council',
    icon: { type: 'lucide', name: 'Mountain' },
    summary:
      'The Armenian church formally rejects Chalcedon, setting its own confessional course.',
    detail:
      'Armenia had been absent from Chalcedon, occupied with war and persecution. At Dvin its bishops endorsed the Henotikon and repudiated the council, aligning the Armenian Apostolic Church with the miaphysite churches of Egypt and Syria.\n\nA second synod at Dvin in 555 confirmed the decision. Armenian Christianity — with its own alphabet, liturgy and monastic culture — became one of the strongest markers of national identity in the Christian world.',
    keyFigures: ['Catholicos Babken I'],
    links: [{ label: 'Armenian Apostolic Church — Wikipedia', url: wiki('Armenian_Apostolic_Church') }],
  },
  {
    id: 'gregory-great',
    year: 590,
    dateLabel: '590',
    title: 'Gregory the Great elected',
    tradition: 'undivided',
    parents: ['chalcedon'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Crown' },
    summary:
      'A Roman monk becomes pope, reorganises the Western church and sends missionaries to the English.',
    detail:
      'With imperial power collapsing in Italy, Gregory fed the city, negotiated with the Lombards and administered vast church estates — in effect governing Rome. His Pastoral Rule became the standard handbook for medieval bishops.\n\nHe also despatched Augustine to Kent in 597, planting the see of Canterbury. The papacy that Luther and Henry VIII would later confront takes recognisable shape here.',
    keyFigures: ['Gregory I', 'Augustine of Canterbury'],
    links: [{ label: 'Pope Gregory I — Wikipedia', url: wiki('Pope_Gregory_I') }],
  },
  {
    id: 'east-syriac-china',
    year: 635,
    dateLabel: '635',
    title: 'East Syriac mission to China',
    tradition: 'east-syriac',
    parents: ['church-of-east'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Ship' },
    summary:
      'The monk Alopen reaches the Tang capital of Chang\'an, and Christianity is preached in Chinese for the first time.',
    detail:
      'The Xi\'an Stele, erected in 781, records the mission in Chinese and Syriac: imperial audiences, translated scriptures and monasteries under Tang patronage.\n\nAt its height the Church of the East stretched from Egypt to the Pacific along the Silk Road — the largest Christian communion on earth by area, though little remembered in the West.',
    keyFigures: ['Alopen', 'Emperor Taizong of Tang'],
    links: [{ label: 'Xi\'an Stele — Wikipedia', url: wiki('Xi%27an_Stele') }],
  },
  {
    id: 'nicaea-ii',
    year: 787,
    dateLabel: '787',
    title: 'Second Council of Nicaea',
    tradition: 'undivided',
    parents: ['gregory-great'],
    kind: 'council',
    icon: { type: 'lucide', name: 'Key' },
    summary:
      'The veneration of icons is restored, ending the first iconoclast controversy.',
    detail:
      'For half a century emperors had ordered the destruction of religious images. The council distinguished veneration offered to an image from the worship due to God alone, and defended icons as a consequence of the incarnation.\n\nThis is the last council recognised as ecumenical by both East and West. After it, the two halves of Christendom largely stop legislating together — the road to 1054 runs through that silence.',
    keyFigures: ['Empress Irene', 'John of Damascus', 'Patriarch Tarasios'],
    links: [{ label: 'Second Council of Nicaea — Wikipedia', url: wiki('Second_Council_of_Nicaea') }],
  },
  {
    id: 'great-schism',
    year: 1054,
    dateLabel: '16 July 1054',
    title: 'The Great Schism',
    tradition: 'undivided',
    parents: ['nicaea-ii'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Split' },
    summary:
      'Papal legates and the patriarch of Constantinople excommunicate one another, formalising the rupture between East and West.',
    detail:
      'Cardinal Humbert laid a bull of excommunication on the altar of Hagia Sophia; Patriarch Michael Cerularius answered in kind. The immediate quarrels were over the filioque clause, unleavened bread, clerical marriage and papal jurisdiction.\n\nThe deeper causes were centuries of political and linguistic drift between a Greek East and a Latin West. Contemporaries did not think the split permanent — but repeated attempts at reunion failed, and the mutual anathemas stood until 1965.',
    keyFigures: ['Michael I Cerularius', 'Cardinal Humbert', 'Pope Leo IX'],
    links: [{ label: 'East–West Schism — Wikipedia', url: wiki('East%E2%80%93West_Schism') }],
  },
  {
    id: 'eastern-orthodoxy',
    year: 1054,
    dateLabel: '1054 onward',
    title: 'Eastern Orthodox Church',
    tradition: 'orthodox',
    parents: ['great-schism'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Church' },
    summary:
      'The Greek East continues as a communion of self-governing churches holding the seven councils, with Constantinople first in honour.',
    detail:
      'Orthodoxy is organised as a family of autocephalous churches rather than a single jurisdiction. The ecumenical patriarch is first among equals, not a pope; doctrine is held to be settled by the seven councils and guarded by the whole body of the faithful.\n\nIts worship — the Divine Liturgy of John Chrysostom, icons, the hesychast tradition of prayer — has changed remarkably little in a thousand years.',
    keyFigures: ['Gregory Palamas', 'Photios I', 'Symeon the New Theologian'],
    links: [{ label: 'Eastern Orthodox Church — Wikipedia', url: wiki('Eastern_Orthodox_Church') }],
  },
  {
    id: 'roman-catholicism',
    year: 1054,
    dateLabel: '1054 onward',
    title: 'Roman Catholic Church',
    tradition: 'catholic',
    parents: ['great-schism'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Landmark' },
    summary:
      'The Latin West consolidates around the papacy, canon law and the universities.',
    detail:
      'The reforming popes of the eleventh century asserted the independence of the church from lay rulers and the primacy of Rome over all bishops. Out of that programme came canon law, the friars, scholastic theology and the medieval university.\n\nBy 1300 the Western church was the most sophisticated administrative institution in Europe — and the accumulated grievances against that institution supplied the tinder for 1517.',
    keyFigures: ['Gregory VII', 'Thomas Aquinas', 'Innocent III', 'Francis of Assisi'],
    links: [{ label: 'Catholic Church — Wikipedia', url: wiki('Catholic_Church') }],
  },
  {
    id: 'fourth-crusade',
    year: 1204,
    dateLabel: '1204',
    title: 'Sack of Constantinople',
    tradition: 'orthodox',
    parents: ['eastern-orthodoxy'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Swords' },
    summary:
      'Crusaders divert to Constantinople, sack the city and install a Latin patriarch — hardening the schism into lasting bitterness.',
    detail:
      'For three days the army of the Fourth Crusade looted the greatest Christian city in the world, stripping Hagia Sophia and shipping relics west. A Latin empire was set up over Greek territory for nearly sixty years.\n\nWhatever theological hopes remained for reunion did not survive this. Pope John Paul II apologised for the sack in 2001; Orthodox memory of it is still vivid.',
    keyFigures: ['Enrico Dandolo', 'Boniface of Montferrat', 'Pope Innocent III'],
    links: [{ label: 'Fourth Crusade — Wikipedia', url: wiki('Fourth_Crusade') }],
  },
  {
    id: 'western-schism',
    year: 1378,
    dateLabel: '1378–1417',
    title: 'The Western Schism',
    tradition: 'catholic',
    parents: ['roman-catholicism'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Split' },
    summary:
      'Rival popes in Rome and Avignon — and briefly a third in Pisa — divide Latin Christendom for a generation.',
    detail:
      'Competing lines of popes excommunicated each other and each other\'s followers while kingdoms picked sides. Only the Council of Constance (1414–18) resolved it, by deposing claimants and electing Martin V.\n\nThe episode did lasting damage to papal prestige and gave weight to conciliarism — the claim that a general council outranks a pope. It also produced Hus and Wycliffe, whose reforming ideas anticipated the next century.',
    keyFigures: ['Urban VI', 'Clement VII', 'Jan Hus', 'Martin V'],
    links: [{ label: 'Western Schism — Wikipedia', url: wiki('Western_Schism') }],
  },
  {
    id: 'florence',
    year: 1439,
    dateLabel: '1439',
    title: 'Council of Florence',
    tradition: 'orthodox',
    parents: ['fourth-crusade'],
    kind: 'reunion',
    icon: { type: 'lucide', name: 'Handshake' },
    summary:
      'A reunion of East and West is signed under military pressure — and repudiated almost at once in the East.',
    detail:
      'With the Ottomans at the gates, Byzantine emperor John VIII sought Western help and accepted a union that conceded the filioque and papal primacy. Mark of Ephesus refused to sign.\n\nThe clergy and people of Constantinople rejected the terms; the promised crusade never materialised. Florence became the standard illustration in Orthodox memory that unity imposed from above does not hold.',
    keyFigures: ['John VIII Palaiologos', 'Bessarion', 'Mark of Ephesus', 'Pope Eugene IV'],
    links: [{ label: 'Council of Florence — Wikipedia', url: wiki('Council_of_Florence') }],
  },
  {
    id: 'fall-of-constantinople',
    year: 1453,
    dateLabel: '29 May 1453',
    title: 'Fall of Constantinople',
    tradition: 'orthodox',
    parents: ['florence'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Anchor' },
    summary:
      'The Ottoman conquest ends the Byzantine Empire; the patriarchate continues under Muslim rule as head of the Orthodox millet.',
    detail:
      'Hagia Sophia became a mosque and the emperor died in the breach. The patriarch, however, was confirmed by Mehmed II as civil as well as religious head of the Orthodox population.\n\nGreek scholars fleeing west fed the Renaissance; the church itself entered four centuries of survival under Ottoman rule, while leadership of Orthodox Christendom shifted north toward Moscow.',
    keyFigures: ['Mehmed II', 'Constantine XI', 'Gennadius Scholarius'],
    links: [{ label: 'Fall of Constantinople — Wikipedia', url: wiki('Fall_of_Constantinople') }],
  },
  {
    id: 'ninety-five-theses',
    year: 1517,
    dateLabel: '31 Oct 1517',
    title: 'The Ninety-five Theses',
    tradition: 'protestant',
    parents: ['roman-catholicism'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Hammer' },
    summary:
      'Martin Luther attacks the sale of indulgences, and the printing press turns an academic dispute into the Protestant Reformation.',
    detail:
      'Luther meant to debate the theology of penance. Printers had his theses across Germany within weeks. By 1521 he had been excommunicated and outlawed, and had answered at Worms that he could not recant.\n\nThe programme that followed — justification by faith alone, the authority of Scripture over tradition, the priesthood of all believers, worship and Bibles in the vernacular — reorganised the religion of half of Europe within a single lifetime.',
    keyFigures: ['Martin Luther', 'Philip Melanchthon', 'Frederick the Wise', 'Pope Leo X'],
    links: [
      { label: 'Ninety-five Theses — Wikipedia', url: wiki('Ninety-five_Theses') },
      { label: 'Reformation — Wikipedia', url: wiki('Reformation') },
    ],
  },
  {
    id: 'zurich-baptisms',
    year: 1525,
    dateLabel: '21 Jan 1525',
    title: 'First adult baptisms in Zürich',
    tradition: 'radical',
    parents: ['ninety-five-theses'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Droplet' },
    summary:
      'A small group re-baptises one another in defiance of the city council, beginning the Radical Reformation.',
    detail:
      'Conrad Grebel and his circle concluded that Zwingli had stopped half-way: if Scripture alone rules, infant baptism and a state-run church must both go. Their answer was a believers\' church of the voluntarily baptised.\n\nAnabaptists were hunted by Catholics and Protestants alike. From them descend the Mennonites, Hutterites and Amish, and — through their influence on English Separatists — much of the Baptist tradition, along with the ideas of religious liberty and separation of church and state.',
    keyFigures: ['Conrad Grebel', 'Felix Manz', 'George Blaurock', 'Menno Simons'],
    links: [{ label: 'Anabaptism — Wikipedia', url: wiki('Anabaptism') }],
  },
  {
    id: 'schleitheim',
    year: 1527,
    dateLabel: '1527',
    title: 'Schleitheim Confession',
    tradition: 'radical',
    parents: ['zurich-baptisms'],
    kind: 'event',
    icon: { type: 'lucide', name: 'ScrollText' },
    summary:
      'Seven articles define the Anabaptist vision: believers\' baptism, church discipline, refusal of the sword and of oaths.',
    detail:
      'Drafted largely by Michael Sattler, the articles set out a separated church — pacifist, disciplined, deliberately distinct from civil society. Sattler was executed within months of signing.\n\nSchleitheim remains the clearest early statement of free-church principle, and its influence reaches well beyond its own descendants into modern debates about church and state.',
    keyFigures: ['Michael Sattler'],
    links: [{ label: 'Schleitheim Confession — Wikipedia', url: wiki('Schleitheim_Confession') }],
  },
  {
    id: 'augsburg-confession',
    year: 1530,
    dateLabel: '25 June 1530',
    title: 'Augsburg Confession',
    tradition: 'protestant',
    parents: ['ninety-five-theses'],
    kind: 'event',
    icon: { type: 'lucide', name: 'BookOpen' },
    summary:
      'Melanchthon presents the Lutheran case to Charles V — the founding confession of a distinct Lutheran church.',
    detail:
      'Twenty-eight articles argue that the evangelical party teaches nothing contrary to the catholic faith, and list the abuses it has corrected. The emperor rejected it, and the Protestant princes formed a defensive league.\n\nAugsburg gave Lutheranism a text to be measured by. The 1555 Peace of Augsburg then made confessional identity a matter of territorial law — cuius regio, eius religio — cementing the map of a divided Europe.',
    keyFigures: ['Philip Melanchthon', 'Charles V', 'John Frederick of Saxony'],
    links: [{ label: 'Augsburg Confession — Wikipedia', url: wiki('Augsburg_Confession') }],
  },
  {
    id: 'act-of-supremacy',
    year: 1534,
    dateLabel: '1534',
    title: 'Act of Supremacy — the Anglican split',
    tradition: 'anglican',
    parents: ['roman-catholicism'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Crown' },
    summary:
      'Parliament declares Henry VIII supreme head of the Church of England, severing English jurisdiction from Rome.',
    detail:
      'The trigger was Henry\'s desire to annul his marriage to Catherine of Aragon; the mechanism was statute law. The break was jurisdictional before it was doctrinal — the English church kept bishops, cathedrals and much of its liturgy while dissolving the monasteries and repudiating papal authority.\n\nDoctrinal reform came under Edward VI, was reversed under Mary I, and was settled under Elizabeth I into a distinctive middle way: catholic order with reformed theology.',
    keyFigures: ['Henry VIII', 'Thomas Cranmer', 'Thomas Cromwell', 'Thomas More'],
    links: [
      { label: 'Act of Supremacy 1534 — Wikipedia', url: wiki('Acts_of_Supremacy') },
      { label: 'English Reformation — Wikipedia', url: wiki('English_Reformation') },
    ],
  },
  {
    id: 'institutes',
    year: 1536,
    dateLabel: '1536',
    title: 'Calvin\'s Institutes and the Reformed church',
    tradition: 'protestant',
    parents: ['ninety-five-theses'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Printer' },
    summary:
      'John Calvin publishes the Institutes of the Christian Religion and begins to build a reformed city in Geneva.',
    detail:
      'The Institutes, revised until 1559, gave the Reformed wing a systematic theology: the sovereignty of God, election, covenant, and a church governed by pastors and elders rather than bishops.\n\nGeneva became a school for exiles who carried Reformed Christianity to France, Scotland, the Netherlands, Hungary and eventually New England. Presbyterian, Congregational and Continental Reformed churches all descend from this stream.',
    keyFigures: ['John Calvin', 'Theodore Beza', 'John Knox', 'Huldrych Zwingli'],
    links: [
      { label: 'John Calvin — Wikipedia', url: wiki('John_Calvin') },
      { label: 'Calvinism — Wikipedia', url: wiki('Calvinism') },
    ],
  },
  {
    id: 'trent',
    year: 1545,
    dateLabel: '1545–1563',
    title: 'Council of Trent',
    tradition: 'catholic',
    parents: ['roman-catholicism', 'ninety-five-theses'],
    kind: 'council',
    icon: { type: 'lucide', name: 'Gavel' },
    summary:
      'Rome answers the Reformation: doctrine is defined against Protestant positions and clerical abuses are reformed.',
    detail:
      'Over eighteen years and three sessions, Trent affirmed scripture and tradition together, seven sacraments, transubstantiation and justification as more than imputation — while abolishing the sale of indulgences and requiring seminaries and resident bishops.\n\nThe result was a confident, disciplined Catholicism that held the line in southern Europe and expanded across the Americas and Asia. Its settlement governed Catholic life until the 1960s.',
    keyFigures: ['Pope Paul III', 'Charles Borromeo', 'Ignatius of Loyola'],
    links: [{ label: 'Council of Trent — Wikipedia', url: wiki('Council_of_Trent') }],
  },
  {
    id: 'book-of-common-prayer',
    year: 1549,
    dateLabel: '1549',
    title: 'Book of Common Prayer',
    tradition: 'anglican',
    parents: ['act-of-supremacy'],
    kind: 'event',
    icon: { type: 'lucide', name: 'BookOpen' },
    summary:
      'Cranmer\'s vernacular liturgy gives the English church a single prayer book — and English a body of enduring prose.',
    detail:
      'One use replaced the varied Latin rites of medieval England, in language ordinary people could follow. The 1552 revision moved further in a Reformed direction; the 1662 edition became the long-standing standard.\n\nAnglican identity has rested more on common prayer than on a confession of faith. Wherever the tradition spread, the prayer book went with it.',
    keyFigures: ['Thomas Cranmer', 'Edward VI'],
    links: [{ label: 'Book of Common Prayer — Wikipedia', url: wiki('Book_of_Common_Prayer') }],
  },
  {
    id: 'elizabethan-settlement',
    year: 1559,
    dateLabel: '1559',
    title: 'Elizabethan Settlement',
    tradition: 'anglican',
    parents: ['book-of-common-prayer'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Scale' },
    summary:
      'Elizabeth I re-establishes a reformed but episcopal Church of England — the via media that defines Anglicanism.',
    detail:
      'The Acts of Supremacy and Uniformity, the Thirty-nine Articles and a revised prayer book together produced a church broad enough to hold Calvinist theology and traditional ceremony in the same building.\n\nSome could not accept the compromise. Puritans pressed for further reform, and Separatists left altogether — a pressure that produced Congregationalists, English Baptists and, later, the Wesleyan revival within the establishment.',
    keyFigures: ['Elizabeth I', 'Matthew Parker', 'Richard Hooker'],
    links: [{ label: 'Elizabethan Religious Settlement — Wikipedia', url: wiki('Elizabethan_Religious_Settlement') }],
  },
  {
    id: 'moscow-patriarchate',
    year: 1589,
    dateLabel: '1589',
    title: 'Patriarchate of Moscow',
    tradition: 'orthodox',
    parents: ['fall-of-constantinople'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Church' },
    summary:
      'Moscow is raised to a patriarchate, and Russia becomes the political centre of gravity for Orthodoxy.',
    detail:
      'With Constantinople under Ottoman rule, the metropolitan of Moscow was elevated to patriarch with the consent of the Eastern patriarchs — an institutional expression of the idea of Moscow as a third Rome.\n\nAbolished by Peter the Great in 1721 and restored in 1917, the patriarchate went on to endure the fiercest anti-religious campaign in Christian history under Soviet rule.',
    keyFigures: ['Patriarch Job', 'Boris Godunov', 'Jeremias II of Constantinople'],
    links: [{ label: 'Russian Orthodox Church — Wikipedia', url: wiki('Russian_Orthodox_Church') }],
  },
  {
    id: 'baptists',
    year: 1609,
    dateLabel: '1609',
    title: 'First Baptist congregation',
    tradition: 'radical',
    parents: ['zurich-baptisms', 'elizabethan-settlement'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Droplet' },
    summary:
      'English Separatists in Amsterdam, influenced by Dutch Anabaptists, form the first identifiably Baptist church.',
    detail:
      'John Smyth baptised himself and his congregation on profession of faith; Thomas Helwys took part of the group back to London in 1612 and wrote one of the first English pleas for universal religious liberty.\n\nBaptists combined Reformed theology with a free-church polity of self-governing congregations. Through the Particular and General Baptists, then the American frontier and the modern missionary movement, this became one of the largest Protestant families in the world.',
    keyFigures: ['John Smyth', 'Thomas Helwys', 'Roger Williams'],
    links: [{ label: 'Baptists — Wikipedia', url: wiki('Baptists') }],
  },
  {
    id: 'westminster',
    year: 1646,
    dateLabel: '1646',
    title: 'Westminster Confession',
    tradition: 'protestant',
    parents: ['institutes'],
    kind: 'event',
    icon: { type: 'lucide', name: 'ScrollText' },
    summary:
      'The Westminster Assembly produces the confession and catechisms that define English-speaking Presbyterianism.',
    detail:
      'Convened by the Long Parliament during the civil wars, the assembly wrote a confession, two catechisms and a directory of worship on Reformed and presbyterian lines.\n\nThough England reverted to episcopacy in 1660, the Westminster standards were adopted in Scotland and carried to Ireland, North America and beyond. They remain the doctrinal basis of Presbyterian churches worldwide.',
    keyFigures: ['The Westminster Divines', 'Samuel Rutherford'],
    links: [{ label: 'Westminster Confession of Faith — Wikipedia', url: wiki('Westminster_Confession_of_Faith') }],
  },
  {
    id: 'pia-desideria',
    year: 1675,
    dateLabel: '1675',
    title: 'Pietism — Pia Desideria',
    tradition: 'protestant',
    parents: ['augsburg-confession'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Heart' },
    summary:
      'Spener calls for heartfelt renewal inside Lutheran orthodoxy: small groups, lay Bible study, holiness of life.',
    detail:
      'Pia Desideria proposed devotional gatherings, practical preaching and better training for pastors. Halle became its university and Herrnhut, under Zinzendorf, its missionary engine.\n\nMoravian Pietism proved contagious. It shaped Bach\'s devotional world, launched Protestant foreign missions — and, through a Moravian meeting in London, reshaped John Wesley.',
    keyFigures: ['Philipp Jakob Spener', 'August Hermann Francke', 'Nikolaus von Zinzendorf'],
    links: [{ label: 'Pietism — Wikipedia', url: wiki('Pietism') }],
  },
  {
    id: 'amish',
    year: 1693,
    dateLabel: '1693',
    title: 'Amish division',
    tradition: 'radical',
    parents: ['schleitheim'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Wheat' },
    summary:
      'Jakob Ammann\'s stricter party separates from the Swiss Mennonites over discipline and shunning.',
    detail:
      'The dispute turned on the practice of social avoidance of excommunicated members and on foot washing. Ammann\'s followers became the Amish; those who did not follow remained Mennonite.\n\nMigration to Pennsylvania from the 1730s produced the plain communities that still practise a deliberately pre-industrial common life — one of the most visible survivals of the Radical Reformation.',
    keyFigures: ['Jakob Ammann'],
    links: [{ label: 'Amish — Wikipedia', url: wiki('Amish') }],
  },
  {
    id: 'aldersgate',
    year: 1738,
    dateLabel: '24 May 1738',
    title: 'Aldersgate — the Methodist revival',
    tradition: 'methodist',
    parents: ['elizabethan-settlement', 'pia-desideria'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Flame' },
    summary:
      'John Wesley\'s heart is "strangely warmed" at a Moravian meeting, and a disciplined revival movement is born inside the Church of England.',
    detail:
      'Wesley never intended to leave the Church of England. But barred from many pulpits, he preached in fields, organised converts into classes and bands under lay leaders, and rode some quarter of a million miles doing it. Charles Wesley supplied the hymns; George Whitefield the transatlantic crowds.\n\nMethodism\'s distinctive notes were assurance, discipline and holiness — plus a conviction that grace is offered to all. Separation from the established church came gradually after Wesley\'s death.',
    keyFigures: ['John Wesley', 'Charles Wesley', 'George Whitefield'],
    links: [
      { label: 'John Wesley — Wikipedia', url: wiki('John_Wesley') },
      { label: 'Methodism — Wikipedia', url: wiki('Methodism') },
    ],
  },
  {
    id: 'christmas-conference',
    year: 1784,
    dateLabel: '1784',
    title: 'Christmas Conference, Baltimore',
    tradition: 'methodist',
    parents: ['aldersgate'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Tent' },
    summary:
      'American Methodists organise as an independent church, with circuit riders following the frontier west.',
    detail:
      'Wesley ordained ministers for America after the Revolution left its Methodists without sacraments. At Baltimore, Coke and Asbury were made superintendents of a new Methodist Episcopal Church.\n\nCircuit riding and camp meetings fitted a scattered frontier population perfectly, and Methodism became the largest Protestant body in nineteenth-century America — before dividing bitterly over slavery.',
    keyFigures: ['Francis Asbury', 'Thomas Coke', 'Richard Allen'],
    links: [{ label: 'Christmas Conference — Wikipedia', url: wiki('Christmas_Conference') }],
  },
  {
    id: 'lambeth',
    year: 1867,
    dateLabel: '1867',
    title: 'First Lambeth Conference',
    tradition: 'anglican',
    parents: ['elizabethan-settlement'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Globe' },
    summary:
      'Bishops from across the empire meet at Lambeth, turning a national church into a worldwide communion.',
    detail:
      'Seventy-six bishops gathered at the invitation of the archbishop of Canterbury. The conference has no legislative power over independent provinces; it works by consultation and moral authority.\n\nThe Anglican Communion now spans some 165 countries, with its numerical centre in Africa. That breadth has also made it the setting for sharp modern disputes, since no single authority can settle them.',
    keyFigures: ['Charles Longley'],
    links: [{ label: 'Lambeth Conference — Wikipedia', url: wiki('Lambeth_Conference') }],
  },
  {
    id: 'holiness-movement',
    year: 1867,
    dateLabel: '1867',
    title: 'The Holiness movement',
    tradition: 'methodist',
    parents: ['christmas-conference'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Sun' },
    summary:
      'Camp meetings revive Wesley\'s teaching on entire sanctification, producing a family of new holiness churches.',
    detail:
      'The National Camp Meeting Association for the Promotion of Holiness, founded at Vineland, New Jersey, pressed for a second work of grace after conversion. Where established Methodism resisted, new bodies formed — the Church of God (Anderson), the Wesleyan Church, the Church of the Nazarene, the Salvation Army.\n\nThe movement also bequeathed the language of a "baptism of the Holy Spirit" that Pentecostalism would soon take in a new direction.',
    keyFigures: ['Phoebe Palmer', 'John Inskip', 'William and Catherine Booth'],
    links: [{ label: 'Holiness movement — Wikipedia', url: wiki('Holiness_movement') }],
  },
  {
    id: 'vatican-i',
    year: 1870,
    dateLabel: '1870',
    title: 'First Vatican Council',
    tradition: 'catholic',
    parents: ['trent'],
    kind: 'council',
    icon: { type: 'lucide', name: 'Crown' },
    summary:
      'Papal infallibility is defined, days before Italian troops end the Papal States.',
    detail:
      'The council taught that the pope, speaking ex cathedra on faith and morals, is preserved from error. It was interrupted when Rome fell to the Kingdom of Italy and never formally concluded.\n\nA minority who rejected the definition left to form the Old Catholic churches. The pope, stripped of territory, gained an unprecedented concentration of spiritual authority.',
    keyFigures: ['Pope Pius IX', 'John Henry Newman', 'Ignaz von Döllinger'],
    links: [{ label: 'First Vatican Council — Wikipedia', url: wiki('First_Vatican_Council') }],
  },
  {
    id: 'azusa-street',
    year: 1906,
    dateLabel: '1906',
    title: 'Azusa Street Revival',
    tradition: 'pentecostal',
    parents: ['holiness-movement'],
    kind: 'schism',
    icon: { type: 'lucide', name: 'Wind' },
    summary:
      'A revival in a Los Angeles mission, led by William Seymour, launches global Pentecostalism.',
    detail:
      'For three years, services ran almost continuously in a converted building on Azusa Street, marked by speaking in tongues, healing and — strikingly for 1906 America — a racially integrated congregation under a Black pastor.\n\nVisitors carried the movement worldwide within a decade. Pentecostal and charismatic Christianity is now counted in the hundreds of millions and is the fastest-growing stream in the church\'s history, especially in Africa, Latin America and Asia.',
    keyFigures: ['William J. Seymour', 'Charles Parham', 'Lucy Farrow'],
    links: [{ label: 'Azusa Street Revival — Wikipedia', url: wiki('Azusa_Street_Revival') }],
  },
  {
    id: 'assemblies-of-god',
    year: 1914,
    dateLabel: '1914',
    title: 'Assemblies of God founded',
    tradition: 'pentecostal',
    parents: ['azusa-street'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Users' },
    summary:
      'Pentecostals begin to organise into denominations, giving the revival institutions, schools and missions.',
    detail:
      'Delegates met at Hot Springs, Arkansas, to form a cooperative fellowship for credentialing ministers and sending missionaries. Other bodies followed, including the largely Black Church of God in Christ, already organised in 1897 and reconstituted as Pentecostal in 1907.\n\nDenominational structure made Pentecostalism durable and exportable — and eventually respectable enough to enter the evangelical mainstream.',
    keyFigures: ['E. N. Bell', 'Charles Harrison Mason', 'Aimee Semple McPherson'],
    links: [{ label: 'Assemblies of God — Wikipedia', url: wiki('Assemblies_of_God') }],
  },
  {
    id: 'world-council',
    year: 1948,
    dateLabel: '1948',
    title: 'World Council of Churches',
    tradition: 'undivided',
    parents: ['moscow-patriarchate', 'westminster', 'lambeth'],
    kind: 'reunion',
    icon: { type: 'lucide', name: 'Globe' },
    summary:
      'Orthodox, Anglican and Protestant churches form a fellowship in Amsterdam, and the branches begin to talk again.',
    detail:
      'Growing out of the missionary and Life-and-Work conferences of the early twentieth century, the WCC brought together 147 churches. It now includes some 350, representing more than half a billion Christians.\n\nThe Catholic Church is not a member but cooperates closely. Much of the twentieth century\'s most significant church history is this: after a millennium of division, systematic conversation between branches that had excommunicated one another.',
    keyFigures: ['Willem Visser \'t Hooft', 'John R. Mott', 'Geoffrey Fisher'],
    links: [{ label: 'World Council of Churches — Wikipedia', url: wiki('World_Council_of_Churches') }],
  },
  {
    id: 'charismatic-renewal',
    year: 1960,
    dateLabel: '1960s',
    title: 'Charismatic renewal',
    tradition: 'pentecostal',
    parents: ['assemblies-of-god'],
    kind: 'event',
    icon: { type: 'lucide', name: 'Lightbulb' },
    summary:
      'Pentecostal experience spreads into Anglican, Catholic and mainline churches without founding new denominations.',
    detail:
      'It is usually dated to 1960, when Dennis Bennett, an Episcopal priest in Van Nuys, California, told his congregation he had spoken in tongues. Catholic renewal followed at Duquesne University in 1967 and was cautiously encouraged by Rome.\n\nUnlike earlier revivals, this one largely crossed branches instead of splitting them — a rare case on this chart of a movement flowing sideways rather than forking.',
    keyFigures: ['Dennis Bennett', 'Kevin Ranaghan', 'Michael Harper'],
    links: [{ label: 'Charismatic movement — Wikipedia', url: wiki('Charismatic_movement') }],
  },
  {
    id: 'vatican-ii',
    year: 1962,
    dateLabel: '1962–1965',
    title: 'Second Vatican Council',
    tradition: 'catholic',
    parents: ['vatican-i'],
    kind: 'council',
    icon: { type: 'lucide', name: 'BookOpen' },
    summary:
      'Rome reforms its liturgy, embraces religious liberty and calls other Christians separated brethren rather than heretics.',
    detail:
      'John XXIII called the council to open the windows of the church. Its documents permitted vernacular worship, redefined the church as the people of God, affirmed religious freedom, repudiated antisemitism and committed Catholicism to ecumenism.\n\nNo single event did more to change the tone of relations between the branches on this chart. It also produced internal division of its own, between those who thought it went too far and those who thought it stopped short.',
    keyFigures: ['John XXIII', 'Paul VI', 'Karl Rahner', 'Joseph Ratzinger'],
    links: [{ label: 'Second Vatican Council — Wikipedia', url: wiki('Second_Vatican_Council') }],
  },
  {
    id: 'lifting-anathemas',
    year: 1965,
    dateLabel: '7 Dec 1965',
    title: 'Catholic–Orthodox declaration',
    tradition: 'undivided',
    parents: ['vatican-ii', 'moscow-patriarchate'],
    kind: 'reunion',
    icon: { type: 'lucide', name: 'Handshake' },
    summary:
      'Paul VI and Athenagoras I jointly remove the excommunications of 1054 from the memory of the church.',
    detail:
      'A joint declaration read simultaneously in Rome and Istanbul expressed regret for the offensive words and gestures of 1054 and lifted the mutual anathemas. The two had already embraced in Jerusalem in 1964, the first meeting of pope and ecumenical patriarch in over five centuries.\n\nFull communion has not been restored — papal primacy remains the substantive obstacle — but the formal state of mutual condemnation is over.',
    keyFigures: ['Paul VI', 'Athenagoras I'],
    links: [{ label: 'Catholic–Orthodox Joint Declaration of 1965 — Wikipedia', url: wiki('Catholic%E2%80%93Orthodox_Joint_Declaration_of_1965') }],
  },
  {
    id: 'chambesy',
    year: 1990,
    dateLabel: '1990',
    title: 'Chambésy agreement',
    tradition: 'oriental',
    parents: ['dvin'],
    kind: 'reunion',
    icon: { type: 'lucide', name: 'Handshake' },
    summary:
      'Eastern and Oriental Orthodox theologians agree that their christologies are in substance the same, after fifteen centuries apart.',
    detail:
      'The joint commission concluded that both families confess the one Christ, fully God and fully human, and that the split of 451 rested largely on differing uses of the word "nature".\n\nThe statements recommended lifting the ancient anathemas. Formal unity has not yet followed, but the theological case for the oldest division in Christianity has been substantially withdrawn by both sides.',
    keyFigures: ['Joint Commission of the Orthodox Churches'],
    links: [{ label: 'Oriental Orthodoxy — Wikipedia', url: wiki('Oriental_Orthodoxy') }],
  },
  {
    id: 'assyrian-declaration',
    year: 1994,
    dateLabel: '11 Nov 1994',
    title: 'Common Christological Declaration',
    tradition: 'east-syriac',
    parents: ['east-syriac-china'],
    kind: 'reunion',
    icon: { type: 'lucide', name: 'Handshake' },
    summary:
      'John Paul II and Mar Dinkha IV declare a common faith in Christ, closing the dispute begun at Ephesus in 431.',
    detail:
      'Signed in the Vatican, the declaration states that the historic quarrel arose from differing terminology rather than differing faith, and that both churches confess Christ as true God and true man.\n\nIt is the oldest breach in the church to receive such a settlement — 1,563 years after the council that caused it. Guidelines for shared sacraments between Assyrian and Chaldean faithful followed in 2001.',
    keyFigures: ['John Paul II', 'Mar Dinkha IV'],
    links: [{ label: 'Common Christological Declaration — Wikipedia', url: wiki('Common_Christological_Declaration_Between_the_Catholic_Church_and_the_Assyrian_Church_of_the_East') }],
  },
  {
    id: 'joint-declaration-justification',
    year: 1999,
    dateLabel: '31 Oct 1999',
    title: 'Joint Declaration on Justification',
    tradition: 'undivided',
    parents: ['vatican-ii', 'augsburg-confession'],
    kind: 'reunion',
    icon: { type: 'lucide', name: 'Handshake' },
    summary:
      'Catholics and Lutherans declare a consensus on the doctrine that divided them in 1517, and the condemnations no longer apply.',
    detail:
      'Signed in Augsburg on Reformation Day, the declaration states that we are justified by grace alone through faith in Christ\'s saving work, and that the sixteenth-century condemnations do not apply to the teaching now set out by each side.\n\nMethodists joined in 2006, Anglicans and the Reformed later. Real differences remain about authority, ministry and the sacraments — but the specific question that started the Reformation has been formally, jointly answered.',
    keyFigures: ['Edward Cassidy', 'Christian Krause'],
    links: [{ label: 'Joint Declaration on the Doctrine of Justification — Wikipedia', url: wiki('Joint_Declaration_on_the_Doctrine_of_Justification') }],
  },
  {
    id: 'crete-council',
    year: 2016,
    dateLabel: '2016',
    title: 'Holy and Great Council of Crete',
    tradition: 'orthodox',
    parents: ['moscow-patriarchate'],
    kind: 'council',
    icon: { type: 'lucide', name: 'Users' },
    summary:
      'The first pan-Orthodox council in centuries meets in Crete — without four of the fourteen churches.',
    detail:
      'Decades in preparation, the council addressed mission, marriage, fasting, the diaspora and relations with other Christians. Antioch, Georgia, Bulgaria and, decisively, Moscow stayed away.\n\nThe absences illustrate the working difficulty of Orthodox conciliarity, and prefigured the 2018 rupture between Moscow and Constantinople over Ukraine — a reminder that this chart is still being drawn.',
    keyFigures: ['Bartholomew I'],
    links: [{ label: 'Pan-Orthodox Council — Wikipedia', url: wiki('Pan-Orthodox_Council') }],
  },
]
