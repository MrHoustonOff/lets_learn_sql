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
        <div className="flex-1 overflow-auto bg-main-bg p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold text-main-text">{t('title', 'Профиль и Настройки')}</h1>
                
                {/* Block 1: Export */}
                <div className="bg-panel-bg border border-panel-border rounded-lg p-6 space-y-4 shadow-sm">
                    <h2 className="text-xl font-semibold text-main-text">{t('exportTitle', 'Экспорт данных')}</h2>
                    <p className="text-sm text-secondary-text">
                        {t('exportDesc', 'Скачайте полную резервную копию вашего прогресса и учебных баз данных. Рекомендуется делать это регулярно.')}
                    </p>
                    <button 
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                        {t('exportButton', 'Скачать резервную копию')}
                    </button>
                </div>

                {/* Block 2: Import */}
                <div className="bg-panel-bg border border-panel-border rounded-lg p-6 space-y-4 shadow-sm">
                    <h2 className="text-xl font-semibold text-main-text">{t('importTitle', 'Импорт данных')}</h2>
                    <p className="text-sm text-secondary-text">
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
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {isImporting ? t('importing', 'Восстановление...') : t('importButton', 'Восстановить из резервной копии')}
                    </button>
                    {importError && (
                        <div className="text-red-500 text-sm mt-2 p-2 bg-red-500/10 rounded">{importError}</div>
                    )}
                    {importSuccess && (
                        <div className="text-green-500 text-sm mt-2 p-2 bg-green-500/10 rounded">{t('importSuccess', 'Данные успешно восстановлены! Перезагрузка...')}</div>
                    )}
                </div>

                {/* Block 3: GitHub Sync (Placeholder) */}
                <div className="bg-panel-bg border border-panel-border rounded-lg p-6 space-y-4 shadow-sm opacity-75">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-main-text">{t('githubTitle', 'Синхронизация с GitHub')}</h2>
                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full border border-yellow-500/30">
                            {t('comingSoon', 'Скоро')}
                        </span>
                    </div>
                    <p className="text-sm text-secondary-text">
                        {t('githubDesc', 'Автоматическое резервное копирование ваших решений и прогресса в ваш приватный репозиторий GitHub.')}
                    </p>
                    <button 
                        disabled
                        className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium opacity-50 cursor-not-allowed"
                        title={t('featureDev', 'Функция в разработке')}
                    >
                        {t('githubButton', 'Подключить')}
                    </button>
                </div>
            </div>
        </div>
    );
};
