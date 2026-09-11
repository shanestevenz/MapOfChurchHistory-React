export type MapCoordinate = readonly [longitude: number, latitude: number]
export type MapRegionId = 'mediterranean' | 'europe' | 'italy' | 'asia-minor' | 'north-africa'
export type LandmarkKind = 'city' | 'town' | 'council' | 'sacred' | 'water'

export interface MapRegion {
  id: MapRegionId
  label: string
  description: string
  bounds: readonly [west: number, south: number, east: number, north: number]
}

export interface HistoricalTerritory {
  id: string
  name: string
  color: string
  confidence: 'generalized' | 'moderate'
  note: string
  polygons: readonly (readonly MapCoordinate[])[]
}

export interface HistoricalSnapshot {
  year: number
  label: string
  context: string
  territories: readonly HistoricalTerritory[]
}

export interface HistoricalLandmark {
  id: string
  name: string
  alternateName?: string
  kind: LandmarkKind
  coordinate: MapCoordinate
  from: number
  until?: number
  importance: 1 | 2 | 3
  note: string
}

export const MAP_REGIONS: readonly MapRegion[] = [
  {
    id: 'mediterranean',
    label: 'Mediterranean world',
    description: 'Europe, North Africa, and the Near East',
    bounds: [-12, 25, 45, 59],
  },
  {
    id: 'europe',
    label: 'Europe',
    description: 'Western, central, and southeastern Europe',
    bounds: [-12, 34, 32, 60],
  },
  {
    id: 'italy',
    label: 'Italy',
    description: 'The Italian peninsula and surrounding islands',
    bounds: [5.5, 35, 19.5, 48],
  },
  {
    id: 'asia-minor',
    label: 'Asia Minor',
    description: 'Anatolia, the Aegean, and the eastern Mediterranean',
    bounds: [23, 33, 44, 43.5],
  },
  {
    id: 'north-africa',
    label: 'North Africa',
    description: 'The Maghreb, Egypt, and the southern Mediterranean',
    bounds: [-12, 24, 35.5, 38.5],
  },
] as const

const territory = (
  id: string,
  name: string,
  color: string,
  note: string,
  polygons: readonly (readonly MapCoordinate[])[],
  confidence: HistoricalTerritory['confidence'] = 'generalized',
): HistoricalTerritory => ({ id, name, color, note, polygons, confidence })

const romanWest: readonly MapCoordinate[] = [
  [-9.5, 36], [-9.5, 43], [-2, 44], [4, 47], [8, 49], [10, 47], [15, 47],
  [20, 46], [20, 39], [17, 35], [10, 31], [2, 33], [-4, 35], [-9.5, 36],
]
const romanEast: readonly MapCoordinate[] = [
  [20, 46], [29, 46], [31, 42], [42, 42], [43, 36], [36, 30], [29, 30],
  [24, 32], [20, 39], [20, 46],
]
const romanBritain: readonly MapCoordinate[] = [
  [-6, 50], [1.8, 50], [0, 55], [-4, 56], [-6, 53], [-6, 50],
]

