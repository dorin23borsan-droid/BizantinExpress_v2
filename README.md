# Bizantin Express 🚚

Sistema di gestione consegne ultra-veloce per negozianti e runner. Sviluppato con React, Express, SQLite e Capacitor.

## 📱 Caratteristiche
- **Dashboard Negoziante**: Creazione ordini e calcolo distanze.
- **App Runner**: Ricezione ordini in tempo reale tramite Socket.io.
- **Mappe Live**: Integrazione con Leaflet per la visualizzazione delle consegne.
- **Notifiche**: Aggiornamenti istantanei sullo stato degli ordini.
- **Mobile Ready**: Pronto per essere compilato come APK Android.

## 🛠 Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide React, Motion.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: SQLite (Better-SQLite3).
- **Mobile**: Capacitor.js.

## 🚀 Installazione Locale
1. Clona il repository.
2. Installa le dipendenze: `npm install`.
3. Avvia in modalità sviluppo: `npm run dev`.

## 📦 Compilazione Android
1. Genera la build statica: `npm run static-build`.
2. Sincronizza Capacitor: `npm run cap-sync`.
3. Apri in Android Studio: `npx cap open android`.

## ☁️ Deploy Cloud
Il server è configurato per funzionare su piattaforme come Railway o Render. Assicurati di impostare le variabili d'ambiente `JWT_SECRET` e `PORT`.
