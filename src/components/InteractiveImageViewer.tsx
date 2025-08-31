
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { GameObject } from '../types';
import SegmentationMaskViewer from './SegmentationMaskViewer';

interface InteractiveImageViewerProps {
  imageUrl: string;
  objects: GameObject[];
  onMaskClick: (objectId: string) => void;
  highlightedObjectIds?: string[];
  selectedObjectId?: string | null;
  disabled?: boolean;
  displayMode?: 'polygon' | 'segmentation';
  revealOnHover?: boolean;
  onReviseSelection?: () => void;
}

// Helper to calculate the bounding box area of a polygon mask
const getPolygonArea = (mask: number[][]): number => {
  if (mask.length < 3) return 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of mask) {
    minX = Math.min(minX, point[0]);
    maxX = Math.max(maxX, point[0]);
    minY = Math.min(minY, point[1]);
    maxY = Math.max(maxY, point[1]);
  }
  return (maxX - minX) * (maxY - minY);
};

// Helper to check if a point is inside a polygon using ray casting algorithm
const isPointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

// Helper to find all objects at a given click position
const getObjectsAtPosition = (objects: GameObject[], clickPos: [number, number]): GameObject[] => {
  return objects.filter(obj => isPointInPolygon(clickPos, obj.mask));
};

