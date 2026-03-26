const fs = require('fs');
const path = require('path');

const srcFile = path.join(__dirname, '..', 'HISTORIE.MD');
const destFile = path.join(__dirname, 'src', 'historie.json');

try {
  const content = fs.readFileSync(srcFile, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
  
  // Skip header
  const header = lines[0].split('\t');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 7) continue;
    
    data.push({
      datum: cols[0],
      depot: cols[1],
      artikel: cols[2],
      gesamtMenge: parseFloat(cols[3]) || 0,
      ganzerAnteil: parseFloat(cols[4]) || 0,
      halberAnteil: parseFloat(cols[5]) || 0,
      einheit: cols[6]
    });
  }
  
  fs.writeFileSync(destFile, JSON.stringify(data, null, 2));
  console.log(`Successfully parsed ${data.length} records into historie.json`);
} catch (e) {
  console.error('Error importing:', e);
}
