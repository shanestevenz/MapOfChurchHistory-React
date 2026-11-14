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
    title: 'Lutheran churches today',
    summary:
      'A worldwide family of Lutheran churches, from national churches in Scandinavia to fast-growing churches in Africa and Asia.',
    detail:
      'Lutheran churches share the Augsburg Confession and Luther’s emphasis on justification by grace through faith, but differ in polity and theology. The Lutheran World Federation gathers most of them; confessional bodies such as the LCMS stand outside it in the International Lutheran Council.',
    profile: {
      asOf: 'LWF profile accessed September 2026',
      membership: 'LWF: 78m+',
      membershipNote:
        'Members of Lutheran World Federation churches; confessional Lutheran bodies outside the LWF, including the LCMS, are counted separately.',
      geography:
        'Historic strongholds in Germany, Scandinavia and the American Midwest; some of the largest member churches are now in Ethiopia and Tanzania.',
      currentDevelopments: [
        'Membership growth is concentrated in Africa and Asia while northern European national churches decline.',
        'Lutheran–Catholic dialogue continues to build on the 1999 Joint Declaration on Justification.',
      ],
    },
    links: [
      {
        label: 'Lutheran World Federation — Who we are',
        url: 'https://lutheranworld.org/who-we-are',
      },
    ],
  },
  reformed: {
    title: 'Reformed and Presbyterian churches today',
    summary:
      'Presbyterian, Reformed, Congregational and united churches across more than 100 countries.',
    detail:
      'The Reformed family is governed by elders and synods rather than bishops, and is deeply decentralized. Its churches range from mainline bodies such as the PC(USA) and RCA to confessional churches such as the PCA and CRC.',
    profile: {
      asOf: 'WCRC profile accessed September 2026',
      membership: 'WCRC: 100m+',
      membershipNote:
        'Members of World Communion of Reformed Churches bodies; many conservative Reformed churches, including the PCA, are not WCRC members.',
      geography:
        'Historic centres in Switzerland, the Netherlands, Scotland and the United States, with very large churches in South Korea, Indonesia, Nigeria and southern Africa.',
      currentDevelopments: [
        'Mainline and confessional Presbyterian bodies continue to diverge over doctrine and sexuality.',
        'Korean, African and Indonesian churches increasingly shape the global Reformed family.',
      ],
    },
    links: [
      {
        label: 'World Communion of Reformed Churches',
        url: 'https://wcrc.eu/communion/',
      },
    ],
  },
  radical: {
    title: 'Anabaptist churches today',
    summary:
      'Mennonite, Amish, Hutterite and Brethren in Christ communities, now mostly in the Global South.',
    detail:
      'Anabaptist churches keep believer’s baptism, nonviolence and close-knit community life. Plain communities such as the Amish and Hutterites are mainly in North America; most Mennonites now live in Africa, Asia and Latin America.',
    profile: {
      asOf: 'MWC November 2025',
      membership: 'About 2.13 million',
      membershipNote:
        'Mennonite World Conference directory of the wider Anabaptist family; about 1.44 million belong to MWC member churches.',
      geography:
        'About 84% of MWC members live in Africa, Asia or Latin America; Amish and Hutterite communities are concentrated in the United States and Canada.',
      currentDevelopments: [
        'Anabaptists marked 500 years since the first adult baptisms in Zurich in 2025.',
        'Amish and Hutterite populations continue to grow quickly through large families and high retention.',
      ],
    },
    links: [
      {
        label: 'Mennonite World Conference — About and statistics',
        url: 'https://mwc-cmm.org/en/about-mwc/',
      },
    ],
  },
  baptist: {
    title: 'Baptist churches today',
    summary:
      'One of the largest Protestant families, built on believer’s baptism and autonomous local congregations.',
    detail:
      'Baptists organize in voluntary conventions and unions rather than a single church. The Southern Baptist Convention remains the largest Protestant body in the United States, and many independent Baptist churches belong to no convention at all.',
    profile: {
      asOf: 'BWA July 2025',
      membership: 'BWA: 53 million',
      membershipNote:
        'Baptized members of Baptist World Alliance partner bodies; the SBC left the BWA in 2004 and many independent Baptists are not counted.',
      geography:
        'Especially numerous in the United States, Nigeria, India, Brazil and the Democratic Republic of the Congo.',
      currentDevelopments: [
        'The Baptist World Alliance expanded to 283 member bodies in 138 countries and territories in 2025.',
        'U.S. conventions continue to debate women in ministry, abuse reform and declining membership.',
      ],
    },
    links: [
      {
        label: 'Baptist World Alliance — 2025 membership',
        url: 'https://baptistworld.org/news/bwa-welcomes-17-new-members/',
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
  adventist: {
    title: 'Seventh-day Adventist Church today',
    summary:
      'A single, centrally organized worldwide church of more than 20 million baptized members.',
    detail:
      'Unlike most Protestant families, Adventism is largely one denomination governed by a General Conference. It is known for Saturday Sabbath worship, its health message and one of the largest Protestant school and hospital networks in the world.',
    profile: {
      asOf: 'General Conference statistics accessed November 2026',
      membership: 'About 23 million',
      membershipNote:
        'Baptized members reported by the General Conference; smaller Sabbath-keeping Adventist bodies are not included.',
      geography:
        'Largest memberships are in sub-Saharan Africa, Latin America and the Caribbean, India and the Philippines.',
      currentDevelopments: [
        'Most growth is in Africa and Latin America; North America is a small share of the total.',
        'Debates over women’s ordination continue between the General Conference and some regional bodies.',
      ],
    },
    links: [
      {
        label: 'Adventist.org — Who are Seventh-day Adventists?',
        url: 'https://www.adventist.org/who-are-seventh-day-adventists/',
      },
    ],
  },
  evangelical: {
    title: 'Evangelical and non-denominational Christianity today',
    summary:
      'A large, decentralized movement that cuts across denominations and fills many independent churches and megachurches.',
    detail:
      'Evangelicalism has no founder, headquarters or membership roll. Evangelicals are found in Baptist, Pentecostal, Anglican, Reformed and Methodist churches as well as independent congregations. Non-denominational churches are now among the largest segments of American Protestantism.',
    profile: {
      asOf: 'WEA profile accessed November 2026',
      membership: 'WEA: 600m+ (est.)',
      membershipNote:
        'World Evangelical Alliance estimate of the evangelicals its networks serve. It overlaps heavily with other lanes and cannot be added to their totals.',
      geography:
        'Global, with the largest and fastest-growing populations in Africa, Latin America and Asia; the United States remains a major institutional centre.',
      currentDevelopments: [
        'Independent, non-denominational congregations continue to grow while many denominations decline.',
        'The meaning of “evangelical” is contested where it has become a political as well as religious label.',
      ],
    },
    links: [
      {
        label: 'World Evangelical Alliance — About',
        url: 'https://worldea.org/who-we-are/',
      },
    ],
  },
  restoration: {
    title: 'Restoration Movement churches today',
    summary:
      'Disciples of Christ, Churches of Christ and independent Christian Churches share Stone–Campbell roots but no common structure.',
    detail:
      'The movement’s three main streams emphasize believer’s baptism, weekly communion and the New Testament as the pattern for the church. Churches of Christ and independent Christian Churches are congregational, so there is no unified membership count.',
    profile: {
      asOf: 'World Convention profile accessed November 2026',
      membership: 'Several million (no unified count)',
      membershipNote:
        'Each stream counts members differently and congregational churches report voluntarily, so figures should not be combined into one total.',
      geography:
        'Strongest in the southern and midwestern United States, with significant churches in Africa, Asia, Australia and the Caribbean.',
      currentDevelopments: [
        'The World Convention connects the three streams for fellowship and dialogue.',
        'Churches of Christ and Christian Churches are growing through missions in Africa and Asia.',
      ],
    },
    links: [
      {
        label: 'World Convention of Churches of Christ',
        url: 'https://worldconvention.org/',
      },
    ],
  },
  'latter-day-saints': {
    title: 'Latter-day Saints today',
    summary:
      'A centrally governed worldwide church that identifies as Christian but stands outside the historic Nicene creeds.',
    detail:
      'Latter-day Saints accept additional scripture, including the Book of Mormon, and teach a distinct view of the Godhead. The church is led from Salt Lake City by a president and apostles. Most Catholic, Orthodox and Protestant churches do not recognize it as Christian in the creedal sense.',
    profile: {
      asOf: 'Figures reported for 2024',
      membership: 'About 17.5 million',
      membershipNote:
        'Membership of record reported by the church; it counts everyone on church rolls rather than regular attenders.',
      geography:
        'Headquartered in Salt Lake City, Utah, with most members now living outside the United States, especially in Latin America and the Pacific.',
      currentDevelopments: [
        'The church continues an extensive international temple-building program.',
        'Growth is strongest in Africa and Latin America, while U.S. growth has slowed.',
      ],
    },
    links: [
      {
        label: 'Church of Jesus Christ — Facts and statistics',
        url: 'https://newsroom.churchofjesuschrist.org/facts-and-statistics',
      },
    ],
  },
  'jehovahs-witnesses': {
    title: 'Jehovah’s Witnesses today',
    summary:
      'A centrally governed worldwide movement that identifies as Christian but rejects the Trinity.',
    detail:
      'Jehovah’s Witnesses are directed by a Governing Body at their headquarters in Warwick, New York, and are known for door-to-door ministry and their own New World Translation of the Bible. Most Catholic, Orthodox and Protestant churches do not recognize the movement as Christian in the creedal sense.',
    profile: {
      asOf: 'Figures reported for 2024',
      membership: 'About 9 million publishers',
      membershipNote:
        'Counts active “publishers” who report ministry, not everyone who attends meetings; attendance at the annual Memorial is much higher.',
      geography:
        'Active in over 200 lands, with large communities in the United States, Latin America, Africa and Europe.',
      currentDevelopments: [
        'The movement faces legal restrictions in some countries, including a ban in Russia since 2017.',
        'Recent organizational changes have relaxed some reporting and grooming requirements.',
      ],
    },
    links: [
      {
        label: 'Jehovah’s Witnesses — Official site',
        url: 'https://www.jw.org/en/',
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
    return [
      {
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
      },
    ]
  })

  return [...historicalOnly, ...endpoints]
}