const InteractiveImageViewer: React.FC<InteractiveImageViewerProps> = ({
  imageUrl,
  objects,
  onMaskClick,
  highlightedObjectIds = [],
  selectedObjectId = null,
  disabled = false,
  displayMode = 'polygon',
  revealOnHover = true,
  onReviseSelection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredObject, setHoveredObject] = useState<GameObject | null>(null);
  const [clickedObject, setClickedObject] = useState<GameObject | null>(null);
  const [objectsAtLastClick, setObjectsAtLastClick] = useState<GameObject[]>([]);
  const [currentObjectIndex, setCurrentObjectIndex] = useState<number>(0);

  // If displayMode is segmentation and objects have segmentation data, use SegmentationMaskViewer
  const hasSegmentationData = objects.some(obj => obj.imageData && obj.boundingBox);
  
  if (displayMode === 'segmentation' && hasSegmentationData) {
    return (
      <SegmentationMaskViewer
        imageUrl={imageUrl}
        objects={objects}
        onMaskClick={onMaskClick}
        highlightedObjectIds={highlightedObjectIds}
        selectedObjectId={selectedObjectId}
        disabled={disabled}
        revealOnHover={revealOnHover}
        onReviseSelection={onReviseSelection}
      />
    );
  }

  // Reset clicked object when selectedObjectId changes
  useEffect(() => {
    if (selectedObjectId) {
      const selectedObj = objects.find(obj => obj.id === selectedObjectId);
      setClickedObject(selectedObj || null);
    } else {
      setClickedObject(null);
    }
    setObjectsAtLastClick([]);
    setCurrentObjectIndex(0);
  }, [selectedObjectId, objects]);

  // Sort objects by area descending, so larger objects are rendered first (and appear behind smaller ones)
  const sortedObjects = useMemo(() => {
    return [...objects].sort((a, b) => getPolygonArea(b.mask) - getPolygonArea(a.mask));
  }, [objects]);

  // Handle polygon click
  const handlePolygonClick = (event: React.MouseEvent<SVGPolygonElement>, obj: GameObject) => {
    if (disabled) return;
    
    event.stopPropagation();
    
    const clickX = event.nativeEvent.offsetX / dimensions.width;
    const clickY = event.nativeEvent.offsetY / dimensions.height;
    
    const objectsAtClick = getObjectsAtPosition(objects, [clickX, clickY]);
    
    if (objectsAtClick.length === 0) {
      setClickedObject(null);
      setObjectsAtLastClick([]);
      setCurrentObjectIndex(0);
      return;
    }
    
    // Sort by area (smallest first for better UX)
    objectsAtClick.sort((a, b) => getPolygonArea(a.mask) - getPolygonArea(b.mask));
    
    // Check if this is the same position as last click
    const isSamePosition = objectsAtLastClick.length > 0 && 
      objectsAtClick.length === objectsAtLastClick.length &&
      objectsAtClick.every(obj => objectsAtLastClick.some(lastObj => lastObj.id === obj.id));
    
    if (isSamePosition && objectsAtClick.length > 1) {
      // Cycle through objects at this position
      const nextIndex = (currentObjectIndex + 1) % objectsAtClick.length;
      setCurrentObjectIndex(nextIndex);
      setClickedObject(objectsAtClick[nextIndex]);
      onMaskClick(objectsAtClick[nextIndex].id);
    } else {
      // New position or single object
      setObjectsAtLastClick(objectsAtClick);
      setCurrentObjectIndex(0);
      setClickedObject(objectsAtClick[0]);
      onMaskClick(objectsAtClick[0].id);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [imageUrl]);


  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden">
      <div
        ref={containerRef}
        className="relative w-full h-full"
        onLoad={() => {
          if (containerRef.current) {
            const { offsetWidth, offsetHeight } = containerRef.current;
            setDimensions({ width: offsetWidth, height: offsetHeight });
          }
        }}
      >
        <img
          src={imageUrl}
          alt="Interactive view"
          className="w-full h-full object-contain"
          onLoad={(e) => {
            const { offsetWidth, offsetHeight } = e.currentTarget;
            setDimensions({ width: offsetWidth, height: offsetHeight });
          }}
        />

        {/* SVG overlay for polygons */}
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="none"
        >
          {sortedObjects.map((obj) => {
            const isHighlighted = highlightedObjectIds.includes(obj.id);
            const isSelected = selectedObjectId === obj.id;
            const isHovered = hoveredObject?.id === obj.id;
            const isClicked = clickedObject?.id === obj.id;

            // Convert normalized coordinates to pixel coordinates
            const points = obj.mask
              .map(([x, y]) => `${x * dimensions.width},${y * dimensions.height}`)
              .join(' ');

            return (
              <polygon
                key={obj.id}
                points={points}
                fill={obj.color}
                fillOpacity={isSelected ? 0.6 : isHighlighted ? 0.5 : isHovered || isClicked ? 0.4 : 0.3}
                stroke={isSelected ? '#3B82F6' : isHighlighted ? '#F59E0B' : obj.color}
                strokeWidth={isSelected ? 3 : isHighlighted ? 2 : 1}
                className="pointer-events-auto cursor-pointer transition-all duration-200"
                onClick={(e) => handlePolygonClick(e, obj)}
                onMouseEnter={() => !disabled && setHoveredObject(obj)}
                onMouseLeave={() => !disabled && setHoveredObject(null)}
              />
            );
          })}
        </svg>

        {/* Labels */}
        {sortedObjects.map((obj) => {
          const isVisible = hoveredObject?.id === obj.id || clickedObject?.id === obj.id || highlightedObjectIds.includes(obj.id) || selectedObjectId === obj.id;
          
          if (!isVisible) return null;

          // Calculate label position (center of bounding box)
          const minX = Math.min(...obj.mask.map(([x]) => x));
          const maxX = Math.max(...obj.mask.map(([x]) => x));
          const minY = Math.min(...obj.mask.map(([, y]) => y));
          const maxY = Math.max(...obj.mask.map(([, y]) => y));
          
          const centerX = (minX + maxX) / 2 * dimensions.width;
          const centerY = (minY + maxY) / 2 * dimensions.height;

          return (
            <div
              key={`label-${obj.id}`}
              className="absolute bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-medium pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: centerX,
                top: centerY,
              }}
            >
              {obj.label}
            </div>
          );
        })}

        {/* Cycle through objects indicator */}
        {objectsAtLastClick.length > 1 && (
          <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-sm">
            {currentObjectIndex + 1} / {objectsAtLastClick.length}
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveImageViewer;