export const MAP_SNAPSHOTS: readonly HistoricalSnapshot[] = [
  {
    year: 33,
    label: 'The early apostolic world',
    context: 'Roman rule connected most Mediterranean cities while the Parthian realm bordered the empire in the east.',
    territories: [
      territory('roman-33', 'Roman Empire', '#c8695f', 'A broad reconstruction of Roman authority during the reign of Tiberius.', [romanWest, romanEast, romanBritain], 'moderate'),
      territory('parthian-33', 'Parthian Empire', '#a77ac2', 'Only the western edge of the Parthian realm is visible in this atlas.', [[[39, 29], [47, 29], [47, 42], [40, 42], [36, 35], [39, 29]]]),
      territory('aksum-33', 'Kingdom of Aksum', '#d29b55', 'Aksumite influence south of the Red Sea is only partly inside the selected extent.', [[[34, 12], [44, 12], [44, 22], [38, 23], [34, 18], [34, 12]]]),
    ],
  },
  {
    year: 325,
    label: 'The Constantinian settlement',
    context: 'Constantine controlled a reunited Roman Empire; Nicaea hosted the first ecumenical council.',
    territories: [
      territory('roman-325', 'Roman Empire', '#c8695f', 'Generalized imperial extent after Constantine defeated Licinius in AD 324.', [romanWest, romanEast, romanBritain], 'moderate'),
      territory('sasanian-325', 'Sasanian Empire', '#9a77bd', 'Only the empire’s northwestern frontier is visible.', [[[37, 27], [48, 27], [48, 42], [42, 42], [37, 36], [37, 27]]]),
      territory('aksum-325', 'Kingdom of Aksum', '#d29b55', 'Generalized Aksumite sphere around the southern Red Sea.', [[[34, 12], [45, 12], [45, 22], [39, 24], [34, 18], [34, 12]]]),
    ],
  },
  {
    year: 800,
    label: 'Charlemagne and the eastern empire',
    context: 'A revived western imperial title stood alongside Byzantium, the Abbasid world, and the Umayyad emirate in Iberia.',
    territories: [
      territory('carolingian-800', 'Carolingian Empire', '#d4a453', 'Generalized realm at the coronation of Charlemagne.', [[[-2, 42], [5, 43], [8, 46], [14, 46], [15, 54], [7, 55], [1, 51], [-5, 48], [-2, 42]]], 'moderate'),
      territory('byzantine-800', 'Byzantine Empire', '#9a76bd', 'Generalized holdings in Anatolia, the Balkans, and parts of southern Italy.', [[[18, 36], [21, 43], [29, 46], [42, 42], [42, 36], [30, 35], [24, 37], [18, 36]], [[12, 37], [18, 37], [18, 42], [14, 42], [12, 37]]]),
      territory('abbasid-800', 'Abbasid Caliphate', '#4e9b7d', 'Western provinces were increasingly autonomous; the layer shows broad political allegiance.', [[[-2, 25], [39, 25], [43, 36], [34, 37], [29, 33], [12, 32], [-2, 34], [-2, 25]]]),
      territory('cordoba-800', 'Emirate of Córdoba', '#4f8aa8', 'Generalized Umayyad-controlled Iberia.', [[[-10, 36], [-9, 43], [-1, 43], [3, 40], [0, 36], [-10, 36]]]),
      territory('anglo-saxon-800', 'Anglo-Saxon kingdoms', '#768fbd', 'Several kingdoms are grouped into one generalized layer at this scale.', [[[-6, 50], [2, 50], [0, 56], [-5, 56], [-6, 50]]]),
    ],
  },
  {
    year: 1054,
    label: 'The world of the Great Schism',
    context: 'Latin and Greek Christendom occupied a political landscape divided among empires, kingdoms, and regional powers.',
    territories: [
      territory('hre-1054', 'Holy Roman Empire', '#d4a453', 'Generalized imperial lands; authority inside the empire varied substantially.', [[[5, 45], [14, 45], [17, 49], [15, 55], [7, 55], [5, 45]]], 'moderate'),
      territory('france-1054', 'Kingdom of France', '#547fab', 'Royal control was much less uniform than a modern border implies.', [[[-5, 43], [7, 43], [8, 50], [2, 51], [-5, 48], [-5, 43]]]),
      territory('england-1054', 'Kingdom of England', '#7a8fbd', 'England shortly before the Norman Conquest.', [[[-6, 50], [2, 50], [0, 56], [-5, 56], [-6, 50]]]),
      territory('byzantine-1054', 'Byzantine Empire', '#9a76bd', 'Generalized territory before the Seljuk victory at Manzikert in 1071.', [[[18, 36], [21, 43], [29, 46], [42, 42], [42, 36], [30, 35], [24, 37], [18, 36]], [[12, 37], [18, 37], [18, 42], [14, 42], [12, 37]]], 'moderate'),
      territory('fatimid-1054', 'Fatimid Caliphate', '#4e9b7d', 'Generalized Fatimid authority across Egypt and parts of the Levant and North Africa.', [[[10, 25], [39, 25], [38, 34], [34, 37], [29, 32], [10, 32], [10, 25]]]),
      territory('taifas-1054', 'Taifa kingdoms', '#4f8aa8', 'The diverse successor states of al-Andalus are grouped at this scale.', [[[-10, 36], [-9, 42], [-1, 43], [1, 39], [-2, 36], [-10, 36]]]),
      territory('kievan-rus-1054', 'Kievan Rus’', '#b16f8e', 'A generalized southern and western extent inside this map.', [[[20, 48], [39, 47], [42, 58], [25, 60], [20, 48]]]),
    ],
  },
  {
    year: 1517,
    label: 'The opening of the Reformation',
    context: 'European kingdoms, the Holy Roman Empire, and the expanding Ottoman Empire framed the first Reformation debates.',
    territories: [
      territory('spain-1517', 'Spanish Monarchy', '#d4a453', 'Generalized Iberian crowns under Charles I.', [[[-10, 36], [-9, 43], [3, 43], [3, 36], [-10, 36]]], 'moderate'),
      territory('portugal-1517', 'Kingdom of Portugal', '#4e9b7d', 'Mainland Portugal at the selected scale.', [[[-10, 37], [-6, 37], [-6, 42], [-9, 42], [-10, 37]]], 'moderate'),
      territory('france-1517', 'Kingdom of France', '#547fab', 'Generalized royal territory.', [[[-5, 43], [8, 43], [8, 50], [2, 51], [-5, 48], [-5, 43]]], 'moderate'),
      territory('england-1517', 'Kingdom of England', '#7a8fbd', 'England and Wales are grouped at this scale.', [[[-6, 50], [2, 50], [0, 56], [-5, 56], [-6, 50]]], 'moderate'),
      territory('hre-1517', 'Holy Roman Empire', '#c07c55', 'A generalized outer boundary; hundreds of internal jurisdictions are not shown.', [[[5, 44], [17, 45], [18, 50], [15, 55], [7, 55], [5, 44]]]),
      territory('papal-1517', 'Papal States', '#e0b45b', 'Generalized central Italian territory.', [[[11, 41], [14, 41], [14, 44], [12, 44], [11, 41]]], 'moderate'),
      territory('venice-1517', 'Republic of Venice', '#57a5a2', 'Generalized mainland and Adriatic possessions.', [[[12, 44], [16, 44], [20, 42], [16, 39], [13, 42], [12, 44]]]),
      territory('ottoman-1517', 'Ottoman Empire', '#9a76bd', 'Generalized territory after the conquest of the Mamluk Sultanate during 1517.', [[[18, 34], [21, 46], [31, 48], [45, 42], [45, 25], [29, 25], [26, 32], [18, 34]], [[10, 25], [29, 25], [29, 33], [10, 32], [10, 25]]]),
      territory('poland-lithuania-1517', 'Poland–Lithuania', '#b16f8e', 'The two polities were joined dynastically; the formal Commonwealth followed in 1569.', [[[14, 48], [32, 47], [34, 57], [20, 58], [14, 48]]]),
    ],
  },
] as const

