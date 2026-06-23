import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Upload, AlertTriangle } from 'lucide-react';

interface UploadStepProps {
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadError: string | null;
  onBack?: () => void;
  dropZoneText?: string;
  selectFileText?: string;
  isMultiple?: boolean;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  dragActive, handleDrag, handleDrop, handleFileChange, uploadError,
  onBack, dropZoneText, selectFileText, isMultiple = true
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground self-start font-medium focus:outline-none transition-colors"
        >
          <ChevronLeft size={14} /> {t('import_tasks.back')}
        </button>
      )}

      <div 
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[250px] relative ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-glass-border bg-glass/10 hover:bg-glass-hover hover:border-border/80'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('task-json-file-input')?.click()}
      >
        <input 
          type="file" 
          multiple={isMultiple} 
          accept=".json" 
          onChange={handleFileChange} 
          className="hidden" 
          id="task-json-file-input" 
        />
        
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
          <Upload size={28} />
        </div>
        
        <h4 className="text-sm font-bold mb-1.5 text-foreground">{dropZoneText || t('import_tasks.drop_zone')}</h4>
        <p className="text-xs text-muted-foreground">{selectFileText || t('import_tasks.select_file')}</p>
      </div>

      {uploadError && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed animate-in fade-in duration-200">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="whitespace-pre-wrap">{uploadError}</div>
        </div>
      )}
    </div>
  );
};
