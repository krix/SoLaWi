import { Depot, UnitType } from './data';

export interface DistributionResult {
  depotKuerzel: string;
  calculatedAmount: number; // Base calculated (floor for pcs, exact for kg)
  isExcluded: boolean;      // True if the depot was excluded from this distribution
}

export interface Distribution {
  id: string;               // Unique ID for UI handling
  articleName: string;
  unit: UnitType;
  totalHarvested: number;
  results: DistributionResult[];
  remainder: number;        // Unallocated remainder (pieces)
  excludedDepots: string[];
  geschenkeDepotKuerzel: string | null; // Depot receiving the remainder
  sharePerHalb: number;     // Amount equivalent to one half-share
}

/**
 * Calculates the exact mathematical share for a depot relative to the active total shares.
 */
function getExactShare(amount: number, depotHalbeAnteile: number, effectiveTotalAnteile: number): number {
  if (effectiveTotalAnteile === 0) return 0;
  return amount * (depotHalbeAnteile / effectiveTotalAnteile);
}

/**
 * Distributes an article based on the rules, excluding specific depots.
 * Depots list is passed explicitly so editable stammdaten are used.
 */
export function calculateDistribution(articleName: string, unit: UnitType, amount: number, excludedDepots: string[] = [], depots: Depot[]): Distribution {
  let results: DistributionResult[] = [];
  let allocated = 0;

  // Berechne die effektiven Gesamt-Anteile nur aus den NICHT ausgeschlossenen Depots
  const includedDepots = depots.filter(d => !excludedDepots.includes(d.kuerzel));
  const effectiveTotalAnteile = includedDepots.reduce((sum, d) => sum + d.gesamtHalbeAnteile, 0);
  
  let sharePerHalb = 0;
  if (effectiveTotalAnteile > 0) {
    if (unit === 'Stück') {
      sharePerHalb = Math.floor(amount / effectiveTotalAnteile);
    } else {
      sharePerHalb = Math.round((amount / effectiveTotalAnteile) * 100) / 100;
    }
  }

  for (const depot of depots) {
    const isExcluded = excludedDepots.includes(depot.kuerzel);
    let calculatedAmount = 0;

    if (!isExcluded && effectiveTotalAnteile > 0) {
      const exact = getExactShare(amount, depot.gesamtHalbeAnteile, effectiveTotalAnteile);
      
      if (unit === 'Stück') {
        calculatedAmount = Math.floor(exact);
      } else {
        calculatedAmount = Math.round(exact * 100) / 100;
      }
      allocated += calculatedAmount;
    }

    results.push({
      depotKuerzel: depot.kuerzel,
      calculatedAmount,
      isExcluded
    });
  }

  // Calculate remainder
  let remainder = 0;
  if (unit === 'Stück') {
    remainder = amount - allocated;
  } else {
    remainder = Math.round((amount - allocated) * 100) / 100;
    if (Math.abs(remainder) < 0.01) remainder = 0;
  }

  return { 
    id: Math.random().toString(36).substr(2, 9),
    articleName, 
    unit, 
    totalHarvested: amount, 
    results, 
    remainder, 
    excludedDepots,
    geschenkeDepotKuerzel: null,
    sharePerHalb
  };
}

export function parseDate(dateStr: string): number {
  if (!dateStr) return 0;
  // format DD.MM.YY or DD.MM.YYYY -> convert to time for sorting
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    return new Date(y, m, d).getTime();
  }
  return 0;
}

export function getFairnessRatio(artikel: string, historieData: any[], depots: Depot[]): Record<string, 'viel' | 'wenig' | 'normal'> {
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - ONE_YEAR_MS;

    const depotSums = new Map<string, number>();

    const rows = historieData.filter(d => d.artikel === artikel && parseDate(d.datum) >= cutoff);
    if (rows.length === 0) return {}; 

    for (const r of rows) {
        let matched = depots.find(d => d.name === r.depot || d.kuerzel === r.depot);
        if (!matched) matched = depots.find(d => d.name.toLowerCase() === r.depot.toLowerCase());
        if (!matched) continue;

        let val = typeof r.halberAnteil === 'number' ? r.halberAnteil : 0;
        depotSums.set(matched.kuerzel, (depotSums.get(matched.kuerzel) || 0) + val);
    }

    if (depotSums.size === 0) return {};

    let totalSum = 0;
    let activeDepotsCount = 0;

    for (const d of depots) {
        let s = depotSums.get(d.kuerzel) || 0;
        totalSum += s;
        activeDepotsCount++;
    }

    const avg = totalSum / activeDepotsCount;
    if (avg === 0) return {};

    const result: Record<string, 'viel' | 'wenig' | 'normal'> = {};
    for (const d of depots) {
        let s = depotSums.get(d.kuerzel) || 0;
        let ratio = s / avg;
        if (ratio < 0.85) result[d.kuerzel] = 'wenig';
        else if (ratio > 1.15) result[d.kuerzel] = 'viel';
        else result[d.kuerzel] = 'normal';
    }
    return result;
}

/**
 * Determines the harvest year for a given date string (DD.MM.YYYY).
 * A harvest year starts on April 1st.
 */
export function getHarvestYear(dateStr: string): string {
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    const yearNum = y < 100 ? y + 2000 : y;
    const harvestYear = (m < 4) ? yearNum - 1 : yearNum;
    return harvestYear.toString();
  }
  // Fallback to current harvest year
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return (m < 4 ? y - 1 : y).toString();
}

/**
 * Converts history data to CSV format.
 */
export function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";
  const headers = ["Datum", "Depot", "Artikel", "GesamtMenge", "Ganze Anteile", "Halbe Anteile", "Einheit"];
  const keys = ["datum", "depot", "artikel", "gesamtMenge", "ganzerAnteil", "halberAnteil", "einheit"];
  
  const rows = data.map(obj => 
    keys.map(key => {
      let val = obj[key] ?? "";
      
      // Handle decimals for German Excel (replace . with ,)
      if (typeof val === 'number') {
        val = val.toString().replace('.', ',');
      } else if (typeof val === 'string') {
        if (val.includes(';') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
      }
      return val;
    }).join(';')
  );
  return [headers.join(';'), ...rows].join('\n');
}

/**
 * Parses CSV format back to history data.
 */
export function parseCSV(csv: string): any[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];
  
  const parseLine = (line: string) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    // Support both comma and semicolon
    const separator = line.includes(';') && !line.includes(',') ? ';' : ',';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i+1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === separator && !inQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj: any = {};
    headers.forEach((header, i) => {
      let val: any = values[i]?.trim();
      if (val === undefined) val = "";
      
      // Convert specific fields to numbers
      if (["gesamtMenge", "ganzerAnteil", "halberAnteil"].includes(header)) {
         const num = Number(val.replace(',', '.'));
         val = isNaN(num) ? 0 : num;
      }
      obj[header] = val;
    });
    return obj;
  });
}