export const MAP_LANDMARKS: readonly HistoricalLandmark[] = [
  { id: 'rome', name: 'Rome', kind: 'sacred', coordinate: [12.4964, 41.9028], from: -753, importance: 3, note: 'Ancient imperial capital and the historic seat of the bishop of Rome.' },
  { id: 'constantinople', name: 'Constantinople', alternateName: 'Byzantium before AD 330', kind: 'city', coordinate: [28.9784, 41.0082], from: -660, importance: 3, note: 'Imperial capital from AD 330 and the historic seat of the ecumenical patriarch.' },
  { id: 'jerusalem', name: 'Jerusalem', alternateName: 'Aelia Capitolina, AD 135–324', kind: 'sacred', coordinate: [35.2137, 31.7683], from: -1000, importance: 3, note: 'The city of Jesus’s ministry, crucifixion, resurrection, and the earliest church.' },
  { id: 'antioch', name: 'Antioch', kind: 'city', coordinate: [36.1606, 36.2021], from: -300, importance: 3, note: 'A major early Christian center where followers of Jesus were first called Christians.' },
  { id: 'alexandria', name: 'Alexandria', kind: 'city', coordinate: [29.9187, 31.2001], from: -331, importance: 3, note: 'A leading center of Christian theology, scholarship, and patriarchal authority.' },
  { id: 'carthage', name: 'Carthage', kind: 'city', coordinate: [10.3233, 36.8528], from: -814, until: 698, importance: 2, note: 'An influential center of Latin Christianity in Roman North Africa.' },
  { id: 'hippo', name: 'Hippo Regius', kind: 'town', coordinate: [7.7667, 36.8833], from: -400, until: 700, importance: 2, note: 'The episcopal city of Augustine of Hippo.' },
  { id: 'nicaea', name: 'Nicaea', alternateName: 'Modern İznik', kind: 'council', coordinate: [29.7211, 40.4286], from: -316, importance: 2, note: 'Site of the first and seventh ecumenical councils.' },
  { id: 'ephesus', name: 'Ephesus', kind: 'council', coordinate: [27.341, 37.939], from: -1000, importance: 2, note: 'Pauline center and site of the Council of Ephesus in AD 431.' },
  { id: 'chalcedon', name: 'Chalcedon', alternateName: 'Modern Kadıköy', kind: 'council', coordinate: [29.0277, 40.9917], from: -685, importance: 2, note: 'Site of the Council of Chalcedon in AD 451.' },
  { id: 'corinth', name: 'Corinth', kind: 'city', coordinate: [22.9322, 37.9386], from: -700, importance: 2, note: 'A major Pauline community and crossroads of Roman Greece.' },
  { id: 'athens', name: 'Athens', kind: 'city', coordinate: [23.7275, 37.9838], from: -1400, importance: 2, note: 'Classical city visited by Paul during his second missionary journey.' },
  { id: 'milan', name: 'Milan', kind: 'city', coordinate: [9.19, 45.4642], from: -600, importance: 2, note: 'Western imperial residence and episcopal city associated with Ambrose.' },
  { id: 'ravenna', name: 'Ravenna', kind: 'city', coordinate: [12.2035, 44.4184], from: -500, importance: 2, note: 'Late western imperial capital and an important Byzantine center in Italy.' },
  { id: 'canterbury', name: 'Canterbury', kind: 'sacred', coordinate: [1.0789, 51.2802], from: 597, importance: 2, note: 'Center of Augustine of Canterbury’s mission and the English archbishopric.' },
  { id: 'aachen', name: 'Aachen', kind: 'city', coordinate: [6.0839, 50.7753], from: 765, importance: 2, note: 'Principal residence of Charlemagne and a later coronation city.' },
  { id: 'cordoba', name: 'Córdoba', kind: 'city', coordinate: [-4.7794, 37.8882], from: -169, importance: 2, note: 'Capital of the Umayyad emirate and caliphate in al-Andalus.' },
  { id: 'toledo', name: 'Toledo', kind: 'council', coordinate: [-4.0273, 39.8628], from: -200, importance: 2, note: 'Visigothic capital and site of a series of influential church councils.' },
  { id: 'kyiv', name: 'Kyiv', kind: 'city', coordinate: [30.5234, 50.4501], from: 482, importance: 2, note: 'Center of Kievan Rus’ and the Christianization associated with Vladimir in 988.' },
  { id: 'avignon', name: 'Avignon', kind: 'sacred', coordinate: [4.8055, 43.9493], from: -500, importance: 2, note: 'Seat of the papacy from 1309 to 1377.' },
  { id: 'wittenberg', name: 'Wittenberg', kind: 'town', coordinate: [12.6484, 51.866], from: 1180, importance: 3, note: 'University town associated with Martin Luther and the opening of the Reformation.' },
  { id: 'geneva', name: 'Geneva', kind: 'city', coordinate: [6.1432, 46.2044], from: -120, importance: 2, note: 'A major center of the Reformed tradition during the sixteenth century.' },
  { id: 'mediterranean', name: 'Mediterranean Sea', kind: 'water', coordinate: [16, 34.5], from: -10000, importance: 3, note: 'The principal maritime corridor connecting the regions shown in this atlas.' },
  { id: 'adriatic', name: 'Adriatic Sea', kind: 'water', coordinate: [16, 42.2], from: -10000, importance: 2, note: 'The arm of the Mediterranean between Italy and the Balkans.' },
  { id: 'aegean', name: 'Aegean Sea', kind: 'water', coordinate: [25.2, 38.7], from: -10000, importance: 2, note: 'The island-filled sea between Greece and Asia Minor.' },
  { id: 'black-sea', name: 'Black Sea', kind: 'water', coordinate: [34.2, 44], from: -10000, importance: 2, note: 'A major route linking the eastern Mediterranean, Caucasus, and steppe.' },
  { id: 'tyrrhenian', name: 'Tyrrhenian Sea', kind: 'water', coordinate: [11.2, 39.3], from: -10000, importance: 1, note: 'The western Mediterranean sea between Italy and its islands.' },
  { id: 'atlantic', name: 'Atlantic Ocean', kind: 'water', coordinate: [-9, 44], from: -10000, importance: 2, note: 'The ocean forming the western edge of the selected map regions.' },
] as const

export function formatHistoricalYear(year: number) {
  return year < 0 ? `${Math.abs(year)} BC` : `AD ${year}`
}

export function coordinateInRegion(coordinate: MapCoordinate, region: MapRegion) {
  const [longitude, latitude] = coordinate
  const [west, south, east, north] = region.bounds
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north
}
