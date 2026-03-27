import { useState } from 'react';
import { Depot, Article, UnitType } from './data';

interface MasterDataViewProps {
  articles: Article[];
  depots: Depot[];
  onArticlesChange: (articles: Article[]) => void;
  onDepotsChange: (depots: Depot[]) => void;
}

export default function MasterDataView({ articles, depots, onArticlesChange, onDepotsChange }: MasterDataViewProps) {
  const [activeSection, setActiveSection] = useState<'articles' | 'depots'>('articles');

  // ---- Article state ----
  const [newArticleName, setNewArticleName] = useState('');
  const [newArticleUnit, setNewArticleUnit] = useState<UnitType>('Stück');
  const [editingArticleIdx, setEditingArticleIdx] = useState<number | null>(null);
  const [editArticleName, setEditArticleName] = useState('');
  const [editArticleUnit, setEditArticleUnit] = useState<UnitType>('Stück');

  // ---- Depot state ----
  const [newDepotName, setNewDepotName] = useState('');
  const [newDepotKuerzel, setNewDepotKuerzel] = useState('');
  const [newDepotHalbe, setNewDepotHalbe] = useState<number | ''>('');
  const [newDepotGanze, setNewDepotGanze] = useState<number | ''>('');
  const [editingDepotIdx, setEditingDepotIdx] = useState<number | null>(null);
  const [editDepot, setEditDepot] = useState<Partial<Depot>>({});

  // =========== ARTICLES ===========
  const handleAddArticle = () => {
    const name = newArticleName.trim();
    if (!name) return;
    if (articles.find(a => a.name.toLowerCase() === name.toLowerCase() && a.unit === newArticleUnit)) {
      alert('Artikel mit diesem Namen und dieser Einheit existiert bereits!');
      return;
    }
    onArticlesChange([...articles, { name, unit: newArticleUnit }].sort((a, b) => a.name.localeCompare(b.name)));
    setNewArticleName('');
  };

  const handleDeleteArticle = (idx: number) => {
    if (!window.confirm(`Artikel "${articles[idx].name}" wirklich löschen?`)) return;
    const updated = articles.filter((_, i) => i !== idx);
    onArticlesChange(updated);
  };

  const handleStartEditArticle = (idx: number) => {
    setEditingArticleIdx(idx);
    setEditArticleName(articles[idx].name);
    setEditArticleUnit(articles[idx].unit);
  };

  const handleSaveArticle = (idx: number) => {
    const name = editArticleName.trim();
    if (!name) return;
    const updated = articles.map((a, i) => i === idx ? { name, unit: editArticleUnit } : a)
      .sort((a, b) => a.name.localeCompare(b.name));
    onArticlesChange(updated);
    setEditingArticleIdx(null);
  };

  // =========== DEPOTS ===========
  const calcGesamtHalbe = (halbe: number, ganze: number) => halbe + ganze * 2;

  const handleAddDepot = () => {
    const name = newDepotName.trim();
    const kuerzel = newDepotKuerzel.trim();
    if (!name || !kuerzel) { alert('Name und Kürzel sind Pflichtfelder.'); return; }
    if (typeof newDepotHalbe !== 'number' || typeof newDepotGanze !== 'number') {
      alert('Bitte gültige Anteilsmengen eintragen.'); return;
    }
    if (depots.find(d => d.name.toLowerCase() === name.toLowerCase())) {
      alert('Ein Depot mit diesem Namen existiert bereits.'); return;
    }
    const gesamtHalbe = calcGesamtHalbe(newDepotHalbe, newDepotGanze);
    const totalWithNew = depots.reduce((s, d) => s + d.gesamtHalbeAnteile, 0) + gesamtHalbe;
    const newDepot: Depot = {
      name,
      kuerzel,
      halbeAnteile: newDepotHalbe,
      ganzeAnteile: newDepotGanze,
      gesamtHalbeAnteile: gesamtHalbe,
      prozent: Math.round((gesamtHalbe / totalWithNew) * 1000) / 10,
    };
    // Recalculate prozent for all
    const updated = [...depots, newDepot].map(d => ({
      ...d,
      prozent: Math.round((d.gesamtHalbeAnteile / totalWithNew) * 1000) / 10,
    }));
    onDepotsChange(updated);
    setNewDepotName(''); setNewDepotKuerzel(''); setNewDepotHalbe(''); setNewDepotGanze('');
  };

  const handleDeleteDepot = (idx: number) => {
    if (!window.confirm(`Depot "${depots[idx].name}" wirklich löschen?`)) return;
    const updated = depots.filter((_, i) => i !== idx);
    const total = updated.reduce((s, d) => s + d.gesamtHalbeAnteile, 0) || 1;
    onDepotsChange(updated.map(d => ({ ...d, prozent: Math.round((d.gesamtHalbeAnteile / total) * 1000) / 10 })));
  };

  const handleStartEditDepot = (idx: number) => {
    setEditingDepotIdx(idx);
    setEditDepot({ ...depots[idx] });
  };

  const handleSaveDepot = (idx: number) => {
    if (!editDepot.name?.trim()) return;
    const halbe = editDepot.halbeAnteile ?? 0;
    const ganze = editDepot.ganzeAnteile ?? 0;
    const gesamtHalbe = calcGesamtHalbe(halbe, ganze);
    const updated = depots.map((d, i) =>
      i === idx ? { ...d, ...editDepot, gesamtHalbeAnteile: gesamtHalbe } : d
    );
    const total = updated.reduce((s, d) => s + d.gesamtHalbeAnteile, 0) || 1;
    onDepotsChange(updated.map(d => ({ ...d, prozent: Math.round((d.gesamtHalbeAnteile / total) * 1000) / 10 })));
    setEditingDepotIdx(null);
  };

  const inputStyle = {
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-solid)',
    color: 'var(--color-text)',
    fontSize: '0.9rem',
  } as React.CSSProperties;

  const btnStyle = (color: string) => ({
    padding: '0.3rem 0.7rem',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
    background: color,
    color: '#fff',
    transition: 'opacity 0.15s',
  } as React.CSSProperties);

  return (
    <div className="glass-panel animate-in" style={{ padding: '2rem', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-primary)', marginBottom: '0.4rem' }}>⚙️ Stammdaten</h2>
        <p style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>
          Artikel und Depots verwalten. Änderungen werden sofort übernommen und gespeichert.
        </p>
      </div>

      {/* Section toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'var(--color-surface-solid)', padding: '0.3rem', borderRadius: '8px', border: '1px solid var(--color-border)', width: 'fit-content' }}>
        {(['articles', 'depots'] as const).map(sec => (
          <button
            key={sec}
            onClick={() => setActiveSection(sec)}
            style={{
              padding: '0.4rem 1.2rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.9rem',
              background: activeSection === sec ? 'var(--color-primary)' : 'transparent',
              color: activeSection === sec ? '#fff' : 'var(--color-text)',
              transition: 'all 0.2s',
            }}
          >
            {sec === 'articles' ? '🥕 Artikelliste' : '🏠 Depots'}
          </button>
        ))}
      </div>

      {/* ===== ARTICLES ===== */}
      {activeSection === 'articles' && (
        <div>
          {/* Add form */}
          <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Artikelname</label>
              <input
                style={{ ...inputStyle, width: '200px' }}
                placeholder="z.B. Tomaten"
                value={newArticleName}
                onChange={e => setNewArticleName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddArticle()}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Einheit</label>
              <select style={inputStyle} value={newArticleUnit} onChange={e => setNewArticleUnit(e.target.value as UnitType)}>
                <option value="Stück">Stück</option>
                <option value="kg">kg (Gewicht)</option>
              </select>
            </div>
            <button className="button" style={{ marginBottom: '0' }} onClick={handleAddArticle}>
              ＋ Artikel anlegen
            </button>
          </div>

          {/* Article table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Artikel</th>
                  <th>Einheit</th>
                  <th style={{ width: '160px' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((art, idx) => (
                  <tr key={`${art.name}-${art.unit}`}>
                    {editingArticleIdx === idx ? (
                      <>
                        <td>
                          <input
                            style={{ ...inputStyle, width: '100%' }}
                            value={editArticleName}
                            onChange={e => setEditArticleName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveArticle(idx)}
                            autoFocus
                          />
                        </td>
                        <td>
                          <select style={inputStyle} value={editArticleUnit} onChange={e => setEditArticleUnit(e.target.value as UnitType)}>
                            <option value="Stück">Stück</option>
                            <option value="kg">kg</option>
                          </select>
                        </td>
                        <td style={{ display: 'flex', gap: '0.4rem', padding: '8px' }}>
                          <button style={btnStyle('var(--color-primary)')} onClick={() => handleSaveArticle(idx)}>✓ Speichern</button>
                          <button style={btnStyle('#888')} onClick={() => setEditingArticleIdx(null)}>Abbruch</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td><strong>{art.name}</strong></td>
                        <td><span className="badge">{art.unit}</span></td>
                        <td style={{ display: 'flex', gap: '0.4rem', padding: '8px' }}>
                          <button style={btnStyle('var(--color-primary)')} onClick={() => handleStartEditArticle(idx)}>✏️ Bearbeiten</button>
                          <button style={btnStyle('var(--color-danger)')} onClick={() => handleDeleteArticle(idx)}>✕ Löschen</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== DEPOTS ===== */}
      {activeSection === 'depots' && (
        <div>
          {/* Add form */}
          <div className="glass-panel" style={{ padding: '1.2rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {[
              { label: 'Name', val: newDepotName, set: setNewDepotName, placeholder: 'z.B. Frankfurt', w: '180px', type: 'text' },
              { label: 'Kürzel', val: newDepotKuerzel, set: setNewDepotKuerzel, placeholder: 'z.B. Ffm', w: '100px', type: 'text' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>{f.label}</label>
                <input style={{ ...inputStyle, width: f.w }} placeholder={f.placeholder} value={f.val as string}
                  onChange={e => f.set(e.target.value as any)}
                  onKeyDown={e => e.key === 'Enter' && handleAddDepot()} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Halbe Anteile</label>
              <input type="number" min="0" style={{ ...inputStyle, width: '90px' }} placeholder="0"
                value={newDepotHalbe} onChange={e => setNewDepotHalbe(Number(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleAddDepot()} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-light)', marginBottom: '0.3rem' }}>Ganze Anteile</label>
              <input type="number" min="0" style={{ ...inputStyle, width: '90px' }} placeholder="0"
                value={newDepotGanze} onChange={e => setNewDepotGanze(Number(e.target.value))}
                onKeyDown={e => e.key === 'Enter' && handleAddDepot()} />
            </div>
            <button className="button" onClick={handleAddDepot}>＋ Depot anlegen</button>
          </div>

          {/* Depot table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Depot</th>
                  <th>Kürzel</th>
                  <th>Halbe Ant.</th>
                  <th>Ganze Ant.</th>
                  <th>Gesamt ½</th>
                  <th>%</th>
                  <th style={{ width: '180px' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {depots.map((depot, idx) => (
                  <tr key={depot.kuerzel}>
                    {editingDepotIdx === idx ? (
                      <>
                        <td>
                          <input style={{ ...inputStyle, width: '130px' }} value={editDepot.name ?? ''} autoFocus
                            onChange={e => setEditDepot(p => ({ ...p, name: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleSaveDepot(idx)} />
                        </td>
                        <td>
                          <input style={{ ...inputStyle, width: '80px' }} value={editDepot.kuerzel ?? ''}
                            onChange={e => setEditDepot(p => ({ ...p, kuerzel: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleSaveDepot(idx)} />
                        </td>
                        <td>
                          <input type="number" min="0" style={{ ...inputStyle, width: '70px' }} value={editDepot.halbeAnteile ?? 0}
                            onChange={e => setEditDepot(p => ({ ...p, halbeAnteile: Number(e.target.value) }))}
                            onKeyDown={e => e.key === 'Enter' && handleSaveDepot(idx)} />
                        </td>
                        <td>
                          <input type="number" min="0" style={{ ...inputStyle, width: '70px' }} value={editDepot.ganzeAnteile ?? 0}
                            onChange={e => setEditDepot(p => ({ ...p, ganzeAnteile: Number(e.target.value) }))}
                            onKeyDown={e => e.key === 'Enter' && handleSaveDepot(idx)} />
                        </td>
                        <td style={{ color: 'var(--color-text-light)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {calcGesamtHalbe(editDepot.halbeAnteile ?? 0, editDepot.ganzeAnteile ?? 0)}
                        </td>
                        <td>–</td>
                        <td style={{ display: 'flex', gap: '0.4rem', padding: '8px' }}>
                          <button style={btnStyle('var(--color-primary)')} onClick={() => handleSaveDepot(idx)}>✓ Speichern</button>
                          <button style={btnStyle('#888')} onClick={() => setEditingDepotIdx(null)}>Abbruch</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td><strong>{depot.name}</strong></td>
                        <td><span style={{ fontFamily: 'monospace', background: 'var(--color-surface-solid)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85rem' }}>{depot.kuerzel}</span></td>
                        <td>{depot.halbeAnteile}</td>
                        <td>{depot.ganzeAnteile}</td>
                        <td><strong style={{ color: 'var(--color-primary)' }}>{depot.gesamtHalbeAnteile}</strong></td>
                        <td><span className="badge">{depot.prozent}%</span></td>
                        <td style={{ display: 'flex', gap: '0.4rem', padding: '8px' }}>
                          <button style={btnStyle('var(--color-primary)')} onClick={() => handleStartEditDepot(idx)}>✏️ Bearbeiten</button>
                          <button style={btnStyle('var(--color-danger)')} onClick={() => handleDeleteDepot(idx)}>✕ Löschen</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
            ℹ️ Gesamt halbe Anteile: <strong>{depots.reduce((s, d) => s + d.gesamtHalbeAnteile, 0)}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
