import type {
  PresentDayProfile,
  TimelineEvent,
  TraditionId,
} from './timeline-types'

export const PRESENT_DAY_YEAR = 2026

type ContinuingTradition = Exclude<TraditionId, 'undivided'>

interface PresentDayDefinition {
  title: string
  summary: string
  detail: string
  profile: PresentDayProfile
  links: NonNullable<TimelineEvent['links']>
}

/**
 * Dated, source-linked summaries for the living branches on the timeline.
 * These are generated UI endpoints rather than database events: updating a
 * statistic does not rewrite the historical record or require a migration.
 */
export const PRESENT_DAY_DEFINITIONS: Record<
  ContinuingTradition,
  PresentDayDefinition
> = {
  'east-syriac': {
    title: 'Church of the East today',
    summary:
      'A small, worldwide East Syriac communion whose historic heartland remains northern Mesopotamia.',
    detail:
      'The Assyrian Church of the East preserves the East Syriac liturgy and an episcopal structure descended from the ancient church of Persia. War, persecution and migration have dispersed much of the community from its historic homeland, while dioceses now serve a wide diaspora.',
    profile: {
      asOf: 'WCC profile accessed September 2026',
      membership: '323,300',
      membershipNote:
        'World Council of Churches figure for the Assyrian Church of the East; it does not include East Syriac Catholics or every historically related church.',
      geography:
        'Iraq, Iran, Syria and India, with substantial communities in North America, Europe, Australia and New Zealand.',
      currentDevelopments: [
        'Maintaining Syriac language and worship across a widely dispersed diaspora.',
        'Rebuilding Christian community life in Iraq while continuing ecumenical dialogue.',
      ],
    },
    links: [
      {
        label: 'WCC — Assyrian Church of the East profile',
        url: 'https://www.oikoumene.org/member-churches/holy-apostolic-catholic-assyrian-church-of-the-east',
      },
      {
        label: 'Assyrian Church of the East — About',
        url: 'https://www.assyrianchurch.org/about-us/',
      },
    ],
  },
  oriental: {
    title: 'Oriental Orthodoxy today',
    summary:
      'The Coptic, Ethiopian, Eritrean, Armenian, Syriac and Malankara churches form a communion of roughly 60 million Christians.',
    detail:
      'Oriental Orthodoxy is a family of ancient, self-governing churches united by their reception of the first three ecumenical councils. Its largest populations remain in Africa and the Middle East, alongside growing global diasporas.',
    profile: {
      asOf: 'WCC profile accessed September 2026',
      membership: 'About 60 million',
      membershipNote:
        'World Council of Churches estimate for the Oriental Orthodox family; church reporting dates and definitions vary.',
      geography:
        'Most members live in Ethiopia, Egypt, Eritrea, Armenia, India, Syria and Lebanon, with large diasporas worldwide.',
      currentDevelopments: [
        'Deepening theological dialogue with Eastern Orthodox, Catholic, Anglican and Reformed churches.',
        'Serving communities affected by conflict, migration and rapid diaspora growth.',
      ],
    },
    links: [
      {
        label: 'WCC — Oriental Orthodox churches',
        url: 'https://www.oikoumene.org/church-families/orthodox-churches-oriental',
      },
    ],
  },
  orthodox: {
    title: 'Eastern Orthodoxy today',
    summary:
      'A communion of autocephalous churches numbering roughly 220 million Christians worldwide.',
    detail:
      'Eastern Orthodox churches share doctrine, sacraments and Byzantine liturgical inheritance while governing themselves through patriarchates and other autocephalous churches. There is no single worldwide Orthodox administration or membership register.',
    profile: {
      asOf: 'WCC estimate reported in 2025',
      membership: 'About 220 million',
      membershipNote:
        'Ecumenical estimate for Eastern Orthodox Christians; national censuses and church rolls use different definitions.',
      geography:
        'Largest historic concentrations are in eastern and southeastern Europe and Russia, with major communities in the eastern Mediterranean and global diaspora.',
      currentDevelopments: [
        'The war in Ukraine and disputes over church jurisdiction continue to strain inter-Orthodox relations.',
        'Diaspora growth continues to raise questions about overlapping jurisdictions and cooperation.',
      ],
    },
    links: [
      {
        label: 'WCC — Orthodox population context',
        url: 'https://www.oikoumene.org/news/archbishop-anastasios-of-albania-an-orthodox-hierarch-of-international-recognition',
      },
      {
        label: 'WCC — Eastern Orthodox church family',
        url: 'https://www.oikoumene.org/church-families/orthodox-churches-eastern',
      },
    ],
  },
  catholic: {
    title: 'Roman Catholic Church today',
    summary:
      'The world’s largest Christian communion, reporting more than 1.4 billion baptized Catholics.',
    detail:
      'The Catholic Church is a worldwide communion of the Latin Church and 23 Eastern Catholic churches in communion with the bishop of Rome. Its statistical yearbook tracks baptized membership, clergy, parishes, schools and charitable institutions by continent.',
    profile: {
      asOf: 'Vatican figures for 30 June 2023, published in 2025',
      membership: '1.405 billion',
      membershipNote:
        'Baptized Catholics reported by the Vatican; this is not a count of weekly attendance or self-identified active members.',
      geography:
        'The Americas contain the largest total, followed by Europe and Africa; the fastest numerical increase in the cited tables was in Africa.',
      currentDevelopments: [
        'The pontificate of Leo XIV, begun in 2025, is shaping the church’s current leadership and priorities.',
        'Synodality, evangelization, clerical abuse accountability and growth in Africa remain major worldwide concerns.',
      ],
    },
    links: [
      {
        label: 'Vatican — Catholic Church statistics 2025',
        url: 'https://press.vatican.va/content/dam/salastampa/it/fuori-bollettino/pdf/EN%20-%20Catholic%20Church%20Statistics%202025.pdf',
      },
      {
        label: 'Vatican — Pope Leo XIV',
        url: 'https://www.vatican.va/content/leo-xiv/en.html',
      },
    ],
  },
  protestant: {
    title: 'Lutheran and Reformed churches today',
    summary:
      'Worldwide Lutheran and Reformed communions together represent major, overlapping families of Protestant churches.',
    detail:
      'This timeline lane combines two distinct families rather than one denomination. Their global bodies publish separate membership figures, and some united churches belong to more than one communion, so the numbers should not be added into a single total.',
    profile: {
      asOf: 'LWF and WCRC profiles accessed September 2026',
      membership: 'LWF: 78m+ · WCRC: 100m+',
      membershipNote:
        'Figures cover member churches of each communion and overlap through some united churches; they are not a combined census of all Lutheran and Reformed Christians.',
      geography:
        'Strong historic bases remain in northern and central Europe and North America, with large and growing member churches across Africa, Asia and the Pacific.',
      currentDevelopments: [
        'Global leadership and membership continue shifting beyond the traditions’ European origins.',
        'Church unity, climate justice, peacebuilding and relations with other communions remain shared priorities.',
      ],
    },
    links: [
      {
        label: 'Lutheran World Federation — Who we are',
        url: 'https://lutheranworld.org/who-we-are',
      },
      {
        label: 'World Communion of Reformed Churches',
        url: 'https://wcrc.eu/communion/',
      },
    ],
  },
  radical: {
    title: 'Anabaptist and Baptist churches today',
    summary:
      'Two related but distinct free-church families now span nearly every region of the world.',
    detail:
      'This lane combines Anabaptist bodies and the much larger Baptist family. Their global organizations count baptized members rather than everyone who attends or identifies with the tradition, and many independent Baptist groups are outside the Baptist World Alliance.',
    profile: {
      asOf: 'BWA July 2025; MWC November 2025',
      membership: 'BWA: 53m · Anabaptists: 2.13m',
      membershipNote:
        'The BWA figure covers its member partners; the MWC world directory counts the wider Anabaptist family, of whom about 1.44 million belong to MWC member churches.',
      geography:
        'Baptists are especially numerous in North America, Africa, India and parts of Latin America. About 84% of MWC members live in Africa, Asia or Latin America.',
      currentDevelopments: [
        'The Baptist World Alliance expanded to 283 member bodies in 138 countries and territories in 2025.',
        'Anabaptists marked 500 years since the Radical Reformation while emphasizing peace, unity and a Global South majority.',
      ],
    },
    links: [
      {
        label: 'Baptist World Alliance — 2025 membership',
        url: 'https://baptistworld.org/news/bwa-welcomes-17-new-members/',
      },
      {
        label: 'Mennonite World Conference — About and statistics',
        url: 'https://mwc-cmm.org/en/about-mwc/',
      },
    ],
  },
  anglican: {
    title: 'Anglican Communion today',
    summary:
      'A worldwide family of 42 autonomous member churches with an estimated 90 million members.',
    detail:
      'The Anglican Communion has no central world government. Its provinces share historic roots, worship and consultative institutions while retaining their own governance and local canons.',
    profile: {
      asOf: 'Anglican Communion profile accessed September 2026',
      membership: 'About 90 million',
      membershipNote:
        'Anglican Communion estimate; provinces use different definitions of membership and participation.',
      geography:
        'Present in more than 165 countries. The majority of active Anglicans now live in the Global South, especially sub-Saharan Africa.',
      currentDevelopments: [
        'Demographic influence continues to move toward African and other Global South provinces.',
        'Provinces continue to negotiate significant disagreements over authority, sexuality and the shape of communion.',
      ],
    },
    links: [
      {
        label: 'Anglican Communion — History and present profile',
        url: 'https://www.anglicancommunion.org/history-of-anglicanism/',
      },
      {
        label: 'Anglican Communion — Member churches',
        url: 'https://www.anglicancommunion.org/member-churches/',
      },
    ],
  },
  methodist: {
    title: 'Methodist and Holiness churches today',
    summary:
      'A diverse worldwide Wesleyan family represented globally by more than 80 million members.',
    detail:
      'Methodist, Wesleyan, Holiness and related united churches retain John Wesley’s emphasis on grace, disciplined discipleship and social holiness. The lane includes multiple autonomous denominations rather than a single institution.',
    profile: {
      asOf: 'World Methodist Council profile accessed September 2026',
      membership: 'More than 80 million',
      membershipNote:
        'World Methodist Council figure for 80 member churches; definitions and reporting years vary among member bodies.',
      geography:
        'Member churches span 138 countries, with major communities in the United States, sub-Saharan Africa, Britain, South Korea and the Pacific.',
      currentDevelopments: [
        'Some Methodist bodies are undergoing institutional realignment after disputes over theology, sexuality and church governance.',
        'Evangelism, ecumenical cooperation and social witness remain central priorities across the wider Wesleyan family.',
      ],
    },
    links: [
      {
        label: 'World Methodist Council — About',
        url: 'https://worldmethodistcouncil.org/about-us/',
      },
    ],
  },
  pentecostal: {
    title: 'Pentecostal Christianity today',
    summary:
      'A rapidly expanding global movement made up of many denominations, networks and independent churches.',
    detail:
      'Pentecostal Christianity is too decentralized for one authoritative membership total. The World Assemblies of God Fellowship is the largest organized Pentecostal family, but it represents only part of the wider Pentecostal and charismatic movement.',
    profile: {
      asOf: 'WAGF profile accessed September 2026',
      membership: 'WAGF: 88 million adherents',
      membershipNote:
        'Figure for the World Assemblies of God Fellowship, not all Pentecostal or charismatic Christians worldwide.',
      geography:
        'The movement’s largest and fastest-growing centers are in Latin America, sub-Saharan Africa and parts of Asia; most Assemblies of God adherents live outside the United States.',
      currentDevelopments: [
        'Continued Global South growth is reshaping Christian demographics, leadership and mission.',
        'Pentecostal networks are investing heavily in church planting, missions and cooperation while remaining institutionally decentralized.',
      ],
    },
    links: [
      {
        label: 'World Assemblies of God Fellowship — Current profile',
        url: 'https://worldagfellowship.org/',
      },
    ],
  },
}

const continuingTraditions = Object.keys(
  PRESENT_DAY_DEFINITIONS,
) as ContinuingTradition[]

/** Adds one aligned, read-only endpoint to every living branch. */
export function withPresentDayEndpoints(
  historicalEvents: TimelineEvent[],
): TimelineEvent[] {
  const historicalOnly = historicalEvents.filter((event) => !event.presentDay)
  const endpoints = continuingTraditions.flatMap((tradition) => {
    const latest = historicalOnly
      .filter((event) => event.tradition === tradition)
      .sort((a, b) => b.year - a.year)[0]
    if (!latest) return []

    const definition = PRESENT_DAY_DEFINITIONS[tradition]
    return [{
      id: `present-day-${tradition}`,
      year: PRESENT_DAY_YEAR,
      dateLabel: 'Present · 2026',
      title: definition.title,
      tradition,
      parents: [latest.id],
      kind: 'event' as const,
      icon: { type: 'lucide' as const, name: 'Globe' },
      summary: definition.summary,
      detail: definition.detail,
      presentDay: definition.profile,
      links: definition.links,
    }]
  })

  return [...historicalOnly, ...endpoints]
}
