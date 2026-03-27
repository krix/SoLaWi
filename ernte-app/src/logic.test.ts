import { describe, expect, it } from 'vitest';
import type { Depot } from './data';
import { calculateDistribution, calculatePieceRemainderAllocation } from './logic';

const depots: Depot[] = [
  {
    name: 'Depot A',
    halbeAnteile: 2,
    ganzeAnteile: 1,
    gesamtHalbeAnteile: 4,
    prozent: 0,
    kuerzel: 'A'
  },
  {
    name: 'Depot B',
    halbeAnteile: 1,
    ganzeAnteile: 1,
    gesamtHalbeAnteile: 3,
    prozent: 0,
    kuerzel: 'B'
  },
  {
    name: 'Depot C',
    halbeAnteile: 0,
    ganzeAnteile: 0,
    gesamtHalbeAnteile: 0,
    prozent: 0,
    kuerzel: 'C'
  }
];

// ---------------------------------------------------------------------------
// Stück-Verteilung: ganzes Vielfaches der halben Anteile pro Depot
// ---------------------------------------------------------------------------
describe('calculateDistribution – Stueck', () => {
  it('jedes Depot bekommt sharePerHalb * gesamtHalbeAnteile', () => {
    // 10 Stück auf 7 halbe Anteile (A=4, B=3); sharePerHalb = floor(10/7) = 1
    const dist = calculateDistribution('Gurke', 'Stück', 10, [], depots);

    const resA = dist.results.find(r => r.depotKuerzel === 'A')!;
    const resB = dist.results.find(r => r.depotKuerzel === 'B')!;

    expect(dist.sharePerHalb).toBe(1);
    expect(resA.calculatedAmount).toBe(4);  // 1 * 4
    expect(resB.calculatedAmount).toBe(3);  // 1 * 3
    expect(dist.remainder).toBe(3);         // 10 - 7
  });

  it('Depot-Menge ist immer durch gesamtHalbeAnteile teilbar', () => {
    const dist = calculateDistribution('Kohlrabi', 'Stück', 25, [], depots);

    for (const res of dist.results) {
      if (res.isExcluded) continue;
      const depot = depots.find(d => d.kuerzel === res.depotKuerzel)!;
      if (depot.gesamtHalbeAnteile === 0) continue;
      expect(res.calculatedAmount % depot.gesamtHalbeAnteile).toBe(0);
    }
  });

  it('ausgeschlossene Depots erhoehen sharePerHalb', () => {
    // Nur Depot A (4 halbe Anteile), 10 Stück → sharePerHalb = floor(10/4) = 2
    const dist = calculateDistribution('Gurke', 'Stück', 10, ['B'], depots);

    expect(dist.sharePerHalb).toBe(2);
    const resA = dist.results.find(r => r.depotKuerzel === 'A')!;
    expect(resA.calculatedAmount).toBe(8);  // 2 * 4
    expect(dist.remainder).toBe(2);         // 10 - 8
  });
});

// ---------------------------------------------------------------------------
// kg-Verteilung: kein Rest, Rundungsdifferenz wird korrigiert
// ---------------------------------------------------------------------------
describe('calculateDistribution – kg', () => {
  it('hat immer remainder === 0', () => {
    const dist = calculateDistribution('Tomaten', 'kg', 10, [], depots);
    expect(dist.remainder).toBe(0);
  });

  it('verteilt die gesamte Menge restlos', () => {
    const dist = calculateDistribution('Tomaten', 'kg', 10, [], depots);
    const totalAllocated = dist.results.reduce((sum, r) => sum + r.calculatedAmount, 0);
    expect(Math.round(totalAllocated * 100) / 100).toBe(10);
  });

  it('korrigiert Rundungsfehler auf letztes inkludiertes Depot', () => {
    // 10 kg auf 7 halbe Anteile: exakte Anteile erzeugen potentielle Rundungsdifferenz
    const dist = calculateDistribution('Karotte', 'kg', 10, [], depots);
    const totalAllocated = dist.results
      .filter(r => !r.isExcluded)
      .reduce((sum, r) => sum + r.calculatedAmount, 0);
    expect(Math.round(totalAllocated * 100) / 100).toBe(10);
    expect(dist.remainder).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Resteverteilung für Stück auf 1-n Depots in halben-Anteil-Runden
// ---------------------------------------------------------------------------
describe('calculatePieceRemainderAllocation', () => {
  it('verteilt Reste in vollen Runden ueber mehrere Depots', () => {
    const result = calculatePieceRemainderAllocation(15, ['A', 'B'], [], depots);

    expect(result.rounds).toBe(2);
    expect(result.allocationsByDepot).toEqual({ A: 8, B: 6 });
    expect(result.distributedAmount).toBe(14);
    expect(result.openRemainder).toBe(1);
  });

  it('ignoriert doppelte, ausgeschlossene und ungueltige Depots', () => {
    const result = calculatePieceRemainderAllocation(20, ['A', 'A', 'B', 'X', 'C'], ['B'], depots);

    expect(result.rounds).toBe(5);
    expect(result.allocationsByDepot).toEqual({ A: 20 });
    expect(result.distributedAmount).toBe(20);
    expect(result.openRemainder).toBe(0);
  });

  it('laesst den Rest offen, wenn keine volle Runde moeglich ist', () => {
    const result = calculatePieceRemainderAllocation(6, ['A', 'B'], [], depots);

    expect(result.rounds).toBe(0);
    expect(result.allocationsByDepot).toEqual({});
    expect(result.distributedAmount).toBe(0);
    expect(result.openRemainder).toBe(6);
  });
});


