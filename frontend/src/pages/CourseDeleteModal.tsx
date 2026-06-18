import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Trash2 } from 'lucide-react';

interface CourseDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteTasksOption: 'none' | 'orphaned') => void;
}

export const CourseDeleteModal: React.FC<CourseDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

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

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      <div 
        className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl border border-glass-border overflow-hidden animate-in zoom-in-95 duration-200 fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 flex flex-col gap-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground/60 hover:text-foreground p-2 rounded-lg hover:bg-hover transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-4 pr-6 pt-1">
            <div className="p-3 rounded-2xl shrink-0 bg-destructive/10 text-destructive">
              <Trash2 size={24} />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
              {t('courses_page:delete_modal.title')}
            </h2>
          </div>
          
          <div className="text-sm text-foreground/90 leading-relaxed mt-2">
            {t('courses_page:delete_modal.description')}
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button 
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-hover transition-colors text-muted-foreground hover:text-foreground border border-glass-border focus:outline-none"
            >
              {t('courses_page:delete_modal.cancel')}
            </button>
            
            <div className="flex gap-3 items-stretch">
              <div className="flex-1 group relative flex flex-col">
                <button 
                  onClick={() => onConfirm('orphaned')}
                  className="w-full h-full flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none bg-destructive/10 text-destructive hover:bg-destructive/20 border border-transparent leading-tight"
                >
                  {t('courses_page:delete_modal.delete_orphaned')}
                </button>
                <div className="opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 delay-500 absolute -top-2 -translate-y-full left-1/2 -translate-x-1/2 z-[100] w-64 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-2xl border border-glass-border whitespace-pre-wrap font-sans font-normal normal-case leading-relaxed">
                  {t('courses_page:delete_modal.delete_orphaned_tip')}
                </div>
              </div>
              
              <div className="flex-1 group relative flex flex-col">
                <button 
                  onClick={() => onConfirm('none')}
                  className="w-full h-full flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none bg-primary/10 text-primary hover:bg-primary/20 border border-transparent leading-tight"
                >
                  {t('courses_page:delete_modal.keep_tasks')}
                </button>
                <div className="opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 delay-500 absolute -top-2 -translate-y-full left-1/2 -translate-x-1/2 z-[100] w-64 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-2xl border border-glass-border whitespace-pre-wrap font-sans font-normal normal-case leading-relaxed">
                  {t('courses_page:delete_modal.keep_tasks_tip')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
