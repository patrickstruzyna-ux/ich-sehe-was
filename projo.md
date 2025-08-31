# Projekt: Ich sehe was (I Spy AI)

## 1. Projektanforderungen
- Plattform: Web (Vite + React + TypeScript) und Android (Capacitor)
- Node.js vorhanden, npm Scripts: dev/build; Android via Gradle
- API-Schlüssel: GEMINI_API_KEY in .env.local
- Funktionen:
  - Bildquelle: Kamera (Capacitor Camera) und Datei-Upload
  - Objekterkennung via Gemini (services/geminiService.ts)
  - Spiel-Logik „Ich sehe was…“ mit Runden, Punkten, KI-/User-Turns
  - Spracherkennung: Web Speech API (de-DE) für Hinweise und TTS-Ausgabe
  - Interaktive Bildanzeige mit Segmentierungs- oder Polygon-Masken
  - Frame-Selektor zur Bildausschnitt-Wahl vor Erkennung
- Android-Berechtigungen: CAMERA, READ_MEDIA_IMAGES, ggf. Storage
- UI/UX: Responsive, klare Fehlermeldungen, visuelle Hinweise

## 2. Beschreibung/Funktionalität
- Start (GameState.START): Nutzer lädt Bild hoch oder nimmt Foto auf
- Frame-Selektor (FrameSelector): Nutzer wählt optimalen Ausschnitt (Canvas-basiert)
- Erkennung (geminiService.detectObjects): Erzeugt GameObjects inkl. Labels, Masken, Farben
- Runde:
  - USER_PICKING: Nutzer klickt Objekt im Bild, bestätigt (USER_CONFIRMING)
  - USER_DESCRIBING: Nutzer spricht Hinweis, useSpeech transkribiert; Prefix wird entfernt
  - AI_GUESSING: KI erzeugt Kandidaten (guessObjectsFromDescription) und rät sequentiell
    - Treffer: Punkte für KI je nach Versuch
    - Fehlversuche: weitere Guesses; keine Guesses → Nutzer erhält 10 Punkte
  - KI-Runde: AI_PICKING wählt Objekt, generateDescriptionForObject erzeugt Hinweis → USER_GUESSING
    - Nutzer klickt geratenes Objekt; Punkte abhängig von Versuchen
- Anzeige (InteractiveImageViewer): Masken anklickbar, Hervorhebung aktueller KI-Vermutung, zwei Modi: polygon/segmentation, Hover-Reveal
- Bedienpanel (ControlsPanel): Upload, Kamera, Aufnahme starten, Bestätigen, Ja/Nein, Nächste Runde, Reset, Anzeige Nachrichten/Score, Moduswahl

## 3. Status/Todos
Erledigt
- React/TS/Vite-Struktur; Tailwind-Konfig vorhanden
- useCamera Hook mit Capacitor, Permissions, hochauflösendes Foto
- useSpeech Hook nur Web Speech API, Fehlertexte DE, TTS über speak
- FrameSelector integriert (Lazy/Modal-Overlay), Canvas-Crop
- Spielzustände, Punktevergabe, Rundenwechsel, KI-/User-Logik
- Android-Projekt scaffolded, Manifest-Berechtigungen, Assets
- Build/Run Anleitungen in IMPLEMENTATION_GUIDE.md und README.md
- Segmentierungs-/Polygon-Viewer, Farb-Generator
Offen
- Robustheit geminiService: Fehlerfälle/Timeouts/Abbruch besser handhaben
- Persistenz: Scores/Settings lokal speichern
- Accessibility: Tastatur, Screenreader, Farbkonstraste
- Tests: Unit/E2E für Hooks, Services und Komponenten
- Internationalisierung i18n (DE/EN Umschaltbar)
- Offline-/Fehlermodi für fehlenden GEMINI_API_KEY

## 4. Was noch zu tun ist
- geminiService
  - Retries, Backoff, klare Typen für API-Responses, saubere Fehleroberfläche
  - Caching von Beschreibungen/Erkennungen pro Bildhash
- UX
  - Fortschrittsindikatoren (Spinner/Stages) während Erkennung und Guessing
  - Tooltips/Hinweise bei Erstnutzung; Onboarding-Stepper
  - Erweiterte Frame-Auswahl: Zoom, Rotation, Aspect Presets
- Technik
  - Env-Handling: sichere Prüfung auf GEMINI_API_KEY, Fallback Mock
  - Log/Telemetry ohne PII; zentrale ErrorBoundary
  - Service-Layer entkoppeln, Interface für ML-Provider
- Mobile/Android
  - Native Speech-API-Integration als Alternative zur Web Speech API
  - Berechtigungsflüsse und Fehlerfälle auf echter Hardware prüfen
  - Release-Build + Signing + Play Store-Vorbereitung
- Qualität
  - Lint/Typecheck/CI-Workflow definieren; Husky/Prettier
  - Tests: Jest/Vitest + React Testing Library; Detox/Playwright mobil/web
  - Performance: Memoization, Suspense, Bildverarbeitung in Worker auslagern

## 5. Fortschritt in Prozent
- Gesamt: 70%
  - Basis-App, Spiel-Flow, Kamera, Speech (Web), UI und Android-Struktur sind vorhanden
  - Offen bleiben Stabilität, Tests, native Speech, erweiterte UX, CI/CD, Release-Prozess
