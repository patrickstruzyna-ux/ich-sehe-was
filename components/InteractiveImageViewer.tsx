
import React, { useRef, useState, useEffect } from 'react';
import { GameObject } from '../types';

interface InteractiveImageViewerProps {
  imageUrl: string;
  objects: GameObject[];
  onMaskClick: (objectId: string) => void;
  highlightedObjectIds?: string[];
  selectedObjectId?: string | null;
  disabled?: boolean;
}

const InteractiveImageViewer: React.FC<InteractiveImageViewerProps> = ({
  imageUrl,
  objects,
  onMaskClick,
  highlightedObjectIds = [],
  selectedObjectId = null,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredObject, setHoveredObject] = useState<GameObject | null>(null);

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
    <div ref={containerRef} className="w-full h-full relative bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
      <img
        src={imageUrl}
        alt="Spielbereich"
        className="w-full h-full object-contain"
        onLoad={(e) => {
            const img = e.currentTarget;
            setDimensions({width: img.clientWidth, height: img.clientHeight });
        }}
      />
      {dimensions.width > 0 && (
        <svg
          className="absolute top-0 left-0 w-full h-full"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        >
          {objects.map(obj => {
            const isHighlighted = highlightedObjectIds.includes(obj.id);
            const isSelected = selectedObjectId === obj.id;
            const isHovered = hoveredObject?.id === obj.id;
            const points = obj.mask
              .map(p => `${p[0] * dimensions.width},${p[1] * dimensions.height}`)
              .join(' ');

            return (
              <g key={obj.id}>
                <polygon
                  points={points}
                  fill={obj.color}
                  stroke={isSelected ? 'yellow' : isHovered ? 'white' : 'none'}
                  strokeWidth={isSelected ? 4 : 2}
                  strokeLinejoin="round"
                  opacity={isHighlighted ? 0.9 : 1}
                  className={`transition-all duration-300 ${!disabled ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => !disabled && onMaskClick(obj.id)}
                  onMouseEnter={() => setHoveredObject(obj)}
                  onMouseLeave={() => setHoveredObject(null)}
                />
              </g>
            );
          })}
           {hoveredObject && !disabled && (
            <g className="pointer-events-none">
              <text
                  x={hoveredObject.mask[0][0] * dimensions.width}
                  y={hoveredObject.mask[0][1] * dimensions.height - 10}
                  className="fill-white font-bold text-lg"
                  style={{ paintOrder: 'stroke', stroke: '#000000', strokeWidth: '3px', strokeLinecap: 'butt', strokeLinejoin: 'miter' }}
                >
                  {hoveredObject.label}
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  );
};

export default InteractiveImageViewer;
