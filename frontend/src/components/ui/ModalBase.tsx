import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { History, X } from 'lucide-react';

export const ModalBase: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode; 
  title?: string;
  isMonolith?: boolean;
  disableEsc?: boolean;
}> = ({ isOpen, onClose, children, title, isMonolith = false, disableEsc = false }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !disableEsc) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, disableEsc]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-modal-backdrop bg-background/80 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-background shadow-2xl border border-glass-border w-full h-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative ${isMonolith ? 'max-w-4xl rounded-xl' : 'max-w-6xl rounded-lg'}`}>
        {!isMonolith && title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border bg-hover shrink-0 rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-lg relative overflow-hidden">
                <History className="relative z-layout" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{title}</h2>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-hover text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
};
