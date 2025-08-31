/**
 * Photo Display Component mit Overlays und Hover-Effekten
 * 
 * Diese Komponente zeigt Bilder mit verschiedenen Overlay-Typen an:
 * - 2D Bounding Boxes
 * - Segmentation Masks
 * - 3D Bounding Boxes
 * - Points
 * 
 * Features:
 * - Hover-Effekte mit "Reveal on Hover" Modus
 * - Responsive Skalierung
 * - Zeichenmodus für Freihand-Linien
 * - Canvas-basierte Masken-Darstellung
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResizePayload, useResizeDetector } from 'react-resize-detector';
import getStroke from 'perfect-freehand';

// Types
export type DetectTypes = '2D bounding boxes' | 'Segmentation masks' | '3D bounding boxes' | 'Points';

export type BoundingBox2D = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

export type BoundingBoxMask = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  imageData: string; // Base64 encoded mask image
};

export type BoundingBox3D = {
  center: [number, number, number];
  size: [number, number, number];
  rpy: [number, number, number]; // Roll, Pitch, Yaw
  label: string;
};

export type Point = {
  point: { x: number; y: number };
  label: string;
};

// Constants
const segmentationColors = [
  '#E6194B', '#3C89D0', '#3CB44B', '#FFE119', '#911EB4',
  '#42D4F4', '#F58231', '#F032E6', '#BFEF45', '#469990'
];

const segmentationColorsRgb = segmentationColors.map(hex => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return [r, g, b];
});

const lineOptions = {
  size: 8,
  thinning: 0,
  smoothing: 0,
  streamline: 0,
  simulatePressure: false,
};

// Utility Functions
function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q'],
  );
  d.push('Z');
  return d.join(' ');
}

function matrixMultiply(m: number[][], v: number[]): number[] {
  return m.map((row: number[]) =>
    row.reduce((sum, val, i) => sum + val * v[i], 0),
  );
}

// Props Interface
interface PhotoDisplayProps {
  imageSrc?: string;
  detectType: DetectTypes;
  boundingBoxes2D?: BoundingBox2D[];
  boundingBoxMasks?: BoundingBoxMask[];
  boundingBoxes3D?: BoundingBox3D[];
  points?: Point[];
  revealOnHover?: boolean;
  drawMode?: boolean;
  fov?: number; // Field of view for 3D boxes
  activeColor?: string;
  onLinesChange?: (lines: [[number, number][], string][]) => void;
}

// Box Mask Component
const BoxMask: React.FC<{
  box: BoundingBoxMask;
  index: number;
}> = ({ box, index }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rgb = segmentationColorsRgb[index % segmentationColorsRgb.length];

  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const image = new Image();
        image.src = box.imageData;
        image.onload = () => {
          canvasRef.current!.width = image.width;
          canvasRef.current!.height = image.height;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(image, 0, 0);
          const pixels = ctx.getImageData(0, 0, image.width, image.height);
          const data = pixels.data;
          for (let i = 0; i < data.length; i += 4) {
            data[i + 3] = data[i]; // Alpha from mask
            data[i] = rgb[0];     // Color from palette
            data[i + 1] = rgb[1];
            data[i + 2] = rgb[2];
          }
          ctx.putImageData(pixels, 0, 0);
        };
      }
    }
  }, [box.imageData, rgb]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
      style={{ opacity: 0.5 }}
    />
  );
};

// Main Component
export const PhotoDisplayComponent: React.FC<PhotoDisplayProps> = ({
  imageSrc,
  detectType,
  boundingBoxes2D = [],
  boundingBoxMasks = [],
  boundingBoxes3D = [],
  points = [],
  revealOnHover = true,
  drawMode = false,
  fov = 60,
  activeColor = 'rgb(26, 115, 232)',
  onLinesChange
}) => {
  const [hoverEntered, setHoverEntered] = useState(false);
  const [hoveredBox, setHoveredBox] = useState<number | null>(null);
  const [lines, setLines] = useState<[[number, number][], string][]>([]);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  const [activeMediaDimensions, setActiveMediaDimensions] = useState({ width: 1, height: 1 });
  
  const boundingBoxContainerRef = useRef<HTMLDivElement | null>(null);
  const downRef = useRef<boolean>(false);

  // Handle resize
  const onResize = useCallback((el: ResizePayload) => {
    if (el.width && el.height) {
      setContainerDims({ width: el.width, height: el.height });
    }
  }, []);

  const { ref: containerRef } = useResizeDetector({ onResize });

  // Calculate bounding box container dimensions
  const boundingBoxContainer = useMemo(() => {
    const { width, height } = activeMediaDimensions;
    const aspectRatio = width / height;
    const containerAspectRatio = containerDims.width / containerDims.height;
    if (aspectRatio < containerAspectRatio) {
      return {
        height: containerDims.height,
        width: containerDims.height * aspectRatio,
      };
    } else {
      return {
        width: containerDims.width,
        height: containerDims.width / aspectRatio,
      };
    }
  }, [containerDims, activeMediaDimensions]);

  // 3D bounding box calculations
  const linesAndLabels3D = useMemo(() => {
    if (!boundingBoxContainer || detectType !== '3D bounding boxes') {
      return null;
    }
    
    let allLines: any[] = [];
    let allLabels: any[] = [];
    
    for (const box of boundingBoxes3D) {
      const { center, size, rpy } = box;

      // Convert Euler angles to quaternion
      const [sr, sp, sy] = rpy.map((x) => Math.sin(x / 2));
      const [cr, cp, cz] = rpy.map((x) => Math.cos(x / 2));
      const quaternion = [
        sr * cp * cz - cr * sp * sy,
        cr * sp * cz + sr * cp * sy,
        cr * cp * sy - sr * sp * cz,
        cr * cp * cz + sr * sp * sy,
      ];

      // Calculate camera parameters
      const height = boundingBoxContainer.height;
      const width = boundingBoxContainer.width;
      const f = width / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
      const cx = width / 2;
      const cy = height / 2;
      const intrinsics = [
        [f, 0, cx],
        [0, f, cy],
        [0, 0, 1],
      ];

      // Get box vertices
      const halfSize = size.map((s) => s / 2);
      let corners = [];
      for (let x of [-halfSize[0], halfSize[0]]) {
        for (let y of [-halfSize[1], halfSize[1]]) {
          for (let z of [-halfSize[2], halfSize[2]]) {
            corners.push([x, y, z]);
          }
        }
      }
      corners = [
        corners[1], corners[3], corners[7], corners[5],
        corners[0], corners[2], corners[6], corners[4],
      ];

      // Apply rotation from quaternion
      const q = quaternion;
      const rotationMatrix = [
        [
          1 - 2 * q[1] ** 2 - 2 * q[2] ** 2,
          2 * q[0] * q[1] - 2 * q[3] * q[2],
          2 * q[0] * q[2] + 2 * q[3] * q[1],
        ],
        [
          2 * q[0] * q[1] + 2 * q[3] * q[2],
          1 - 2 * q[0] ** 2 - 2 * q[2] ** 2,
          2 * q[1] * q[2] - 2 * q[3] * q[0],
        ],
        [
          2 * q[0] * q[2] - 2 * q[3] * q[1],
          2 * q[1] * q[2] + 2 * q[3] * q[0],
          1 - 2 * q[0] ** 2 - 2 * q[1] ** 2,
        ],
      ];

      const boxVertices = corners.map((corner) => {
        const rotated = matrixMultiply(rotationMatrix, corner);
        return rotated.map((val, idx) => val + center[idx]);
      });

      // Project 3D points to 2D
      const tiltAngle = 90.0;
      const viewRotationMatrix = [
        [1, 0, 0],
        [
          0,
          Math.cos((tiltAngle * Math.PI) / 180),
          -Math.sin((tiltAngle * Math.PI) / 180),
        ],
        [
          0,
          Math.sin((tiltAngle * Math.PI) / 180),
          Math.cos((tiltAngle * Math.PI) / 180),
        ],
      ];

      const rotatedPoints = boxVertices.map((p) =>
        matrixMultiply(viewRotationMatrix, p),
      );
      const translatedPoints = rotatedPoints.map((p) => p.map((v) => v + 0));
      const projectedPoints = translatedPoints.map((p) =>
        matrixMultiply(intrinsics, p),
      );
      const vertices = projectedPoints.map((p) => [p[0] / p[2], p[1] / p[2]]);

      const topVertices = vertices.slice(0, 4);
      const bottomVertices = vertices.slice(4, 8);

      for (let i = 0; i < 4; i++) {
        const lines = [
          [topVertices[i], topVertices[(i + 1) % 4]],
          [bottomVertices[i], bottomVertices[(i + 1) % 4]],
          [topVertices[i], bottomVertices[i]],
        ];

        for (let [start, end] of lines) {
          const dx = end[0] - start[0];
          const dy = end[1] - start[1];
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          allLines.push({ start, end, length, angle });
        }
      }

      // Add label
      const textPosition3d = boxVertices[0].map(
        (_, idx) => boxVertices.reduce((sum, p) => sum + p[idx], 0) / boxVertices.length,
      );
      textPosition3d[2] += 0.1;

      const textPoint = matrixMultiply(
        intrinsics,
        matrixMultiply(viewRotationMatrix, textPosition3d.map((v) => v + 0)),
      );
      const textPos = [textPoint[0] / textPoint[2], textPoint[1] / textPoint[2]];
      allLabels.push({ label: box.label, pos: textPos });
    }
    return [allLines, allLabels] as const;
  }, [boundingBoxes3D, boundingBoxContainer, fov, detectType]);

  // Handle hover for box detection
  function handleSetHoveredBox(e: React.PointerEvent) {
    const boxes = document.querySelectorAll('.bbox');
    const dimensionsAndIndex = Array.from(boxes).map((box, i) => {
      const { top, left, width, height } = box.getBoundingClientRect();
      return { top, left, width, height, index: i };
    });
    
    const sorted = dimensionsAndIndex.sort(
      (a, b) => a.width * a.height - b.width * b.height,
    );
    
    const { clientX, clientY } = e;
    const found = sorted.find(({ top, left, width, height }) => {
      return (
        clientX > left &&
        clientX < left + width &&
        clientY > top &&
        clientY < top + height
      );
    });
    
    if (found) {
      setHoveredBox(found.index);
    } else {
      setHoveredBox(null);
    }
  }

  // Handle lines change
  useEffect(() => {
    if (onLinesChange) {
      onLinesChange(lines);
    }
  }, [lines, onLinesChange]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Image Display */}
      {imageSrc && (
        <img
          src={imageSrc}
          className="absolute top-0 left-0 w-full h-full object-contain"
          alt="Display image"
          onLoad={(e) => {
            setActiveMediaDimensions({
              width: e.currentTarget.naturalWidth,
              height: e.currentTarget.naturalHeight,
            });
          }}
        />
      )}
      
      {/* Overlay Container */}
      <div
        className={`absolute w-full h-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
          hoverEntered ? 'hide-box' : ''
        } ${drawMode ? 'cursor-crosshair' : ''}`}
        ref={boundingBoxContainerRef}
        onPointerEnter={(e) => {
          if (revealOnHover && !drawMode) {
            setHoverEntered(true);
            handleSetHoveredBox(e);
          }
        }}
        onPointerMove={(e) => {
          if (revealOnHover && !drawMode) {
            setHoverEntered(true);
            handleSetHoveredBox(e);
          }
          if (downRef.current && boundingBoxContainerRef.current) {
            const parentBounds = boundingBoxContainerRef.current.getBoundingClientRect();
            setLines((prev) => [
              ...prev.slice(0, prev.length - 1),
              [
                [
                  ...prev[prev.length - 1][0],
                  [
                    (e.clientX - parentBounds.left) / boundingBoxContainer!.width,
                    (e.clientY - parentBounds.top) / boundingBoxContainer!.height,
                  ],
                ],
                prev[prev.length - 1][1],
              ],
            ]);
          }
        }}
        onPointerLeave={(e) => {
          if (revealOnHover && !drawMode) {
            setHoverEntered(false);
            handleSetHoveredBox(e);
          }
        }}
        onPointerDown={(e) => {
          if (drawMode && boundingBoxContainerRef.current) {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            downRef.current = true;
            const parentBounds = boundingBoxContainerRef.current.getBoundingClientRect();
            setLines((prev) => [
              ...prev,
              [
                [
                  [
                    (e.clientX - parentBounds.left) / boundingBoxContainer!.width,
                    (e.clientY - parentBounds.top) / boundingBoxContainer!.height,
                  ],
                ],
                activeColor,
              ],
            ]);
          }
        }}
        onPointerUp={(e) => {
          if (drawMode) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            downRef.current = false;
          }
        }}
        style={{
          width: boundingBoxContainer.width,
          height: boundingBoxContainer.height,
        }}
      >
        {/* Drawing Lines SVG */}
        {lines.length > 0 && (
          <svg
            className="absolute top-0 left-0 w-full h-full"
            style={{
              pointerEvents: 'none',
              width: boundingBoxContainer?.width,
              height: boundingBoxContainer?.height,
            }}
          >
            {lines.map(([points, color], i) => (
              <path
                key={i}
                d={getSvgPathFromStroke(
                  getStroke(
                    points.map(([x, y]) => [
                      x * boundingBoxContainer!.width,
                      y * boundingBoxContainer!.height,
                      0.5,
                    ]),
                    lineOptions,
                  ),
                )}
                fill={color}
              />
            ))}
          </svg>
        )}

        {/* 2D Bounding Boxes */}
        {detectType === '2D bounding boxes' &&
          boundingBoxes2D.map((box, i) => (
            <div
              key={i}
              className={`absolute bbox border-2 border-[#3B68FF] ${
                i === hoveredBox ? 'reveal' : ''
              }`}
              style={{
                transformOrigin: '0 0',
                top: box.y * 100 + '%',
                left: box.x * 100 + '%',
                width: box.width * 100 + '%',
                height: box.height * 100 + '%',
              }}
            >
              <div className="bg-[#3B68FF] text-white absolute left-0 top-0 text-sm px-1">
                {box.label}
              </div>
            </div>
          ))}

        {/* Segmentation Masks */}
        {detectType === 'Segmentation masks' &&
          boundingBoxMasks.map((box, i) => (
            <div
              key={i}
              className={`absolute bbox border-2 border-[#3B68FF] ${
                i === hoveredBox ? 'reveal' : ''
              }`}
              style={{
                transformOrigin: '0 0',
                top: box.y * 100 + '%',
                left: box.x * 100 + '%',
                width: box.width * 100 + '%',
                height: box.height * 100 + '%',
              }}
            >
              <BoxMask box={box} index={i} />
              <div className="w-full top-0 h-0 absolute">
                <div className="bg-[#3B68FF] text-white absolute -left-[2px] bottom-0 text-sm px-1">
                  {box.label}
                </div>
              </div>
            </div>
          ))}

        {/* Points */}
        {detectType === 'Points' &&
          points.map((point, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${point.point.x * 100}%`,
                top: `${point.point.y * 100}%`,
              }}
            >
              <div className="absolute bg-[#3B68FF] text-center text-white text-xs px-1 bottom-4 rounded-sm -translate-x-1/2 left-1/2">
                {point.label}
              </div>
              <div className="absolute w-4 h-4 bg-[#3B68FF] rounded-full border-white border-[2px] -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          ))}

        {/* 3D Bounding Boxes */}
        {detectType === '3D bounding boxes' && linesAndLabels3D && (
          <>
            {linesAndLabels3D[0].map((line: any, i: number) => (
              <div
                key={i}
                className="absolute h-[2px] bg-[#3B68FF]"
                style={{
                  width: `${line.length}px`,
                  transform: `translate(${line.start[0]}px, ${line.start[1]}px) rotate(${line.angle}rad)`,
                  transformOrigin: '0 0',
                }}
              />
            ))}
            {linesAndLabels3D[1].map((label: any, i: number) => (
              <div
                key={i}
                className="absolute bg-[#3B68FF] text-white text-xs px-1"
                style={{
                  top: `${label.pos[1]}px`,
                  left: `${label.pos[0]}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {label.label}
              </div>
            ))}
          </>
        )}
      </div>

      {/* CSS Styles */}
      <style jsx>{`
        .hide-box .bbox {
          opacity: 0;
          z-index: -1;
        }
        .hide-box .bbox.reveal {
          opacity: 1;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default PhotoDisplayComponent;

/*
Verwendungsbeispiel:

import PhotoDisplayComponent from './PhotoDisplayComponent';

const App = () => {
  const [detectType, setDetectType] = useState<DetectTypes>('2D bounding boxes');
  const [boundingBoxes2D, setBoundingBoxes2D] = useState<BoundingBox2D[]>([
    { x: 0.1, y: 0.1, width: 0.3, height: 0.4, label: 'Object 1' },
    { x: 0.5, y: 0.2, width: 0.2, height: 0.3, label: 'Object 2' }
  ]);

  return (
    <div className="w-full h-screen">
      <PhotoDisplayComponent
        imageSrc="/path/to/image.jpg"
        detectType={detectType}
        boundingBoxes2D={boundingBoxes2D}
        revealOnHover={true}
        drawMode={false}
      />
    </div>
  );
};

Abhängigkeiten:
- npm install react-resize-detector
- npm install perfect-freehand
- Tailwind CSS für Styling
*/