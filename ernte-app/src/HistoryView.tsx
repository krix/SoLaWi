import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Depot } from './data';
import { parseDate } from './logic';

interface DepotStat {
  kgSum: number;
  stkSum: number;
  kgFairSum: number;
  stkFairSum: number;
}

interface HistoryViewProps {
  data: any[];
  allDepots: Depot[];
}

export default function HistoryView({ data, allDepots }: HistoryViewProps) {
  const [filterArticle, setFilterArticle] = useState<string>('Alle');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const baseFilteredData = useMemo(() => {
    if (!startDate && !endDate) return data;
    
    let sTime = startDate ? new Date(startDate).getTime() : 0;
    let eTime = endDate ? new Date(endDate).getTime() : Infinity;
    if (endDate) eTime += 86400000 - 1; // inclusive end of day

    return data.filter(row => {
       const t = parseDate(row.datum);
       return t >= sTime && t <= eTime;
    });
  }, [startDate, endDate, data]);

  const uniqueArticles = useMemo(() => {
    const set = new Set<string>();
    for (const row of baseFilteredData) set.add(row.artikel);
    return Array.from(set).sort();
  }, [baseFilteredData]);

  // Aggregation for the Table (Totals & Fairness)
  const stats = useMemo(() => {
    const map = new Map<string, DepotStat>();
    
    // Initialize map
    for (const d of allDepots) {
      map.set(d.kuerzel, { kgSum: 0, stkSum: 0, kgFairSum: 0, stkFairSum: 0 });
      map.set(d.name, { kgSum: 0, stkSum: 0, kgFairSum: 0, stkFairSum: 0 }); 
    }

    const filteredData = filterArticle === 'Alle' 
      ? baseFilteredData 
      : baseFilteredData.filter(d => d.artikel === filterArticle);

    for (const row of filteredData) {
      const { depot, gesamtMenge, halberAnteil, einheit } = row;
      let stat = map.get(depot);
      
      if (!stat) {
         const matched = allDepots.find(d => d.name.toLowerCase() === depot.toLowerCase() || d.kuerzel.toLowerCase() === depot.toLowerCase());
         if (matched) {
            stat = { kgSum: 0, stkSum: 0, kgFairSum: 0, stkFairSum: 0 };
            map.set(depot, stat);
            map.set(matched.kuerzel, stat);
         }
      }
      
      if (stat) {
        if (einheit === 'g' || einheit === 'kg') {
          stat.kgSum += einheit === 'g' ? (gesamtMenge / 1000) : gesamtMenge;
          stat.kgFairSum += einheit === 'g' ? (halberAnteil / 1000) : halberAnteil;
        } else if (einheit.toLowerCase().includes('stück')) {
          stat.stkSum += gesamtMenge;
          stat.stkFairSum += halberAnteil;
        }
      }
    }

    return allDepots.map(d => {
      const statName = map.get(d.name);
      const statKuerzel = map.get(d.kuerzel);
      
      return {
        depot: d.name,
        kuerzel: d.kuerzel,
        gesamtHalbeAnteile: d.gesamtHalbeAnteile,
        kgSum: (statName?.kgSum || 0) + (statKuerzel?.kgSum || 0),
        stkSum: (statName?.stkSum || 0) + (statKuerzel?.stkSum || 0),
        kgFairSum: (statName?.kgFairSum || 0) + (statKuerzel?.kgFairSum || 0),
        stkFairSum: (statName?.stkFairSum || 0) + (statKuerzel?.stkFairSum || 0)
      };
    }).sort((a,b) => b.kgSum - a.kgSum);

  }, [filterArticle, baseFilteredData]);

  // Aggregation for the Timeline Chart (Cumulative over time)
  const chartData = useMemo(() => {
    if (filterArticle === 'Alle') return []; 

    const filtered = baseFilteredData.filter(d => d.artikel === filterArticle);
    
    // Build map: Date -> { DateString, deliveries: {} }
    const dateMap = new Map<string, any>();

    for (const row of filtered) {
      const { datum, depot, halberAnteil, einheit } = row;
      
      let matchedDepot = allDepots.find(d => d.name === depot || d.kuerzel === depot);
      if (!matchedDepot) {
          matchedDepot = allDepots.find(d => d.name.toLowerCase() === depot.toLowerCase());
      }
      if (!matchedDepot) continue;

      let amountPerHalfShare = einheit === 'g' ? (halberAnteil / 1000) : halberAnteil;

      if (!dateMap.has(datum)) {
        dateMap.set(datum, { rawDate: datum, sortKey: parseDate(datum), deliveries: {} });
      }
      
      const record = dateMap.get(datum);
      // Accumulate if the same depot has multiple lines on the same day
      record.deliveries[matchedDepot.kuerzel] = (record.deliveries[matchedDepot.kuerzel] || 0) + amountPerHalfShare;
    }

    const sortedDates = Array.from(dateMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    
    // Running totals base
    const runningTotals = {} as Record<string, number>;
    allDepots.forEach(d => runningTotals[d.kuerzel] = 0);

    return sortedDates.map(d => {
      // Add today's deliveries to running totals
      for (const kuerzel of Object.keys(d.deliveries)) {
         runningTotals[kuerzel] += d.deliveries[kuerzel];
      }
      
      // Build the data point for Recharts
      const dataPoint: any = { datum: d.rawDate.substring(0,5) };
      allDepots.forEach(dep => {
         dataPoint[dep.kuerzel] = runningTotals[dep.kuerzel];
      });
      return dataPoint;
    });
  }, [filterArticle, baseFilteredData]);

  // Aggregation for Total Harvest table (+5% Schwund)
  const harvestStats = useMemo(() => {
    const map = new Map<string, { kgSum: number, stkSum: number }>();
    
    for (const row of baseFilteredData) {
      let { artikel, gesamtMenge, einheit } = row;
      
      if (!map.has(artikel)) map.set(artikel, { kgSum: 0, stkSum: 0 });
      const stat = map.get(artikel)!;

      if (einheit === 'g' || einheit === 'kg') {
        let kgVal = einheit === 'g' ? (gesamtMenge / 1000) : gesamtMenge;
        stat.kgSum += kgVal;
      } else if (einheit.toLowerCase().includes('stück')) {
        stat.stkSum += gesamtMenge;
      }
    }

    return Array.from(map.entries()).map(([artikel, data]) => {
      return {
        artikel,
        kgSumNetto: data.kgSum,
        kgSumBrutto: data.kgSum / 0.95, // Netto ÷ 0.95 = Brutto (da Werte bereits 5% Schwund enthalten)
        stkSum: data.stkSum
      };
    }).sort((a,b) => (b.kgSumBrutto + b.stkSum) - (a.kgSumBrutto + a.stkSum));
  }, [baseFilteredData]);

  return (
    <div className="glass-panel animate-in" style={{ padding: '2rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.4rem' }}>Erweiterte Verteilungsstatistiken</h2>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
            Auswertung von <strong>{baseFilteredData.length}</strong> historischen Lieferscheinen.
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface-solid)', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.2rem' }}>Von</label>
            <input type="date" className="input" style={{ padding: '0.2rem', fontSize: '0.9rem' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.2rem' }}>Bis</label>
            <input type="date" className="input" style={{ padding: '0.2rem', fontSize: '0.9rem' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
           <label style={{ fontWeight: 500, color: 'var(--color-text)' }}>Verlauf / Fairness pro Artikel anzeigen:</label>
           <select 
             className="input" 
             style={{ minWidth: '200px' }}
             value={filterArticle} 
             onChange={e => setFilterArticle(e.target.value)}
           >
             <option value="Alle">-- Nur Tabelle (Alle Artikel summiert) --</option>
             {uniqueArticles.map(a => <option key={a} value={a}>{a}</option>)}
           </select>
        </div>

        {filterArticle !== 'Alle' && chartData.length > 0 && (
          <div style={{ marginBottom: '3rem', height: '400px', width: '100%', background: 'var(--color-surface-solid)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', textAlign: 'center', color: 'var(--color-text)' }}>
              Kumulierter Fairness-Verlauf: {filterArticle} (Menge pro 1 Halbem Anteil)
            </h3>
            <p style={{ fontSize: '0.8rem', textAlign: 'center', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
              Die Linien zeigen an, wie viel ein Anteil über die Zeit aufsummiert erhalten hat. Laufen die Linien parallel oder übereinander, war die Erntezeit extrem fair.
            </p>
            <ResponsiveContainer width="100%" height="80%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="datum" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : value}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {allDepots.map((d, i) => (
                  <Line 
                    key={d.kuerzel} 
                    type="monotone" 
                    dataKey={d.kuerzel} 
                    stroke={`hsl(${i * (360 / allDepots.length)}, 70%, 50%)`} 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {filterArticle !== 'Alle' && chartData.length === 0 && (
           <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-light)', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', marginBottom: '2rem' }}>
             Keine chronologischen Daten für diesen Artikel in diesem Zeitraum vorhanden.
           </div>
        )}

        <div className="table-container">
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary)', padding: '1.5rem 1.5rem 0.5rem 1.5rem', margin: 0 }}>Depot-Lieferstatistik (Netto)</h3>
          <table>
            <thead>
              <tr>
                <th>Depot</th>
                <th style={{ textAlign: 'center' }}>Basis Halbe Anteile</th>
                <th style={{ textAlign: 'right' }}>Absolute gelieferte Menge</th>
                <th style={{ textAlign: 'right', background: 'rgba(46, 165, 80, 0.05)' }}>
                  ⭐ Reelle Menge pro 1/2 Anteil
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.filter(s => s.kgSum > 0 || s.stkSum > 0 || filterArticle === 'Alle').map((s, i) => {
                const kgPerHalf = s.kgFairSum;
                const stkPerHalf = s.stkFairSum;

                return (
                  <tr key={s.kuerzel}>
                    <td style={{ fontWeight: 500 }}>
                      <span style={{marginRight: '0.5rem', color: '#999'}}>{i+1}.</span>
                      {s.depot} <span style={{color: '#999', fontSize: '0.85rem'}}>({s.kuerzel})</span>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--color-text-light)' }}>
                      {s.gesamtHalbeAnteile}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--color-text)' }}>
                      {s.kgSum > 0 && <span>{s.kgSum.toLocaleString('de-DE', {maximumFractionDigits: 1})} kg</span>}
                      {s.kgSum > 0 && s.stkSum > 0 && <span style={{margin:'0 0.5rem'}}>|</span>}
                      {s.stkSum > 0 && <span>{s.stkSum.toLocaleString('de-DE')} Stück</span>}
                      {s.kgSum === 0 && s.stkSum === 0 && <span style={{color: '#aaa'}}>-</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)', background: 'rgba(46, 165, 80, 0.02)' }}>
                      {s.kgSum > 0 && <span>{(kgPerHalf).toLocaleString('de-DE', {maximumFractionDigits: 2})} kg / 1/2 Anteil</span>}
                      {s.kgSum > 0 && s.stkSum > 0 && <br/>}
                      {s.stkSum > 0 && <span>{(stkPerHalf).toLocaleString('de-DE', {maximumFractionDigits: 2})} Stk / 1/2 Anteil</span>}
                      {s.kgSum === 0 && s.stkSum === 0 && <span style={{color: '#aaa'}}>-</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="table-container">
        <h3 style={{ fontSize: '1.2rem', color: 'var(--color-primary)', padding: '1.5rem 1.5rem 0.5rem 1.5rem', margin: 0 }}>Gesamternte / Gemüsesorte (Brutto, inkl. 5% Schwund bei Gewichten)</h3>
        <table>
          <thead>
            <tr>
              <th>Gemüsesorte / Artikel</th>
              <th style={{ textAlign: 'right' }}>Errechnete Gesamternte (Brutto)</th>
              <th style={{ textAlign: 'right', color: 'var(--color-text-light)' }}>Gelieferte Übergabe (Netto)</th>
            </tr>
          </thead>
          <tbody>
             {harvestStats.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem' }}>Keine Erntedaten in diesem Zeitraum gefunden.</td></tr>
             )}
             {harvestStats.map((h, i) => (
                <tr key={h.artikel}>
                   <td style={{ fontWeight: 500 }}>
                     <span style={{marginRight: '0.5rem', color: '#999'}}>{i+1}.</span>
                     {h.artikel}
                   </td>
                   <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {h.kgSumBrutto > 0 && <span>{h.kgSumBrutto.toLocaleString('de-DE', {maximumFractionDigits: 1})} kg</span>}
                      {h.kgSumBrutto > 0 && h.stkSum > 0 && <span style={{margin:'0 0.5rem'}}>|</span>}
                      {h.stkSum > 0 && <span>{h.stkSum.toLocaleString('de-DE')} Stück</span>}
                   </td>
                   <td style={{ textAlign: 'right', color: 'var(--color-text-light)' }}>
                      {h.kgSumNetto > 0 && <span>{h.kgSumNetto.toLocaleString('de-DE', {maximumFractionDigits: 1})} kg</span>}
                      {h.kgSumNetto > 0 && h.stkSum > 0 && <span style={{margin:'0 0.5rem'}}>|</span>}
                      {h.stkSum > 0 && <span>{h.stkSum.toLocaleString('de-DE')} Stück</span>}
                   </td>
                </tr>
             ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
