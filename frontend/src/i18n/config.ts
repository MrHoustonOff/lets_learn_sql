import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Базовые словари (в дальнейшем можно вынести в отдельные JSON-файлы)
const resources = {
  en: {
    translation: {
      "courses": "Courses",
      "tasks": "Tasks",
      "settings": "Settings",
      "profile": "Profile",
      "task": "Task",
      "solution": "Solution",
      "run": "Run",
      "explain": "Explain",
      "result": "Result",
      "full_analysis": "Full Analysis",
      "course_toc": "Course Table of Contents",
      "overall_progress": "Overall Progress",
    }
  },
  ru: {
    translation: {
      "courses": "Курсы",
      "tasks": "Задачи",
      "settings": "Настройки",
      "profile": "Профиль",
      "task": "Задача",
      "solution": "Решение",
      "run": "Запуск",
      "explain": "Explain",
      "result": "Результат",
      "full_analysis": "Полный анализ",
      "course_toc": "Оглавление курса",
      "overall_progress": "Общий прогресс",
    }
  }
};

// Загружаем язык из localStorage, по умолчанию русский
const savedLanguage = localStorage.getItem('llpg_language') || 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React уже защищает от XSS
    }
  });

// Сохраняем язык при его смене
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('llpg_language', lng);
});

export default i18n;
