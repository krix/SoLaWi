# AckerApp - SoLaWi Ernteplanung & Depot-Verwaltung

Die **AckerApp** ist eine spezialisierte, offline-fähige Desktop-Anwendung, die für Initiativen der Solidarischen Landwirtschaft (SoLaWi) zur effizienten und gerechten Verteilung der wöchentlichen Ernte an verschiedene Depots entwickelt wurde.

## 🌾 Funktionen

- **Dynamische Ernteverteilung**: Schnelle Eingabe und tagesaktuelle Verteilung von Gemüse und anderen Erzeugnissen.
- **Fairness-Rechner für Restmengen**: Komplexe Berechnungen mit halben und ganzen Anteilen sowie automatisiertes Verteilen von Stück-Rundungen.
- **Druckfunktionen für Pack-Stationen**: Direkter Druck von "Gesamtübersichten" für das Packteam auf dem Acker sowie "Depot-Listen" für die Verteilungskoordinatoren. (Das Programm unterscheidet dabei automatisch zwischen Querformat für Tabellen und Hochformat für Depot-Listen).
- **Stammdatenverwaltung (Master Data)**: Lokales Verwalten von Gemüsesorten (kg, Stück) und Depots.
- **Historie & Statistik**: Einsicht in alle vergangenen Lieferungen, kumulierte Fairness-Kurven über das Jahr hinweg sowie CSV-Export der Erntestatistik (inklusive automatischer Einrechnung von z.B. 5% Schwund).
- **Vollständig Offline**: Alle Daten werden in lokalen JSON-Dateien gesichert, wodurch die App auch auf Laptops mit schlechter Internetverbindung (z. B. direkt auf dem Feld/Acker) ausfallsicher genutzt werden kann.

## 🛠 Technologie-Stack

- **Frontend**: React (TypeScript), CSS
- **Backend/Framework**: [Tauri](https://tauri.app/) (Rust) - Ermöglicht schnelle und ressourcenschonende Desktop-Builds für Windows, macOS und Linux.
- **Charts**: Recharts

## 🚀 Installation & Start (Entwicklung)

Voraussetzungen: `Node.js` (und npm), `Rust` (cargo) sowie die Tauri Systemabhängigkeiten.

```bash
# In das App-Verzeichnis wechseln
cd ernte-app

# Abhängigkeiten installieren
npm install

# Entwicklungsumgebung starten
npm run tauri dev
```

## 📦 Build / Kompilieren (Production)

Um eine eigenständige, ausführbare Datei (.exe für Windows, .AppImage/.deb für Linux) zu erstellen:

```bash
cd ernte-app
npm run tauri build
```

Das fertige Build-Artefakt befindet sich danach im Ordner `ernte-app/src-tauri/target/release/bundle/`.

## 📂 Daten-Speicherung

Die App erzeugt und verwaltet Dateien lokal in ihrem definierten Konfigurationsordner.
Die wesentlichen Speicherdateien sind:
- `stammdaten.json` (enthält alle Depots und Artikel)
- `history_YYYY.json` (enthält die Ernte-Mengen des jeweiligen Jahres)