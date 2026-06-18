import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import locales (en)
import commonEn from './locales/en/common.json';
import explainUiEn from './locales/en/explain_ui.json';
import dbListEn from './locales/en/db_list.json';
import dbDetailsEn from './locales/en/db_details.json';
import dbVisualizerEn from './locales/en/db_visualizer.json';
import sqlResultsEn from './locales/en/sql_results.json';
import dataTableEn from './locales/en/data_table.json';
import coursesPageEn from './locales/en/courses_page.json';
import taskPaneEn from './locales/en/task_pane.json';
import sqlEditorEn from './locales/en/sql_editor.json';
import profileEn from './locales/en/profile.json';
import submitReportEn from './locales/en/submit_report.json';
import rulesI18nEn from './locales/en/rules_i18n.json';
import tasksListEn from './locales/en/tasks_list.json';

// Import locales (ru)
import commonRu from './locales/ru/common.json';
import explainUiRu from './locales/ru/explain_ui.json';
import dbListRu from './locales/ru/db_list.json';
import dbDetailsRu from './locales/ru/db_details.json';
import dbVisualizerRu from './locales/ru/db_visualizer.json';
import sqlResultsRu from './locales/ru/sql_results.json';
import dataTableRu from './locales/ru/data_table.json';
import coursesPageRu from './locales/ru/courses_page.json';
import taskPaneRu from './locales/ru/task_pane.json';
import sqlEditorRu from './locales/ru/sql_editor.json';
import profileRu from './locales/ru/profile.json';
import submitReportRu from './locales/ru/submit_report.json';
import rulesI18nRu from './locales/ru/rules_i18n.json';
import tasksListRu from './locales/ru/tasks_list.json';

const resources = {
  en: {
    common: commonEn,
    explain_ui: explainUiEn,
    db_list: dbListEn,
    db_details: dbDetailsEn,
    db_visualizer: dbVisualizerEn,
    sql_results: sqlResultsEn,
    data_table: dataTableEn,
    courses_page: coursesPageEn,
    task_pane: taskPaneEn,
    sql_editor: sqlEditorEn,
    profile: profileEn,
    submit_report: submitReportEn,
    rules_i18n: rulesI18nEn,
    tasks_list: tasksListEn,
  },
  ru: {
    common: commonRu,
    explain_ui: explainUiRu,
    db_list: dbListRu,
    db_details: dbDetailsRu,
    db_visualizer: dbVisualizerRu,
    sql_results: sqlResultsRu,
    data_table: dataTableRu,
    courses_page: coursesPageRu,
    task_pane: taskPaneRu,
    sql_editor: sqlEditorRu,
    profile: profileRu,
    submit_report: submitReportRu,
    rules_i18n: rulesI18nRu,
    tasks_list: tasksListRu,
  }
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    ns: ['common', 'explain_ui', 'db_list', 'db_details', 'db_visualizer', 'sql_results', 'data_table', 'courses_page', 'task_pane', 'sql_editor', 'profile', 'submit_report', 'tasks_list'],
    defaultNS: 'common',
    // Options for language detector
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'llpg_language',
    },
    interpolation: {
      escapeValue: false // React already protects from XSS
    }
  });

export default i18n;
