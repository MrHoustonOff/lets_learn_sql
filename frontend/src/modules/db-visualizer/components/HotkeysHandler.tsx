import React, { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';

// Система хоткеев, которую легко расширять и настраивать
export const HOTKEYS_CONFIG = {
  fitView: ['f', 'keyf', ' ', 'space', 'spacebar'], // 'keyf' работает на любой раскладке (в т.ч. русской 'а')
  resetLayout: ['r', 'keyr', 'к'], // 'keyr' или русская 'к'
};

interface HotkeysHandlerProps {
  onResetLayout?: () => void;
}

export const HotkeysHandler: React.FC<HotkeysHandlerProps> = ({ onResetLayout }) => {
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

      // Сброс позиций (Reset Layout)
      if (HOTKEYS_CONFIG.resetLayout.includes(key) || HOTKEYS_CONFIG.resetLayout.includes(code)) {
        e.preventDefault();
        if (onResetLayout) onResetLayout();
        // После сброса позиций тоже логично центрировать вид
        setTimeout(() => fitView({ duration: 800 }), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitView]);

  return null;
};
