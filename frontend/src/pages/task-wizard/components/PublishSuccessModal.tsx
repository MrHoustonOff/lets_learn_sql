import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

interface PublishSuccessModalProps {
  isOpen: boolean;
  isEditing?: boolean;
  onBackToStudio: () => void;
}

export const PublishSuccessModal: React.FC<PublishSuccessModalProps> = ({ isOpen, isEditing, onBackToStudio }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-modal-backdrop flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-background border border-glass-border rounded-2xl p-6 w-[400px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mb-4">
          <Check size={24} />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {isEditing ? t('wizard.editSuccess.title') : t('wizard.publishSuccess.title')}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {isEditing ? t('wizard.editSuccess.description') : t('wizard.publishSuccess.description')}
        </p>
        <button
          onClick={onBackToStudio}
          className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl font-medium transition-colors outline-none"
        >
          {isEditing ? t('wizard.editSuccess.backToTasks') : t('wizard.publishSuccess.backToStudio')}
        </button>
      </div>
    </div>
  );
};
