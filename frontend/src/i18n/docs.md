# Руководство по локализации (i18n)

В проекте используется двухуровневая система локализации, разделяющая короткие UI-строки и объемные контентные справочники. Источником правды для текущего языка всегда является `i18n.language`.

## 1. UI-строки (Интерфейс)
Используются для кнопок, заголовков, коротких текстов с интерполяцией или плюрализацией.

**Где лежат:**
- `frontend/src/i18n/locales/ru/*.json`
- `frontend/src/i18n/locales/en/*.json`

**Правила:**
- Никогда не хардкодьте текст в компонентах (`<div>Привет</div>` ❌).
- Используйте хук `useTranslation` и разбивайте переводы по namespaces.
- Если в тексте есть HTML-теги (например, `<code>`), используйте компонент `<Trans>` из `react-i18next`.

**Пример использования:**
```tsx
import { useTranslation, Trans } from 'react-i18next';

export const MyComponent = () => {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('welcome_message')}</h1>
      <p>
        <Trans i18nKey="common:description" components={{ code: <code /> }} />
      </p>
    </div>
  );
};
```

## 2. Контентные справочники (Сложные данные)
Используются для структурированных данных (например, документация по узлам PostgreSQL, описание полей), которые могут содержать markdown, ссылки и вложенные структуры.

**Где лежат:**
- `frontend/src/i18n/content/*.json`

**Правила:**
- Структура JSON файла должна быть `[lang][key]...` (например: `{ "en": { "Limit": { "desc": "..." } }, "ru": { "Limit": { "desc": "..." } } }`).
- Доступ к ним осуществляется через кастомные хуки, которые берут текущий язык через хук `useTranslation` (`i18n.language`).

**Пример использования:**
```tsx
import { useExplainNodeDoc } from '@/i18n/content/useExplainNodeDoc';

export const NodeDetails = ({ nodeType }) => {
  const doc = useExplainNodeDoc(nodeType);
  
  if (!doc) return null;
  return <div>{doc.description}</div>;
};
```

## 3. Специфичные термины
Технические термины (например, операции PostgreSQL: *Seq Scan, Hash Join*, параметры: *Cost, Buffer*) **не переводятся** на русский язык и должны оставаться на английском в обоих словарях.

## 4. Проверка ключей
При добавлении новых ключей перевода обязательно добавляйте их в оба языка (`ru` и `en`). Для автоматической проверки паритета ключей используйте скрипт:
```bash
npm run i18n:check
```
