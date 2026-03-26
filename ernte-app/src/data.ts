export interface Depot {
  name: string;
  halbeAnteile: number;
  ganzeAnteile: number;
  gesamtHalbeAnteile: number;
  prozent: number;
  kuerzel: string;
  isHistoric?: boolean;
}

export type UnitType = 'Stück' | 'kg';

export interface Article {
  name: string;
  unit: UnitType;
}

export const ALL_DEPOTS: Depot[] = [
  { name: 'Acker', halbeAnteile: 3, ganzeAnteile: 1, gesamtHalbeAnteile: 5, prozent: 4.0, kuerzel: 'Ack' },
  { name: 'Bischofsheim', halbeAnteile: 8, ganzeAnteile: 3, gesamtHalbeAnteile: 14, prozent: 11.1, kuerzel: 'Bisch' },
  { name: 'Groß-Gerau', halbeAnteile: 5, ganzeAnteile: 2, gesamtHalbeAnteile: 9, prozent: 7.1, kuerzel: 'GG' },
  { name: 'Königstädten 1', halbeAnteile: 16, ganzeAnteile: 3, gesamtHalbeAnteile: 22, prozent: 17.5, kuerzel: 'König 1' },
  { name: 'Nauheim', halbeAnteile: 11, ganzeAnteile: 0, gesamtHalbeAnteile: 11, prozent: 8.7, kuerzel: 'Nau' },
  { name: 'Rüsselsheim 1', halbeAnteile: 13, ganzeAnteile: 1, gesamtHalbeAnteile: 15, prozent: 11.9, kuerzel: 'Rüss 1' },
  { name: 'Rüsselsheim 2', halbeAnteile: 12, ganzeAnteile: 1, gesamtHalbeAnteile: 14, prozent: 11.1, kuerzel: 'Rüss 2' },
  { name: 'Rüsselsheim 3', halbeAnteile: 9, ganzeAnteile: 2, gesamtHalbeAnteile: 13, prozent: 10.3, kuerzel: 'Rüss 3' },
  { name: 'Trebur 1', halbeAnteile: 7, ganzeAnteile: 1, gesamtHalbeAnteile: 9, prozent: 7.1, kuerzel: 'Tre 1' },
  { name: 'Trebur 2', halbeAnteile: 6, ganzeAnteile: 1, gesamtHalbeAnteile: 8, prozent: 6.3, kuerzel: 'Tre 2' },
  { name: 'Wiesbaden', halbeAnteile: 6, ganzeAnteile: 0, gesamtHalbeAnteile: 6, prozent: 4.8, kuerzel: 'WI' },
  { name: 'Königstädten 2', halbeAnteile: 0, ganzeAnteile: 0, gesamtHalbeAnteile: 0, prozent: 0, kuerzel: 'König 2', isHistoric: true },
  { name: 'Raunheim', halbeAnteile: 0, ganzeAnteile: 0, gesamtHalbeAnteile: 0, prozent: 0, kuerzel: 'Raun', isHistoric: true },
];

export const DEPOTS: Depot[] = ALL_DEPOTS.filter(d => !d.isHistoric);

export const TOTAL_HALBE_ANTEILE = 126;

// Sorted articles from STAMMDATEN.MD
export const ARTICLES: Article[] = [
  ...[
    'Äpfel', 'Batavia', 'Batavia rot', 'Birnen', 'Bohnen', 'Brokkoli', 'Buttersalat', 'Chili',
    'Eichblattsalat', 'Eissalat', 'Fenchel', 'Gemüsezwiebel', 'Grünkohl', 'Gurke', 'Knoblauch',
    'Kohlrabi', 'Kohlrübe', 'Kopfsalat', 'Kürbis', 'Lauch', 'Lauchzwiebel', 'Mangold', 'Melone',
    'Pak Choi', 'Paprika', 'Petersilienwurzel', 'Radieschen', 'Rettich', 'Romanasalat', 'Rosenkohl',
    'Rote Bete', 'Rotkohl', 'Schwarzwurzel', 'Spitzkohl', 'Spitzpaprika', 'Staudensellerie', 'Tatsoi',
    'Weißkohl', 'Wirsing', 'Zucchini', 'Zuckermais', 'Zwiebeln', 'Herbstrübe', 'Radicchio', 'Chinakohl', 'Sellerie'
  ].map(name => ({ name, unit: 'Stück' as UnitType })),
  ...[
    'Asiasalat', 'Baby-Leaf', 'Basilikum', 'Blattstielgemüse', 'Blumenkohl', 'Dicke Bohne', 'Eichblatt',
    'Erbse', 'Karotte', 'Kartoffeln', 'Kopfsalat', 'Lauch', 'Lauchzwiebel', 'Mangold', 'Postelein',
    'Radies', 'Rucola', 'Sprossenbrokkoli', 'Sprossenkohl', 'Staudensellerie', 'Tomaten', 'Zwiebeln',
    'Bohnen', 'Brokkoli', 'Bohnenkraut', 'Schwarzer Rettich', 'Rettich', 'Rote Bete', 'Feldsalat',
    'Herbstrübe', 'Spinat', 'Fenchel', 'Grünkohl', 'Pak Choi', 'Pastinaken'
  ].map(name => ({ name, unit: 'kg' as UnitType }))
];

// Deduplicate items just in case and sort alphabetically
export const UNIQUE_ARTICLES = Array.from(new Map(ARTICLES.map(a => [`${a.name}-${a.unit}`, a])).values())
  .sort((a,b) => a.name.localeCompare(b.name));
