# Руководство по локализации (i18n)

## Основные правила для ИИ (AI Instructions)

1. **Никогда не хардкодить текст в компонентах.** Любой видимый пользователю текст должен быть обёрнут в хук `useTranslation` и функцию `t()`.
2. **Английский — fallback, Русский — default.** Всегда создавайте ключи в обоих языковых словарях (`ru` и `en`) в файле `config.ts` (или соответствующих JSON-файлах, если они будут вынесены).
3. **Именование ключей:** Используйте пространства имен (namespaces), сгруппированные по фичам. Например: `explain_ui.loading`, `navbar.courses`, `profile.settings`. Не используйте глобальные ключи, если слово специфично для контекста.
4. **Технические термины:** Оставляйте технические термины (например, *Cost, Time, Seq Scan, Buffer*) на английском языке даже в русской локализации, если их перевод ломает узнаваемость (опирайтесь на `pg_explain_docs.json`).

## Пример использования в компоненте

```tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

export const MyComponent = () => {
  // Обязательно достаем t
  const { t } = useTranslation();

  return (
    <div>
      {/* Неправильно: */}
      {/* <h1>Мой заголовок</h1> */}

      {/* Правильно: */}
      <h1>{t('my_component.title')}</h1>
      <p>{t('my_component.description')}</p>
    </div>
  );
};
```

## Как добавлять новые строки

1. Откройте `frontend/src/i18n/config.ts`.
2. Найдите нужный объект (например, `explain_ui`) в секциях `en` и `ru`.
3. Добавьте ваш ключ в обе секции:
   ```typescript
   // В секции en:
   "my_component": {
     "title": "My Title",
     "description": "Some description"
   }
   // В секции ru:
   "my_component": {
     "title": "Мой заголовок",
     "description": "Какое-то описание"
   }
   ```
