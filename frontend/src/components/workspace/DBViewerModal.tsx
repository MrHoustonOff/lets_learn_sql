import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DBVisualizer } from '../../modules/db-visualizer';

interface DBViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbName: string;
}

export const DBViewerModal: React.FC<DBViewerModalProps> = ({ isOpen, onClose, dbName }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-background/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-glass backdrop-blur-3xl w-full h-full max-w-7xl max-h-[90vh] rounded-2xl border border-glass-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
        {/* DBVisualizer isMaximized forces it to take full width/height */}
        <DBVisualizer isMaximized={true} onClose={onClose} />
      </div>
    </div>
  );
};
