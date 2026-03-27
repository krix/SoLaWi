import { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import { UNIQUE_ARTICLES, DEPOTS, ALL_DEPOTS, Article, Depot } from './data';
import { calculateDistribution, Distribution, getFairnessRatio, getHarvestYear } from './logic';
import HistoryView from './HistoryView';
import MasterDataView from './MasterDataView';

const LS_ARTICLES = 'solawi_articles';
const LS_DEPOTS   = 'solawi_depots';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'masterdata'>('calculator');
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Fetch available years and set initial selected year
  useEffect(() => {
    const initYears = async () => {
      try {
        const years = await invoke<string[]>('list_history_years');
        const augmented = ["Alle", ...years];
        setAvailableYears(augmented);
        if (years.length > 0) {
          const today = new Date();
          const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
          const currentHarvestYear = getHarvestYear(todayStr);
          if (years.includes(currentHarvestYear)) {
            setSelectedYear(currentHarvestYear);
          } else {
            setSelectedYear(augmented[0]);
          }
        }
      } catch (e) {
        console.error("Failed to list history years:", e);
      }
    };
    initYears();
  }, []);

  // Load history whenever selectedYear changes
  useEffect(() => {
    if (selectedYear) {
      const loadData = async () => {
        try {
          const command = selectedYear === "Alle" ? 'load_all_history' : 'load_history';
          const args = selectedYear === "Alle" ? {} : { year: selectedYear };
          const raw = await invoke<string>(command, args);
          setHistoryData(JSON.parse(raw));
        } catch (e) {
          console.error("Failed to load history for year:", selectedYear, e);
        }
      };
      loadData();
    }
  }, [selectedYear]);

  // Editable master data — loaded from localStorage, falls back to data.ts defaults
  const [editableArticles, setEditableArticlesRaw] = useState<Article[]>(
    () => loadFromStorage<Article[]>(LS_ARTICLES, UNIQUE_ARTICLES)
  );
  const [editableDepots, setEditableDepotsRaw] = useState<Depot[]>(
    () => loadFromStorage<Depot[]>(LS_DEPOTS, DEPOTS)
  );

  // Wrappers that also persist to localStorage
  const setEditableArticles = (articles: Article[]) => {
    localStorage.setItem(LS_ARTICLES, JSON.stringify(articles));
    setEditableArticlesRaw(articles);
  };
  const setEditableDepots = (depots: Depot[]) => {
    localStorage.setItem(LS_DEPOTS, JSON.stringify(depots));
    setEditableDepotsRaw(depots);
  };

  const selectedArticleDefault = editableArticles[0]?.name ?? '';
  const [selectedArticle, setSelectedArticle] = useState<string>(selectedArticleDefault);
  const [amount, setAmount] = useState<number | ''>('');
  
  const fairnessByArticle = useMemo(() => {
    const map: Record<string, Record<string, 'viel' | 'wenig' | 'normal'>> = {};
    for (const d of distributions) {
        if (!map[d.articleName]) {
            map[d.articleName] = getFairnessRatio(d.articleName, historyData, editableDepots);
        }
    }
    return map;
  }, [distributions, editableDepots]);
  
  const handleAddHarvest = () => {
    if (typeof amount !== 'number' || amount <= 0) return;
    const article = editableArticles.find(a => a.name === selectedArticle) as Article;
    if (!article) return;
    
    // Check if already exists
    if (distributions.find(d => d.articleName === article.name)) {
      alert("Artikel wurde bereits zur Ernte hinzugefügt!");
      return;
    }
    
    const newDist = calculateDistribution(article.name, article.unit, amount, [], editableDepots);
    setDistributions([...distributions, newDist]);
    setAmount('');
  };

  const handleToggleExclusion = (distId: string, depotKuerzel: string) => {
    setDistributions(distributions.map(dist => {
      if (dist.id === distId) {
        let newExcluded = [...dist.excludedDepots];
        if (newExcluded.includes(depotKuerzel)) {
          newExcluded = newExcluded.filter(x => x !== depotKuerzel);
        } else {
          if (newExcluded.length === editableDepots.length - 1) {
            alert("Mindestens ein Depot muss aktiv bleiben!");
            return dist;
          }
          newExcluded.push(depotKuerzel);
        }
        
        let recalcDist = calculateDistribution(dist.articleName, dist.unit, dist.totalHarvested, newExcluded, editableDepots);
        recalcDist.id = dist.id; 
        recalcDist.geschenkeDepotKuerzel = dist.geschenkeDepotKuerzel; 
        if (newExcluded.includes(recalcDist.geschenkeDepotKuerzel || '')) {
            recalcDist.geschenkeDepotKuerzel = null;
        }
        return recalcDist;
      }
      return dist;
    }));
  };

  const handleSelectGeschenk = (distId: string, depotKuerzel: string) => {
    setDistributions(distributions.map(dist => {
      if (dist.id === distId) {
        return { ...dist, geschenkeDepotKuerzel: depotKuerzel };
      }
      return dist;
    }));
  };

  const handleDeleteDistribution = (distId: string) => {
    if (window.confirm("Diese Verteilung wirklich aus der Liste entfernen?")) {
      setDistributions(distributions.filter(d => d.id !== distId));
    }
  };

  const handleUpdateAmount = (distId: string, newAmount: number) => {
    if (newAmount < 0) return;
    setDistributions(distributions.map(dist => {
      if (dist.id === distId) {
        let recalcDist = calculateDistribution(dist.articleName, dist.unit, newAmount, dist.excludedDepots, editableDepots);
        recalcDist.id = dist.id; 
        recalcDist.geschenkeDepotKuerzel = dist.geschenkeDepotKuerzel; 
        if (recalcDist.remainder <= 0 || recalcDist.excludedDepots.includes(recalcDist.geschenkeDepotKuerzel || '')) {
            recalcDist.geschenkeDepotKuerzel = null;
        }
        return recalcDist;
      }
      return dist;
    }));
  };

  const [printMode, setPrintMode] = useState(false);

  const handlePrint = async () => {
    if (activeTab !== 'calculator' || distributions.length === 0) return;
    
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;

    let updatedHistory = [...historyData];

    for (const dist of distributions) {
       // Deduplicate: same article on the exact same date
       updatedHistory = updatedHistory.filter(row => {
          if (row.artikel === dist.articleName && row.datum === todayStr) {
             return false;
          }
          return true;
       });

       for (const depot of editableDepots) {
          const res = dist.results.find(r => r.depotKuerzel === depot.kuerzel);
          const isExcluded = res?.isExcluded;
          const calculatedAmount = res?.calculatedAmount || 0;
          const getsGift = dist.geschenkeDepotKuerzel === depot.kuerzel;
          
          let finalTotalAmount = calculatedAmount;
          if (getsGift && dist.remainder > 0) {
              finalTotalAmount += dist.remainder;
          }

          if (!isExcluded && finalTotalAmount > 0) {
             let halberAnteilVal = finalTotalAmount / depot.gesamtHalbeAnteile;

             updatedHistory.push({
                 datum: todayStr,
                 depot: depot.name,
                 artikel: dist.articleName,
                 gesamtMenge: finalTotalAmount,
                 ganzerAnteil: halberAnteilVal * 2,
                 halberAnteil: halberAnteilVal,
                 einheit: dist.unit
             });
          }
       }
    }

    const year = getHarvestYear(todayStr);
    
    // Safety: only sync rows belonging to the current target harvest year
    const jsonForSync = updatedHistory.filter(row => getHarvestYear(row.datum) === year);
    const jsonContent = JSON.stringify(jsonForSync, null, 2);

    // Regenerate MD content for just that year
    const headers = ["Datum", "Depot", "Artikel", "GesamtMenge", "Ganze Anteile", "Halbe Anteile", "Einheit"];
    let mdContent = headers.join('\t') + '\n';
    for (const row of jsonForSync) {
      let ges = typeof row.gesamtMenge === 'number' && Number.isInteger(row.gesamtMenge) ? row.gesamtMenge.toString() : row.gesamtMenge.toFixed(4).replace(/\.?0+$/, '');
      let ganzer = typeof row.ganzerAnteil === 'number' && Number.isInteger(row.ganzerAnteil) ? row.ganzerAnteil.toString() : row.ganzerAnteil.toFixed(4).replace(/\.?0+$/, '');
      let halber = typeof row.halberAnteil === 'number' && Number.isInteger(row.halberAnteil) ? row.halberAnteil.toString() : row.halberAnteil.toFixed(4).replace(/\.?0+$/, '');

      mdContent += `${row.datum}\t${row.depot}\t${row.artikel}\t${ges}\t${ganzer}\t${halber}\t${row.einheit}\n`;
    }

    try {
        await invoke('sync_history', { year, mdContent, jsonContent });
    } catch (e) {
        console.error("Failed to sync history:", e);
        alert("Achtung: Konnte die Historie nicht dauerhaft speichern! Läuft das Backend?");
    }

    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 500);
  };

  if (printMode) {
    return (
      <div className="print-layout">
        {editableDepots.map(depot => {
          const validDistributions = distributions.filter(d => {
             const res = d.results.find(r => r.depotKuerzel === depot.kuerzel);
             const getsGift = d.geschenkeDepotKuerzel === depot.kuerzel && d.remainder > 0;
             return (res && !res.isExcluded && res.calculatedAmount > 0) || getsGift;
          });

          return (
            <div key={depot.kuerzel} className="print-page">
              <h1>Ernteverteilung - {depot.name}</h1>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Gesamt: {depot.gesamtHalbeAnteile} Halbe Anteile ({depot.halbeAnteile} Halbe, {depot.ganzeAnteile} Ganze)
              </p>
              
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '2px solid black', padding: '8px' }}>Artikel</th>
                    <th style={{ borderBottom: '2px solid black', padding: '8px' }}>Gesamtmenge für Depot</th>
                    <th style={{ borderBottom: '2px solid black', padding: '8px' }}>Einen halben Anteil</th>
                    <th style={{ borderBottom: '2px solid black', padding: '8px' }}>Einen ganzen Anteil</th>
                  </tr>
                </thead>
                <tbody>
                  {validDistributions.map(dist => {
                    const res = dist.results.find(r => r.depotKuerzel === depot.kuerzel);
                    const isGiftOnly = (!res || res.isExcluded || res.calculatedAmount <= 0);
                    const getsGift = dist.geschenkeDepotKuerzel === depot.kuerzel && dist.remainder > 0;
                    
                    const unit = dist.unit;
                    let totalDepotAmount = isGiftOnly ? 0 : (res?.calculatedAmount || 0);
                    
                    let perHalb: string | number = isGiftOnly ? 0 : totalDepotAmount / depot.gesamtHalbeAnteile;
                    let perGanz: string | number = isGiftOnly ? 0 : (perHalb as number) * 2;
                    let amountText = `${totalDepotAmount} ${unit}`;

                    if (unit === 'Stück') {
                       perHalb = (perHalb as number).toFixed(2);
                       perGanz = (perGanz as number).toFixed(2);
                    } else {
                       perHalb = (perHalb as number).toFixed(2);
                       perGanz = (perGanz as number).toFixed(2);
                    }

                    if (getsGift) {
                       amountText += ` (+ ${dist.remainder} ${unit} Geschenk!)`;
                    }
                    
                    return (
                      <tr key={dist.id}>
                        <td style={{ borderBottom: '1px solid #ddd', padding: '8px' }}><strong>{dist.articleName}</strong></td>
                        <td style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>{amountText}</td>
                        <td style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>{isGiftOnly ? '-' : `${perHalb} ${unit}`}</td>
                        <td style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>{isGiftOnly ? '-' : `${perGanz} ${unit}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {distributions.filter(d => d.geschenkeDepotKuerzel === depot.kuerzel && d.remainder > 0).length > 0 && (
                <div style={{ padding: '15px', border: '2px dashed #666', borderRadius: '8px', background: '#f9f9f9' }}>
                   <h2>🎁 Geschenkekiste!</h2>
                   <p>Dieses Depot erhält heute Reste, die nicht einteilbar waren:</p>
                   <ul>
                     {distributions.filter(d => d.geschenkeDepotKuerzel === depot.kuerzel && d.remainder > 0).map(d => (
                       <li key={d.id}><strong>{d.remainder} {d.unit} {d.articleName}</strong></li>
                     ))}
                   </ul>
                </div>
              )}

              {validDistributions.length === 0 && <p>Keine Ernte für dieses Depot erfasst.</p>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header className="nav-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--color-primary)' }}>SoLaWi App</h1>
          <p style={{ color: 'var(--color-text-light)' }}>Offline Depot-Verwaltung & Ernteplanung</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', background: 'var(--color-surface-solid)', padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <button 
              className={`tab-button ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
            >
              Aktuelle Verteilung
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Historie &amp; Statistik
            </button>
            <button 
              className={`tab-button ${activeTab === 'masterdata' ? 'active' : ''}`}
              onClick={() => setActiveTab('masterdata')}
            >
              ⚙️ Stammdaten
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface-solid)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-light)' }}>Erntejahr:</span>
            <select 
              className="input" 
              style={{ width: 'auto', padding: '2px 8px', fontSize: '0.9rem', fontWeight: 600, border: 'none', background: 'transparent' }}
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
            >
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {activeTab === 'calculator' ? (
          <button className="button" onClick={handlePrint} disabled={distributions.length === 0}>
             🖨️ Verteilliste Drucken
          </button>
        ) : (
          <div style={{ width: '200px' }}></div>
        )}
      </header>

      {activeTab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: '2rem' }}>
          
          {/* Sidebar / Form */}
          <div>
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Neue Ernte eintragen</h2>
              <div className="form-group">
                <label>Artikel auswählen</label>
                <select 
                  className="input" 
                  value={selectedArticle}
                  onChange={e => setSelectedArticle(e.target.value)}
                >
                  {editableArticles.map(a => (
                    <option key={`${a.name}-${a.unit}`} value={a.name}>{a.name} ({a.unit})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Gesamtmenge</label>
                <input 
                  type="number" 
                  className="input"
                  placeholder="z.B. 150"
                  value={amount}
                  min="0"
                  step="any"
                  onChange={e => setAmount(Number(e.target.value) || '')} 
                />
              </div>
              
              <button className="button" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleAddHarvest}>
                Hinzufügen
              </button>
            </div>
            </div>
          
          {/* Main Area / Distributions */}
          <div>
            {distributions.length === 0 && (
              <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text)' }}>
                <h3>🌾 Keine Artikel hinzugefügt.</h3>
                <p style={{ color: 'var(--color-text-light)' }}>Wähle links einen Artikel und eine Menge, um die Verteilung zu berechnen.</p>
              </div>
            )}
            
            {distributions.map((dist, idx) => (
              <div key={dist.id} className="glass-panel animate-in" style={{ padding: '1.5rem', marginBottom: '1.5rem', animationDelay: `${idx * 0.1}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{dist.articleName}</h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-solid)', borderRadius: '6px', border: '1px solid var(--color-border)', padding: '2px' }}>
                        <input 
                          type="number"
                          min="0"
                          step="any"
                          value={dist.totalHarvested}
                          onChange={(e) => handleUpdateAmount(dist.id, Number(e.target.value))}
                          style={{ width: '80px', border: 'none', background: 'transparent', textAlign: 'right', outline: 'none', fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.95rem' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-light)', padding: '0 8px 0 4px', fontWeight: 500 }}>{dist.unit}</span>
                      </div>

                      {dist.excludedDepots && dist.excludedDepots.length > 0 && (
                        <span className="badge" style={{ background: 'rgba(225, 29, 72, 0.1)', color: 'var(--color-danger)' }}>
                          {dist.excludedDepots.length} ausgeschlossen
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.95rem', color: 'var(--color-text-light)' }}>
                      Rechnerisch entspricht ein <strong style={{color: 'var(--color-primary)'}}>halber Anteil ca. {dist.sharePerHalb} {dist.unit}</strong>.
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    {dist.unit === 'Stück' && dist.sharePerHalb < 1 && (
                      <div style={{ background: 'rgba(225, 29, 72, 0.1)', color: 'var(--color-danger)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--color-danger)', fontSize: '0.85rem', maxWidth: '250px' }}>
                         ⚠️ <strong>Warnung:</strong> Menge reicht nicht aus (0 Stück pro Person). Bitte Depots unten ausschließen!
                      </div>
                    )}

                    {dist.remainder > 0 && (
                      <div style={{ background: 'var(--color-surface-solid)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                        <div style={{ fontWeight: 500, color: 'var(--color-danger)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                          🎁 Geschenkekiste ({dist.remainder} {dist.unit} übrig)
                        </div>
                        <select 
                          className="input" 
                          style={{ padding: '0.4rem', fontSize: '0.85rem' }}
                          value={dist.geschenkeDepotKuerzel || ''}
                          onChange={e => handleSelectGeschenk(dist.id, e.target.value)}
                        >
                          <option value="">-- Depot wählen --</option>
                          {editableDepots.map(d => (
                            <option key={d.kuerzel} value={d.kuerzel}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button 
                      onClick={() => handleDeleteDistribution(dist.id)}
                      title="Verteilung löschen"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.4rem', opacity: 0.6, transition: 'var(--transition)' }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Aktiv</th>
                        <th>Depot</th>
                        <th>Berechnete Menge ({dist.unit})</th>
                        {dist.remainder > 0 && <th>Geschenkekiste</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dist.results.map(res => {
                        const matchedDepot = editableDepots.find(d => d.kuerzel === res.depotKuerzel);
                        const ratioState = fairnessByArticle[dist.articleName]?.[res.depotKuerzel];
                        let indicator = null;
                        if (ratioState === 'wenig') indicator = <span title="Letzte 12 Monate: Deutlich weniger als Durchschnitt erhalten (Nachholbedarf)" style={{marginLeft: '0.5rem', cursor: 'help'}}>🔴🔻</span>;
                        if (ratioState === 'viel')  indicator = <span title="Letzte 12 Monate: Deutlich mehr als Durchschnitt erhalten" style={{marginLeft: '0.5rem', cursor: 'help'}}>🟢🔺</span>;

                        return (
                        <tr key={res.depotKuerzel} style={{ opacity: res.isExcluded ? 0.5 : 1, background: res.isExcluded ? 'rgba(0,0,0,0.02)' : 'transparent', transition: 'var(--transition)' }}>
                          <td style={{ width: '60px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              title="Wenn deaktiviert, erhält dieses Depot keinen Anteil von diesem Artikel."
                              checked={!res.isExcluded}
                              onChange={() => handleToggleExclusion(dist.id, res.depotKuerzel)}
                              style={{ cursor: 'pointer', transform: 'scale(1.2)', accentColor: 'var(--color-primary)' }}
                            />
                          </td>
                          <td>
                            {res.depotKuerzel} {indicator}
                            <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                               ({matchedDepot?.gesamtHalbeAnteile} halbe Anteile)
                            </span>
                            {res.isExcluded && <i style={{marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--color-danger)'}}>(Ausgeschlossen)</i>}
                          </td>
                          <td style={{ fontWeight: res.isExcluded ? 400 : 600 }}>
                            {res.isExcluded ? '-' : res.calculatedAmount} 
                          </td>
                          {dist.remainder > 0 && (
                            <td style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                              {dist.geschenkeDepotKuerzel === res.depotKuerzel ? `+ ${dist.remainder}` : ''}
                            </td>
                          )}
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <HistoryView
          data={historyData}
          selectedYear={selectedYear}
          onHistoryChange={setHistoryData}
          allDepots={[
            ...editableDepots,
            // Include historic depots from data.ts for backward compatibility with old history entries
            ...ALL_DEPOTS.filter(d => d.isHistoric && !editableDepots.find(e => e.kuerzel === d.kuerzel))
          ]}
        />
      )}

      {activeTab === 'masterdata' && (
        <MasterDataView
          articles={editableArticles}
          depots={editableDepots}
          onArticlesChange={setEditableArticles}
          onDepotsChange={setEditableDepots}
        />
      )}
    </div>
  );
}

export default App;
