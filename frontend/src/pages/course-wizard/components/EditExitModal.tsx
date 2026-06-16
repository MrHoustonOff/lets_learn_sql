import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface EditExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndLeave: () => Promise<void>;
  canGoNext: boolean;
  lastSaved: Date | null;
}

export const EditExitModal: React.FC<EditExitModalProps> = ({
  isOpen,
  onClose,
  onSaveAndLeave,
  canGoNext,
  lastSaved,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const formatTime = (d: Date | null) =>
    d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

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
          <h2 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
            {t('wizard_course.editExitConfirm.title')}
          </h2>
          <div className="text-sm text-foreground/90 leading-relaxed">
            {t('wizard_course.editExitConfirm.description', { time: formatTime(lastSaved) || '-' })}
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-hover transition-colors text-muted-foreground hover:text-foreground border border-glass-border focus:outline-none"
            >
              {t('wizard_course.editExitConfirm.stay')}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/courses')}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none bg-destructive/10 text-destructive hover:bg-destructive/20 border border-transparent"
              >
                {t('wizard_course.editExitConfirm.leave_without_saving')}
              </button>
              <button
                onClick={async () => {
                  await onSaveAndLeave();
                  navigate('/courses');
                }}
                disabled={!canGoNext}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none bg-primary/10 text-primary hover:bg-primary/20 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('wizard_course.editExitConfirm.save_and_leave')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
