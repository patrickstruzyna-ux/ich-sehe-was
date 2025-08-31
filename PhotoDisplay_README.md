# Photo Display Component - Zusammenfassung

## Überblick

Diese React-Komponente implementiert eine erweiterte Foto-Darstellung mit verschiedenen Overlay-Typen und interaktiven Hover-Effekten, wie sie in der ursprünglichen App zu sehen ist.

## Hauptfeatures

### 1. **Overlay-Typen**
- **2D Bounding Boxes**: Rechteckige Rahmen um Objekte
- **Segmentation Masks**: Farbige Masken mit Canvas-Rendering
- **3D Bounding Boxes**: Dreidimensionale Drahtgitter-Darstellung
- **Points**: Punktmarkierungen mit Labels

### 2. **Hover-Effekte**
- **"Reveal on Hover" Modus**: Overlays werden beim Hovern sichtbar
- **Intelligente Box-Erkennung**: Kleinste Box unter dem Mauszeiger wird hervorgehoben
- **Smooth Transitions**: CSS-basierte Übergänge zwischen sichtbar/unsichtbar

### 3. **Zeichenmodus**
- **Freihand-Zeichnen**: Mit perfect-freehand Library
- **SVG-basierte Linien**: Skalierbare Vektorgrafiken
- **Farbauswahl**: Konfigurierbare Stiftfarben

### 4. **Responsive Design**
- **Automatische Skalierung**: Behält Bildverhältnis bei
- **Resize-Detection**: Reagiert auf Container-Größenänderungen
- **Koordinaten-Normalisierung**: Relative Positionierung (0-1)

## Technische Implementierung

### State Management
```typescript
// Hover-Zustand
const [hoverEntered, setHoverEntered] = useState(false);
const [hoveredBox, setHoveredBox] = useState<number | null>(null);

// Zeichenmodus
const [lines, setLines] = useState<[[number, number][], string][]>([]);

// Dimensionen
const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
const [activeMediaDimensions, setActiveMediaDimensions] = useState({ width: 1, height: 1 });
```

### Koordinaten-System
- **Normalisierte Koordinaten**: Alle Positionen als Werte zwischen 0 und 1
- **Responsive Skalierung**: Automatische Umrechnung auf Container-Größe
- **Aspect Ratio Preservation**: Bildverhältnis bleibt erhalten

### 3D-Rendering
```typescript
// Quaternion-basierte Rotation
const quaternion = [
  sr * cp * cz - cr * sp * sy,
  cr * sp * cz + sr * cp * sy,
  cr * cp * sy - sr * sp * cz,
  cr * cp * cz + sr * sp * sy,
];

// Kamera-Projektion
const f = width / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
const intrinsics = [[f, 0, cx], [0, f, cy], [0, 0, 1]];
```

### Canvas-basierte Masken
```typescript
// Segmentierungsmasken mit Farbpalette
const ctx = canvasRef.current.getContext('2d');
for (let i = 0; i < data.length; i += 4) {
  data[i + 3] = data[i];     // Alpha aus Maske
  data[i] = rgb[0];         // Farbe aus Palette
  data[i + 1] = rgb[1];
  data[i + 2] = rgb[2];
}
```

## CSS-Klassen und Styling

### Hover-Effekte
```css
.hide-box .bbox {
  opacity: 0;
  z-index: -1;
}
.hide-box .bbox.reveal {
  opacity: 1;
  z-index: 1;
}
```

### Box-Styling
- **Border**: `border-2 border-[#3B68FF]` (Blauer Rahmen)
- **Labels**: `bg-[#3B68FF] text-white` (Blaue Labels mit weißem Text)
- **Positioning**: `absolute` mit prozentualen Werten

## Event-Handling

### Pointer Events
```typescript
// Hover-Erkennung
onPointerEnter={(e) => {
  if (revealOnHover && !drawMode) {
    setHoverEntered(true);
    handleSetHoveredBox(e);
  }
}}

// Zeichenmodus
onPointerDown={(e) => {
  if (drawMode) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    downRef.current = true;
    // Neue Linie beginnen
  }
}}
```

### Box-Erkennung Algorithmus
```typescript
// Sortiere Boxen nach Größe (kleinste zuerst)
const sorted = dimensionsAndIndex.sort(
  (a, b) => a.width * a.height - b.width * b.height,
);

// Finde kleinste Box unter Mauszeiger
const found = sorted.find(({top, left, width, height}) => {
  return (
    clientX > left && clientX < left + width &&
    clientY > top && clientY < top + height
  );
});
```

## Verwendung

### Basis-Setup
```typescript
import PhotoDisplayComponent from './PhotoDisplayComponent';

const MyApp = () => {
  return (
    <PhotoDisplayComponent
      imageSrc="/path/to/image.jpg"
      detectType="2D bounding boxes"
      boundingBoxes2D={[
        { x: 0.1, y: 0.1, width: 0.3, height: 0.4, label: 'Objekt 1' }
      ]}
      revealOnHover={true}
      drawMode={false}
    />
  );
};
```

### Erweiterte Konfiguration
```typescript
<PhotoDisplayComponent
  imageSrc={imageSrc}
  detectType={detectType}
  boundingBoxes2D={boxes2D}
  boundingBoxMasks={masks}
  boundingBoxes3D={boxes3D}
  points={points}
  revealOnHover={true}
  drawMode={drawMode}
  fov={60}
  activeColor="rgb(26, 115, 232)"
  onLinesChange={(lines) => console.log('Neue Linien:', lines)}
/>
```

## Abhängigkeiten

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-resize-detector": "^8.0.0",
    "perfect-freehand": "^1.2.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.0.0"
  }
}
```

## Performance-Optimierungen

1. **useMemo** für schwere Berechnungen (3D-Projektionen)
2. **useCallback** für Event-Handler
3. **Canvas-Optimierung** für Masken-Rendering
4. **Pointer Capture** für smooth Drawing
5. **Debounced Resize** für Performance

## Anpassungsmöglichkeiten

### Farben
```typescript
const customColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'
];
```

### Styling
```css
/* Custom Box-Styling */
.custom-bbox {
  border: 3px solid #ff0000;
  border-radius: 4px;
}

/* Custom Label-Styling */
.custom-label {
  background: linear-gradient(45deg, #ff0000, #00ff00);
  border-radius: 8px;
  padding: 4px 8px;
}
```

### Event-Callbacks
```typescript
interface ExtendedProps extends PhotoDisplayProps {
  onBoxHover?: (boxIndex: number | null) => void;
  onBoxClick?: (boxIndex: number, box: BoundingBox2D) => void;
  onDrawingComplete?: (lines: [[number, number][], string][]) => void;
}
```

Diese Komponente bietet eine vollständige, wiederverwendbare Lösung für erweiterte Foto-Darstellung mit Overlays und interaktiven Features.