import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const ProfilePage: React.FC = () => {
    const { t } = useTranslation('profile');
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        window.location.href = '/api/profile/export';
    };

    const handleImportClick = () => {
        if (window.confirm(t('importWarning', 'ВНИМАНИЕ! Это действие полностью удалит текущие данные приложения и заменит их данными из резервной копии. Продолжить?'))) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportError(null);
        setImportSuccess(false);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/profile/import', {
                method: 'POST',
                body: formData,
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || t('importFailed', 'Ошибка импорта'));
            }
            
            setImportSuccess(true);
            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            setImportError(err.message);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex-1 overflow-auto bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold text-foreground">{t('title', 'Профиль и Настройки')}</h1>
                
                {/* Block 1: Export */}
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4 shadow-sm">
                    <h2 className="text-xl font-semibold text-foreground">{t('exportTitle', 'Экспорт данных')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t('exportDesc', 'Скачайте полную резервную копию вашего прогресса и учебных баз данных. Рекомендуется делать это регулярно.')}
                    </p>
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-md text-sm font-medium transition-colors"
                    >
                        {t('exportButton', 'Скачать резервную копию')}
                    </button>
                </div>

                {/* Block 2: Import */}
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4 shadow-sm">
                    <h2 className="text-xl font-semibold text-foreground">{t('importTitle', 'Импорт данных')}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t('importDesc', 'Восстановите данные из ранее скачанного архива резервной копии (.zip).')}
                    </p>
                    <input 
                        type="file" 
                        accept=".zip" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                    />
                    <button 
                        onClick={handleImportClick}
                        disabled={isImporting}
                        className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isImporting ? t('importing', 'Восстановление...') : t('importButton', 'Восстановить из резервной копии')}
                    </button>
                    {importError && (
                        <div className="text-destructive text-sm mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">{importError}</div>
                    )}
                    {importSuccess && (
                        <div className="text-success text-sm mt-2 p-2 bg-success/10 border border-success/20 rounded">{t('importSuccess', 'Данные успешно восстановлены! Перезагрузка...')}</div>
                    )}
                </div>

                {/* Block 3: GitHub Sync (Placeholder) */}
                <div className="bg-card border border-glass-border rounded-xl p-6 space-y-4 shadow-sm opacity-75">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-foreground">{t('githubTitle', 'Синхронизация с GitHub')}</h2>
                        <span className="text-xs bg-warning/20 text-warning-text px-2 py-1 rounded-full border border-warning/30">
                            {t('comingSoon', 'Скоро')}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('githubDesc', 'Автоматическое резервное копирование ваших решений и прогресса в ваш приватный репозиторий GitHub.')}
                    </p>
                    <button 
                        disabled
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium opacity-50 cursor-not-allowed border border-transparent"
                        title={t('featureDev', 'Функция в разработке')}
                    >
                        {t('githubButton', 'Подключить')}
                    </button>
                </div>
            </div>
        </div>
    );
};
