import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'success' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  children, 
  confirmText, 
  cancelText, 
  variant = 'destructive' 
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'success': return <Trash2 size={24} />;
      case 'primary': return <Info size={24} />;
      case 'destructive':
      default: return <Trash2 size={24} />;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'success': return 'bg-success/10 text-success';
      case 'primary': return 'bg-primary/10 text-primary';
      case 'destructive':
      default: return 'bg-destructive/10 text-destructive';
    }
  };

  const getBtnColor = () => {
    switch (variant) {
      case 'success': return 'bg-success/10 text-success hover:bg-success/20 border border-transparent';
      case 'primary': return 'bg-primary/10 text-primary hover:bg-primary/20 border border-transparent';
      case 'destructive':
      default: return 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-transparent';
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-modal-top bg-background/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card shadow-2xl border border-glass-border w-full max-w-[400px] sm:max-w-[440px] rounded-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden relative">
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-muted-foreground/60 hover:text-foreground p-2 rounded-lg hover:bg-hover transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>

          <div className="flex items-start gap-4">
            {/* Left side: Icon */}
            <div className={`p-3 rounded-2xl shrink-0 ${getIconColor()}`}>
              {getIcon()}
            </div>
            
            {/* Right side: Title and Text */}
            <div className="flex flex-col gap-2 pt-1 pr-6">
              <h2 className="text-lg font-bold tracking-tight text-foreground leading-tight">{title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed mt-1">
                {children}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-hover transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            >
              {cancelText || 'Отмена'}
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all focus:outline-none ${getBtnColor()}`}
            >
              {confirmText || 'Подтвердить'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
