# Linux Build Guide - SoLaWi App

Folge diesen Schritten, um die App auf deinem **Linux Mint 22 (Wilma)** oder einem anderen Ubuntu-basierten System zu bauen.

## 1. Code vorbereiten
Kopiere den gesamten Projektordner (`SoLaWi`) von deinem Windows-Rechner auf deinen Linux-Rechner (z.B. per USB-Stick oder Git).

## 2. Setup-Skript ausführen
Öffne ein Terminal im Ordner `ernte-app` auf deinem Linux-Rechner und führe folgende Befehle aus:

```bash
chmod +x setup_linux.sh
./setup_linux.sh
```

### Was das Skript macht:
- Installiert alle benötigten System-Bibliotheken (`libwebkit2gtk-4.1`, `libgtk-3`, etc.).
- Installiert **Rust** und **Node.js**, falls diese noch nicht vorhanden sind.
- Kompiliert das Frontend und baut die finalen Linux-Pakete.

## 3. Pakete finden
Sobald das Skript fertig ist, findest du deine Installationsdateien hier:

```text
ernte-app/src-tauri/target/release/bundle/
├── deb/
│   └── ernte-app_0.1.0_amd64.deb     <-- Doppelklick zum Installieren
└── appimage/
    └── ernte-app_0.1.0_amd64.AppImage <-- Eigenständige Datei (portabel)
```

## 4. App starten
- **Option A**: Doppelklick auf die `.deb` Datei, um sie fest auf deinem System zu installieren.
- **Option B**: Rechtsklick auf die `.AppImage`, unter *Eigenschaften > Zugriffsrechte* den Haken bei "Datei als Programm ausführen" setzen, und dann doppelklicken.

> [!IMPORTANT]
> **Daten-Migration**: Vergiss nicht, deine `historie-*.json` und `stammdaten.json` Dateien aus deinem Windows-Build-Ordner in denselben Ordner wie die App auf deinem Linux-System zu kopieren, um deine Daten zu behalten!
