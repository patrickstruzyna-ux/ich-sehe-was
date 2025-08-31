import React, { useState, useRef, useCallback, useEffect } from 'react';

interface FrameSelectorProps {
  imageData: string;
  onFrameSelected: (croppedImageData: string) => void;
  onCancel: () => void;
  isVisible: boolean;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FrameSelector: React.FC<FrameSelectorProps> = ({
  imageData,
  onFrameSelected,
  onCancel,
  isVisible
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  // Load and display image
  useEffect(() => {
    if (!isVisible || !imageData) return;

    const img = new Image();
    img.onload = () => {
      // Store the image in the ref
      imageRef.current = img;
      if (imageRef.current) {
        // Calculate canvas dimensions to fit screen while maintaining aspect ratio
        const maxWidth = Math.min(window.innerWidth - 40, 800);
        const maxHeight = Math.min(window.innerHeight - 200, 600);
        
        const aspectRatio = img.width / img.height;
        let canvasWidth = maxWidth;
        let canvasHeight = maxWidth / aspectRatio;
        
        if (canvasHeight > maxHeight) {
          canvasHeight = maxHeight;
          canvasWidth = maxHeight * aspectRatio;
        }
        
        setCanvasDimensions({ width: canvasWidth, height: canvasHeight });
        
        // Set initial crop area to center 80% of image
        const margin = 0.1;
        setCropArea({
          x: canvasWidth * margin,
          y: canvasHeight * margin,
          width: canvasWidth * (1 - 2 * margin),
          height: canvasHeight * (1 - 2 * margin)
        });
        
        setImageLoaded(true);
      }
    };
    img.src = imageData;
  }, [imageData, isVisible]);

  // Draw image and crop overlay
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    
    // Draw overlay (darken areas outside crop)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    
    // Top
    ctx.fillRect(0, 0, canvas.width, cropArea.y);
    // Bottom
    ctx.fillRect(0, cropArea.y + cropArea.height, canvas.width, canvas.height - cropArea.y - cropArea.height);
    // Left
    ctx.fillRect(0, cropArea.y, cropArea.x, cropArea.height);
    // Right
    ctx.fillRect(cropArea.x + cropArea.width, cropArea.y, canvas.width - cropArea.x - cropArea.width, cropArea.height);
    
    // Draw crop border
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // Draw corner handles
    const handleSize = 12;
    ctx.fillStyle = '#00bcd4';
    
    // Top-left
    ctx.fillRect(cropArea.x - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
    // Top-right
    ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y - handleSize/2, handleSize, handleSize);
    // Bottom-left
    ctx.fillRect(cropArea.x - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
    // Bottom-right
    ctx.fillRect(cropArea.x + cropArea.width - handleSize/2, cropArea.y + cropArea.height - handleSize/2, handleSize, handleSize);
    
  }, [imageLoaded, cropArea, canvasDimensions]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDragging(true);
    setDragStart(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    
    const pos = getMousePos(e);
    const deltaX = pos.x - dragStart.x;
    const deltaY = pos.y - dragStart.y;
    
    setCropArea(prev => {
      const newX = Math.max(0, Math.min(prev.x + deltaX, canvasDimensions.width - prev.width));
      const newY = Math.max(0, Math.min(prev.y + deltaY, canvasDimensions.height - prev.height));
      
      return {
        ...prev,
        x: newX,
        y: newY
      };
    });
    
    setDragStart(pos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleConfirm = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Calculate scale factors
    const scaleX = imageRef.current.width / canvasDimensions.width;
    const scaleY = imageRef.current.height / canvasDimensions.height;
    
    // Set canvas size to crop area
    canvas.width = cropArea.width * scaleX;
    canvas.height = cropArea.height * scaleY;
    
    // Draw cropped image
    ctx.drawImage(
      imageRef.current,
      cropArea.x * scaleX, // source x
      cropArea.y * scaleY, // source y
      cropArea.width * scaleX, // source width
      cropArea.height * scaleY, // source height
      0, // dest x
      0, // dest y
      canvas.width, // dest width
      canvas.height // dest height
    );
    
    const croppedImageData = canvas.toDataURL('image/jpeg', 0.9);
    onFrameSelected(croppedImageData);
  }, [cropArea, canvasDimensions, onFrameSelected]);

  const handlePresetCrop = (preset: 'center' | 'top' | 'bottom' | 'left' | 'right') => {
    const margin = 0.1;
    const centerSize = 0.8;
    
    switch (preset) {
      case 'center':
        setCropArea({
          x: canvasDimensions.width * margin,
          y: canvasDimensions.height * margin,
          width: canvasDimensions.width * centerSize,
          height: canvasDimensions.height * centerSize
        });
        break;
      case 'top':
        setCropArea({
          x: canvasDimensions.width * margin,
          y: 0,
          width: canvasDimensions.width * centerSize,
          height: canvasDimensions.height * 0.6
        });
        break;
      case 'bottom':
        setCropArea({
          x: canvasDimensions.width * margin,
          y: canvasDimensions.height * 0.4,
          width: canvasDimensions.width * centerSize,
          height: canvasDimensions.height * 0.6
        });
        break;
      case 'left':
        setCropArea({
          x: 0,
          y: canvasDimensions.height * margin,
          width: canvasDimensions.width * 0.6,
          height: canvasDimensions.height * centerSize
        });
        break;
      case 'right':
        setCropArea({
          x: canvasDimensions.width * 0.4,
          y: canvasDimensions.height * margin,
          width: canvasDimensions.width * 0.6,
          height: canvasDimensions.height * centerSize
        });
        break;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-full overflow-auto">
        <h3 className="text-xl font-bold text-cyan-400 mb-4 text-center">
          Bildausschnitt optimieren
        </h3>
        
        <p className="text-gray-300 text-center mb-4">
          Wähle den besten Bildausschnitt für die Objekterkennung. Ziehe den Rahmen oder nutze die Voreinstellungen.
        </p>
        
        {imageLoaded && (
          <div className="flex flex-col items-center">
            <canvas
              ref={canvasRef}
              width={canvasDimensions.width}
              height={canvasDimensions.height}
              className="border border-gray-600 cursor-move mb-4"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            
            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2 mb-4 justify-center">
              <button
                onClick={() => handlePresetCrop('center')}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                Mitte
              </button>
              <button
                onClick={() => handlePresetCrop('top')}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                Oben
              </button>
              <button
                onClick={() => handlePresetCrop('bottom')}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                Unten
              </button>
              <button
                onClick={() => handlePresetCrop('left')}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                Links
              </button>
              <button
                onClick={() => handlePresetCrop('right')}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
              >
                Rechts
              </button>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Bestätigen
              </button>
            </div>
          </div>
        )}
        
        {!imageLoaded && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FrameSelector;