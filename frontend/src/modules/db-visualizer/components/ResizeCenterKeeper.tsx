import { useEffect, useRef } from 'react';
import { useStore, useReactFlow } from '@xyflow/react';

export const ResizeCenterKeeper = () => {
  const { getViewport, setViewport } = useReactFlow();
  
  // Подписываемся на внутренние размеры контейнера React Flow
  const width = useStore(s => s.width);
  const height = useStore(s => s.height);
  const isDraggingPane = useStore(s => s.paneDragging);
  const isDraggingNode = useStore(s => s.nodes.some(n => n.dragging));
  
  const prevSize = useRef({ width, height });

  useEffect(() => {
    if (width === 0 || height === 0) return;
    
    const prev = prevSize.current;
    
    if (prev.width !== 0 && prev.height !== 0 && (prev.width !== width || prev.height !== height)) {
      const dw = width - prev.width;
      const dh = height - prev.height;
      
      if (!isDraggingPane && !isDraggingNode) {
        const { x, y, zoom } = getViewport();
        setViewport({ 
          x: x + dw / 2, 
          y: y + dh / 2, 
          zoom 
        }, { duration: 0 });
      }
    }
    
    prevSize.current = { width, height };
  }, [width, height, getViewport, setViewport, isDraggingPane, isDraggingNode]);

  return null;
};