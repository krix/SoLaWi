# Linux Build Guide - AckerApp v1.1.0

Folge diesen Schritten, um die App auf deinem **Linux Mint 22 (Wilma)** oder einem anderen Ubuntu-basierten System zu bauen.

## Voraussetzungen
- Ubuntu 24.04 / Linux Mint 22 oder neuer
- Internetzugang (für Downloads bei Ersteinrichtung)
- Das Skript installiert automatisch: **Node.js 22 LTS**, **Rust** und alle System-Bibliotheken

## 1. Code vorbereiten
Kopiere den gesamten Projektordner (`SoLaWi`) von deinem Windows-Rechner auf deinen Linux-Rechner (z.B. per USB-Stick oder Git).

## 2. Setup-Skript ausführen
Öffne ein Terminal im Ordner `ernte-app` auf deinem Linux-Rechner und führe folgende Befehle aus:

```bash
chmod +x setup_linux.sh
./setup_linux.sh
```

### Was das Skript macht:
1. Installiert alle benötigten System-Bibliotheken (`libwebkit2gtk-4.1`, `libgtk-3`, etc.)
2. Installiert **Node.js 22 LTS** über NodeSource (die Ubuntu/Mint-Pakete sind zu alt!)
3. Installiert **Rust** via rustup, falls noch nicht vorhanden
4. Löscht vorhandene `node_modules` (wichtig beim Plattformwechsel Windows → Linux)
5. Kompiliert das Frontend und baut die finalen Linux-Pakete

> [!WARNING]
> **Wichtig**: Das Skript entfernt `node_modules` und `package-lock.json` automatisch, da diese bei einem Plattformwechsel von Windows auf Linux inkompatibel sind.

## 3. Pakete finden
Sobald das Skript fertig ist, findest du deine Installationsdateien hier:

```text
ernte-app/src-tauri/target/release/bundle/
├── deb/
│   └── ernte-app_1.1.0_amd64.deb     <-- Doppelklick zum Installieren
└── appimage/
    └── ernte-app_1.1.0_amd64.AppImage <-- Eigenständige Datei (portabel)
```

## 4. App starten
- **Option A**: Doppelklick auf die `.deb` Datei, um sie fest auf deinem System zu installieren.
- **Option B**: Rechtsklick auf die `.AppImage`, unter *Eigenschaften > Zugriffsrechte* den Haken bei "Datei als Programm ausführen" setzen, und dann doppelklicken.

> [!IMPORTANT]
> **Daten-Dateien**: Die `historie-*.json` und `stammdaten.json` Dateien aus dem Projektordner werden automatisch in das Installationspaket aufgenommen. Wenn du nach der Installation neuere Daten hast, kopiere sie in das Verzeichnis `/usr/lib/com.solawi.ernte/`.
