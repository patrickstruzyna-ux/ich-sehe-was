/**
 * Segmentation Mask Viewer Component
 * 
 * Diese Komponente zeigt Bilder mit Segmentation Masks an, basierend auf der
 * PhotoDisplayComponent.tsx Implementierung, aber angepasst für das ich-sehe-was Projekt.
 * 
 * Features:
 * - Canvas-basierte Masken-Darstellung
 * - Hover-Effekte mit "Reveal on Hover" Modus
 * - Responsive Skalierung
 * - Integration mit bestehenden GameObject Types
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ResizePayload, useResizeDetector } from 'react-resize-detector';
import { GameObject } from '../types';

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

// Props Interface
interface SegmentationMaskViewerProps {
  imageUrl: string;
  objects: GameObject[];
  onMaskClick: (objectId: string) => void;
  highlightedObjectIds?: string[];
  selectedObjectId?: string | null;
  disabled?: boolean;
  revealOnHover?: boolean;
  onReviseSelection?: () => void;
}

// Mask Canvas Component
const MaskCanvas: React.FC<{
  object: GameObject;
  index: number;
  containerWidth: number;
  containerHeight: number;
}> = ({ object, index, containerWidth, containerHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rgb = segmentationColorsRgb[index % segmentationColorsRgb.length];

  useEffect(() => {
    if (canvasRef.current && object.imageData) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const image = new Image();
        image.src = object.imageData;
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
  }, [object.imageData, rgb]);

  if (!object.imageData || !object.boundingBox) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ 
        opacity: 0.6,
        width: containerWidth * object.boundingBox.width,
        height: containerHeight * object.boundingBox.height
      }}
    />
  );
};

// Main Component
export const SegmentationMaskViewer: React.FC<SegmentationMaskViewerProps> = ({
  imageUrl,
  objects,
  onMaskClick,
  highlightedObjectIds = [],
  selectedObjectId = null,
  disabled = false,
  revealOnHover = true,
  onReviseSelection
}) => {
  const [hoverEntered, setHoverEntered] = useState(false);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [masksVisible, setMasksVisible] = useState(false);
  const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
  const [activeMediaDimensions, setActiveMediaDimensions] = useState({ width: 1, height: 1 });
  
  const boundingBoxContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Filter objects that have segmentation mask data
  const segmentationObjects = useMemo(() => {
    return objects.filter(obj => obj.imageData && obj.boundingBox);
  }, [objects]);

  // Handle hover for mask detection
  function handleSetHoveredObject(e: React.PointerEvent) {
    if (disabled) return;
    
    const masks = document.querySelectorAll('.segmentation-mask');
    const dimensionsAndId = Array.from(masks).map((mask) => {
      const { top, left, width, height } = mask.getBoundingClientRect();
      const objectId = mask.getAttribute('data-object-id');
      return { top, left, width, height, objectId };
    });
    
    const sorted = dimensionsAndId.sort(
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
    
    if (found && found.objectId) {
      setHoveredObjectId(found.objectId);
    } else {
      setHoveredObjectId(null);
    }
  }

  // Handle mask click
  const handleMaskClick = (objectId: string) => {
    if (!disabled) {
      onMaskClick(objectId);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Image Display */}
      <img
        src={imageUrl}
        className="absolute top-0 left-0 w-full h-full object-contain"
        alt="Display image"
        onLoad={(e) => {
          setActiveMediaDimensions({
            width: e.currentTarget.naturalWidth,
            height: e.currentTarget.naturalHeight,
          });
        }}
      />
      
      {/* Overlay Container */}
      <div
        className={`absolute w-full h-full left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
          !masksVisible ? 'hide-mask' : ''
        } ${
          hoverEntered ? 'hover-active' : ''
        }`}
        ref={boundingBoxContainerRef}
        onPointerEnter={(e) => {
          if (revealOnHover && !disabled) {
            setHoverEntered(true);
            setMasksVisible(true);
            handleSetHoveredObject(e);
          }
        }}
        onPointerMove={(e) => {
          if (revealOnHover && !disabled) {
            setHoverEntered(true);
            setMasksVisible(true);
            handleSetHoveredObject(e);
          }
        }}
        onPointerLeave={(e) => {
          if (revealOnHover && !disabled) {
            setHoverEntered(false);
            setMasksVisible(false);
            handleSetHoveredObject(e);
          }
        }}
        onTouchStart={(e) => {
          // Touch support for mobile devices
          if (!disabled) {
            setMasksVisible(true);
            const touch = e.touches[0];
            const syntheticEvent = {
              clientX: touch.clientX,
              clientY: touch.clientY
            } as React.PointerEvent;
            handleSetHoveredObject(syntheticEvent);
          }
        }}
        onTouchEnd={() => {
          if (!disabled) {
            setMasksVisible(false);
            setHoveredObjectId(null);
          }
        }}
        style={{
          width: boundingBoxContainer.width,
          height: boundingBoxContainer.height,
        }}
      >
        {/* Segmentation Masks */}
        {segmentationObjects.map((obj, i) => {
          const isHighlighted = highlightedObjectIds.includes(obj.id);
          const isSelected = selectedObjectId === obj.id;
          const isHovered = hoveredObjectId === obj.id;
          
          return (
            <div
              key={obj.id}
              className={`absolute segmentation-mask border-2 cursor-pointer transition-all duration-200 ${
                isSelected ? 'border-blue-500 border-4' : 
                isHighlighted ? 'border-yellow-400' : 
                'border-blue-400'
              } ${
                isHovered ? 'reveal' : ''
              }`}
              data-object-id={obj.id}
              onClick={() => handleMaskClick(obj.id)}
              style={{
                transformOrigin: '0 0',
                top: (obj.boundingBox!.y * 100) + '%',
                left: (obj.boundingBox!.x * 100) + '%',
                width: (obj.boundingBox!.width * 100) + '%',
                height: (obj.boundingBox!.height * 100) + '%',
              }}
            >
              <MaskCanvas 
                object={obj} 
                index={i} 
                containerWidth={boundingBoxContainer.width}
                containerHeight={boundingBoxContainer.height}
              />
              <div className="w-full top-0 h-0 absolute">
                <div className="bg-blue-500 text-white absolute -left-[2px] bottom-0 text-sm px-1 rounded-sm">
                  {obj.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revise Selection Button */}
      {selectedObjectId && onReviseSelection && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onReviseSelection}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-lg flex items-center gap-2"
          >
            <span>↺</span>
            Auswahl revidieren
          </button>
        </div>
      )}

      {/* CSS Styles */}
      <style jsx>{`
        .hide-mask .segmentation-mask {
          opacity: 0;
          z-index: -1;
          transition: opacity 0.2s ease-in-out;
        }
        .hover-active .segmentation-mask {
          opacity: 0.3;
          z-index: 1;
          transition: opacity 0.2s ease-in-out;
        }
        .hover-active .segmentation-mask.reveal {
          opacity: 1;
          z-index: 2;
          transition: opacity 0.2s ease-in-out;
        }
        .segmentation-mask {
          transition: opacity 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default SegmentationMaskViewer;