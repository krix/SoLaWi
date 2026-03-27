#!/bin/bash

# --- Linux Mint 22 (Wilma) / Ubuntu 24.04 (Noble) Build Script for SoLaWi App ---
# This script installs all necessary dependencies and builds the Tauri application.

set -e

echo "--- Starte App-Setup für Linux Mint 22 ---"

# 1. System-Abhängigkeiten installieren
echo "1. Installiere System-Bibliotheken (GTK, WebKit, etc.)..."
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# 2. Rust installieren (falls nicht vorhanden)
if ! command -v rustc &> /dev/null; then
    echo "2. Installiere Rust (rustup)..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    echo "2. Rust ist bereits installiert."
fi

# 3. Node.js und NPM prüfen
if ! command -v npm &> /dev/null; then
    echo "3. Installiere Node.js..."
    sudo apt install -y nodejs npm
else
    echo "3. Node.js ist bereits installiert."
fi

# 4. App bauen
echo "4. Installiere Node-Abhängigkeiten..."
npm install

echo "5. Baue das Frontend..."
npm run build

echo "6. Baue das Tauri-Bundle (.deb & .AppImage)..."
npm run tauri build

echo ""
echo "--- Build abgeschlossen! ---"
echo "Du findest die Pakete im Ordner: src-tauri/target/release/bundle/"
echo "Die .deb Datei kannst du einfach mit Doppelklick installieren."
