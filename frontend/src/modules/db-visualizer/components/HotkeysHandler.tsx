import React, { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

// Система хоткеев, которую легко расширять и настраивать
export const HOTKEYS_CONFIG = {
  fitView: ['f', 'keyf', ' ', 'space', 'spacebar'], // 'keyf' работает на любой раскладке (в т.ч. русской 'а')
};

export const HotkeysHandler: React.FC = () => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем нажатия, если пользователь вводит текст в инпут
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const code = e.code.toLowerCase();

      // Центрирование (Fit View)
      if (HOTKEYS_CONFIG.fitView.includes(key) || HOTKEYS_CONFIG.fitView.includes(code)) {
        e.preventDefault();
        fitView({ duration: 800 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView]);

  return null;
};
