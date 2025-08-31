# Implementierungsanleitung: Kamera & Spracherkennung

## Übersicht der implementierten Funktionen

### 1. Kamera-Funktionalität
- **Native Kamera-Integration** mit Capacitor Camera Plugin
- **Optimierte Bildaufnahme** mit konfigurierbarer Qualität und Auflösung
- **Automatische Berechtigungsanfrage** für Kamera und Speicher
- **Web-Fallback** für Browser-Umgebungen

### 2. Frame-Auswahl-Optimierung
- **Interaktive Bildausschnitt-Auswahl** vor der Objekterkennung
- **Drag-and-Drop-Interface** zum Verschieben des Auswahlrahmens
- **Voreinstellungen** für häufige Bildausschnitte (Mitte, Oben, Unten, Links, Rechts)
- **Echtzeit-Vorschau** mit visueller Überlagerung

### 3. Spracherkennung
- **Web Speech API** für Browser-basierte Spracherkennung
- **Deutsche Spracherkennung** (de-DE)
- **Echtzeit-Transkription** mit Zwischenergebnissen
- **Fehlerbehandlung** und Benutzer-Feedback

## Technische Details

### Neue Dateien

#### `src/hooks/useCamera.ts`
- Hook für Kamera-Funktionalität
- Funktionen: `takePicture`, `selectFromGallery`, `requestPermissions`
- Plattform-spezifische Implementierung (Native vs. Web)

#### `src/components/FrameSelector.tsx`
- Interaktive Komponente für Bildausschnitt-Auswahl
- Canvas-basierte Implementierung
- Drag-and-Drop-Funktionalität
- Voreinstellungen für schnelle Auswahl

### Geänderte Dateien

#### `src/App.tsx`
- Integration der neuen Kamera- und Frame-Auswahl-Funktionen
- Optimierter Bildverarbeitungs-Workflow
- Zustandsverwaltung für Frame-Selektor

#### `src/hooks/useSpeech.ts`
- Vereinfachte Implementierung nur mit Web Speech API
- Entfernung der nativen Plugin-Abhängigkeit
- Verbesserte Fehlerbehandlung

#### `capacitor.config.ts`
- Konfiguration für Kamera-Plugin
- Entfernung der Speech Recognition Plugin-Konfiguration

#### `android/app/src/main/AndroidManifest.xml`
- Hinzugefügte Berechtigungen:
  - `CAMERA`
  - `READ_EXTERNAL_STORAGE`
  - `WRITE_EXTERNAL_STORAGE`
  - `READ_MEDIA_IMAGES`
- Kamera-Features als optional markiert

## Benutzerführung

### Kamera verwenden
1. Klick auf "Kamera verwenden"
2. Berechtigungen erteilen (falls erforderlich)
3. Foto aufnehmen
4. Bildausschnitt optimieren im Frame-Selektor
5. Bestätigen für Objekterkennung

### Bild hochladen
1. Klick auf "Bild hochladen"
2. Datei auswählen
3. Bildausschnitt optimieren im Frame-Selektor
4. Bestätigen für Objekterkennung

### Frame-Selektor bedienen
- **Rahmen verschieben**: Klicken und ziehen
- **Voreinstellungen**: Buttons für schnelle Positionierung
- **Bestätigen**: Grüner Button zum Fortfahren
- **Abbrechen**: Grauer Button zum Zurückkehren

## Build-Anweisungen

### Entwicklung
```bash
# Web-Entwicklung
npm run dev

# Android-Entwicklung
npx cap sync android
npx cap open android
```

### Produktion
```bash
# Web-Build
npm run build

# Android-Build (Debug)
cd android
.\gradlew assembleDebug

# Android-Build (Release) - erfordert Signing-Konfiguration
.\gradlew assembleRelease
```

## Optimierungen

### Bildverarbeitung
- **Höhere Auflösung** für Frame-Auswahl (1920x1440)
- **Optimierte Kompression** nach Ausschnitt-Auswahl
- **Bessere Qualität** für Objekterkennung durch gezielte Ausschnitte

### Performance
- **Lazy Loading** der Frame-Selektor-Komponente
- **Effiziente Canvas-Operationen**
- **Minimierte Re-Renders** durch optimierte State-Verwaltung

### Benutzerfreundlichkeit
- **Intuitive Bedienung** mit visuellen Hinweisen
- **Responsive Design** für verschiedene Bildschirmgrößen
- **Klare Fehlermeldungen** und Benutzer-Feedback

## Bekannte Einschränkungen

1. **Spracherkennung**: Nur Web Speech API (keine native Android-Implementierung)
2. **Browser-Kompatibilität**: Spracherkennung erfordert moderne Browser
3. **Berechtigungen**: Kamera-Zugriff muss vom Benutzer genehmigt werden

## Zukünftige Verbesserungen

1. **Native Spracherkennung** für bessere Android-Integration
2. **Erweiterte Frame-Auswahl** mit Zoom und Rotation
3. **Batch-Verarbeitung** für mehrere Bilder
4. **Cloud-Speicher-Integration** für Bildarchivierung