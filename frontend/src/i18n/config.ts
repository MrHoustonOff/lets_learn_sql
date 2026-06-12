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

      "explain_ui": {
        "loading": "Analyzing execution plan...",
        "empty": "Run a query to see the plan analysis",
        "graph_view": "Graph View",

        "perf_breakdown": "Performance Breakdown",
        "perf_breakdown_tooltip": "Relative resource distribution across tree nodes",
        "col_operation": "Operation",
        "col_impact": "Impact",
        "col_cost": "Cost",
        "col_time": "Time",

        "plan_tree": "Plan Tree",
        "pipeline_hint": "Simplified structure (data may be slightly inaccurate compared to the tree below)",

        "planning": "Planning",
        "execution": "Execution",
        "no_issues": "Analysis complete, no issues found",

        "node_details_operation": "Operation",
        "node_details_object": "Object",
        "data_flow": "Data Flow (Data Flow)",
        "insights": "Analytics (Insights)",
        "details_section": "Operation Details",
        "copy_hint": "Click to copy value",
        "input_rows": "Input",
        "output_rows": "Output",
        "condition": "Condition",
        "columns": "Columns",
        "node_time": "Node time",
        "buffers": "Buffers",
        "memory": "Memory",
        "planner_accuracy": "Estimate",
        "filter_cond": "Filter/Cond",
      }
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

      "explain_ui": {
        "loading": "Анализ плана выполнения...",
        "empty": "Выполните запрос, чтобы увидеть анализ плана",
        "graph_view": "Графовое представление",

        "perf_breakdown": "Performance Breakdown",
        "perf_breakdown_tooltip": "Относительное распределение ресурсов на узлах дерева",
        "col_operation": "Операция",
        "col_impact": "Влияние",
        "col_cost": "Cost",
        "col_time": "Time",

        "plan_tree": "Plan Tree",
        "pipeline_hint": "Упрощенная структура (эти данные могут быть немного неточные в отличии от дерева снизу)",

        "planning": "Planning",
        "execution": "Execution",
        "no_issues": "Анализ завершен, замечаний нет",

        "node_details_operation": "Операция",
        "node_details_object": "Объект",
        "data_flow": "Поток данных (Data Flow)",
        "insights": "Аналитика (Insights)",
        "details_section": "Детали операции",
        "copy_hint": "Нажмите, чтобы скопировать значение",
        "input_rows": "Вошло",
        "output_rows": "Вышло",
        "condition": "Условие",
        "columns": "Колонки",
        "node_time": "Время узла",
        "buffers": "Буферы",
        "memory": "Память",
        "planner_accuracy": "Прогноз",
        "filter_cond": "Filter/Cond",
      }
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
