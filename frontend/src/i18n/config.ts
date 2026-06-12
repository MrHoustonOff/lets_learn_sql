import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Базовые словари (в дальнейшем можно вынести в отдельные JSON-файлы)
const resources = {
  en: {
    translation: {
      "courses": "Courses",
      "databases": "Databases",
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
      "close": "Close",

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
        "rows_est": "Rows~",
        "planner_accuracy_warning": "Planner was off by ~{{ratio}}x (Expected {{expected}}, actual {{actual}})",
      },
      "db_list": {
        "connect_db": "Connect DB",
        "no_description": "No description"
      },
      "db_details": {
        "info": "Information",
        "name": "Name",
        "tech_name": "Technical Name",
        "description": "Description",
        "actions": "Actions",
        "download_dump": "Download pg_dump",
        "delete_db": "Delete DB",
        "delete_db_warning": "Caution! Deleting this database may break tasks referencing it.",
        "db_schema": "DB Schema",
        "sql_editor": "SQL Editor"
      },
      "db_visualizer": {
        "loading": "Loading database schema...",
        "load_error": "Error loading schema",
        "no_schema": "No schema provided",
        "filter_button": "Filters",
        "empty_schema": "Schema is empty or not loaded",
        "show_filter": "Show filter panel",
        "hide_filter": "Hide filter panel",
        "show_legend": "Show legend",
        "hide_legend": "Hide legend",
        "clear_relations": "Clear relations",
        "show_relations": "Show relations",
        "grid": "Grid",
        "reset_positions": "Reset positions",
        "fit_view": "Fit view",
        "relations": "Relations",
        "filter": {
          "tables": "Tables",
          "columns": "Columns",
          "search_tables": "Search tables...",
          "show_all": "Show all",
          "hide_all": "Hide all",
          "not_found": "Not found",
          "search_columns": "Search columns...",
          "reset_filter": "Reset filter"
        },
        "legend": {
          "title": "Relationship Legend",
          "many": "Many (0..N)",
          "one": "Exactly one (1:1)"
        },
        "view_menu": {
          "settings_title": "View Settings",
          "view": "View",
          "show_legend": "Display legend",
          "show_toolbar": "Display toolbar",
          "show_relations": "Display relations",
          "show_markers": "Show type (1:1, 1:M)",
          "edge_form": "Line Shape",
          "bezier": "Bezier",
          "smoothstep": "Orthogonal",
          "edge_style": "Line Style",
          "animated": "Animated",
          "solid": "Solid",
          "save_layout": "Save layout",
          "reset_layout": "Reset layout"
        },
        "table_details": {
          "limit_warning": "Only numbers from 0 to 100 are allowed for LIMIT",
          "structure": "Structure",
          "data_preview": "Data Preview",
          "columns": "Columns",
          "keys": "Keys",
          "name": "Name",
          "type": "Type",
          "default": "Default",
          "yes": "Yes",
          "no": "No",
          "indexes": "Indexes",
          "foreign_keys": "Foreign Keys",
          "rows": "Rows",
          "gen_select": "Generate SELECT",
          "copied": "Copied!",
          "copy_select": "Copy SELECT",
          "display_settings": "Display Settings",
          "rows_limit": "Number of rows (LIMIT)",
          "loading_data": "Loading data...",
          "load_error": "Error loading data:",
          "referenced_by": "Referenced by",
          "here": "here",
          "try_again": "Try again",
          "data": "Data",
          "limit_title": "Enter LIMIT from 0 to 100",
          "execute": "Execute",
          "empty_table": "Table is empty",
          "request_data": "Request Data"
        }
      },
      "sql_results": {
        "minimize": "Minimize",
        "maximize": "Maximize",
        "running": "Running query...",
        "error": "Execution Error",
        "empty": "Write an SQL query and click Run",
        "success_empty": "Query executed successfully, but returned 0 rows."
      },
      "data_table": {
        "search_in": "Search in {{col}}...",
        "select_all": "(Select All)",
        "select_results": "(Select results: {{count}})",
        "shown_limit": "Showing {{max}} of {{total}}. Use search to filter.",
        "no_results": "No results found",
        "shown_count": "Shown in table: {{count}}",
        "shown_filtered_count": "Shown in table: {{filtered}} of {{total}}",
        "limit_exceeded": "(Limit exceeded: server returned first {{limit}} of {{total}} rows)",
        "execution_time": "Time: {{time}} ms",
        "zoom_out": "Zoom Out",
        "zoom_level": "Table Zoom",
        "zoom_in": "Zoom In",
        "zoom_reset": "Reset Zoom (100%)",
        "no_data": "No data",
        "column_filter": "Filter by column"
      },
      "courses_page": {
        "import": "Import .llpg",
        "create": "Create Course",
        "coming_soon": "Coming Soon",
        "tasks": "tasks",
        "sections": "sections",
        "start": "Start →",
        "continue": "Continue →",
        "retry": "Repeat →",
        "open": "Open →",
        "back_to_courses": "Courses (Esc)",
        "solve": "Solve"
      },
      "task_pane": {
        "mark_solved_tooltip": "Mark as solved",
        "solved": "Solved",
        "bookmark_tooltip": "Bookmark",
        "bookmark": "Flag",
        "collapse": "Collapse",
        "expand": "Expand",
        "mock_title": "1. All Customers",
        "mock_description": "Write a SQL query that retrieves all columns from the <code>customers</code> table.",
        "mock_hint_title": "Hint:",
        "mock_hint_text": "Use the <code>*</code> symbol to select all columns.",
        "mock_solution_title": "Solution",
        "mock_solution_description": "It opens after you make at least one attempt to solve."
      },
      "sql_editor": {
        "title": "SQL Editor",
        "run": "Run",
        "explain": "Explain",
        "collapse": "Collapse",
        "expand": "Expand"
      }
    }
  },
  ru: {
    translation: {
      "courses": "Курсы",
      "databases": "Базы данных",
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
      "close": "Закрыть",

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
        "rows_est": "Строк~",
        "planner_accuracy_warning": "Планировщик ошибся в ~{{ratio}} раз (Ожидалось {{expected}}, по факту {{actual}})",
      },
      "db_list": {
        "connect_db": "Подключить БД",
        "no_description": "Нет описания"
      },
      "db_details": {
        "info": "Информация",
        "name": "Название",
        "tech_name": "Техническое имя",
        "description": "Описание",
        "actions": "Действия",
        "download_dump": "Скачать pg_dump",
        "delete_db": "Удалить БД",
        "delete_db_warning": "Осторожно! Удаление этой БД может сломать задачи, которые на нее ссылаются.",
        "db_schema": "Схема БД",
        "sql_editor": "SQL Редактор"
      },
      "db_visualizer": {
        "loading": "Загрузка схемы базы данных...",
        "load_error": "Ошибка загрузки схемы",
        "no_schema": "Схема не предоставлена",
        "filter_button": "Фильтры",
        "empty_schema": "Схема пуста или не загружена",
        "show_filter": "Показать панель фильтров",
        "hide_filter": "Скрыть панель фильтров",
        "show_legend": "Показать легенду",
        "hide_legend": "Скрыть легенду",
        "clear_relations": "Очистить связи",
        "show_relations": "Показать связи",
        "grid": "Сетка",
        "reset_positions": "Сбросить позиции",
        "fit_view": "Вписать в экран",
        "relations": "Связи",
        "filter": {
          "tables": "Таблицы",
          "columns": "Столбцы",
          "search_tables": "Поиск таблиц...",
          "show_all": "Показать все",
          "hide_all": "Скрыть все",
          "not_found": "Не найдено",
          "search_columns": "Поиск столбцов...",
          "reset_filter": "Сбросить фильтр"
        },
        "legend": {
          "title": "Легенда связей",
          "many": "Множество (0..N)",
          "one": "Точно один (1:1)"
        },
        "view_menu": {
          "settings_title": "Настройки вида",
          "view": "Вид",
          "show_legend": "Отображать легенду",
          "show_toolbar": "Отображать тулбар",
          "show_relations": "Отображать связи",
          "show_markers": "Показывать тип (1:1, 1:M)",
          "edge_form": "Форма линий",
          "bezier": "Округлые",
          "smoothstep": "Квадратные",
          "edge_style": "Стиль линий",
          "animated": "Бегущие",
          "solid": "Сплошные",
          "save_layout": "Сохранить расположение",
          "reset_layout": "Сбросить расположение"
        },
        "table_details": {
          "limit_warning": "Доступны только цифры от 0 до 100 для LIMIT",
          "structure": "Структура",
          "data_preview": "Пример данных",
          "columns": "Столбцы",
          "keys": "Ключи",
          "name": "Имя",
          "type": "Тип",
          "default": "По умолчанию",
          "yes": "Да",
          "no": "Нет",
          "indexes": "Индексы",
          "foreign_keys": "Внешние ключи",
          "rows": "Строки",
          "gen_select": "Сгенерировать SELECT",
          "copied": "Скопировано!",
          "copy_select": "Копировать SELECT",
          "display_settings": "Настройки отображения",
          "rows_limit": "Количество строк (LIMIT)",
          "loading_data": "Загрузка данных...",
          "load_error": "Ошибка при загрузке данных:",
          "referenced_by": "Ссылаются на эту таблицу",
          "here": "сюда",
          "try_again": "Попробовать снова",
          "data": "Данные",
          "limit_title": "Введите LIMIT от 0 до 100",
          "execute": "Выполнить",
          "empty_table": "Таблица пуста",
          "request_data": "Запросить данные"
        }
      },
      "sql_results": {
        "minimize": "Свернуть",
        "maximize": "Развернуть",
        "running": "Выполнение запроса...",
        "error": "Ошибка выполнения",
        "empty": "Напишите SQL запрос и нажмите Run",
        "success_empty": "Запрос выполнен успешно, но вернул 0 строк."
      },
      "data_table": {
        "search_in": "Поиск в {{col}}...",
        "select_all": "(Select All)",
        "select_results": "(Select результаты: {{count}})",
        "shown_limit": "Показано {{max}} из {{total}}. Используйте поиск.",
        "no_results": "Ничего не найдено",
        "shown_count": "Показано в таблице: {{count}}",
        "shown_filtered_count": "Показано в таблице: {{filtered}} из {{total}}",
        "limit_exceeded": "(Лимит превышен: сервер отдал первые {{limit}} из {{total}} строк)",
        "execution_time": "Время: {{time}} мс",
        "zoom_out": "Уменьшить (Zoom Out)",
        "zoom_level": "Масштаб таблицы",
        "zoom_in": "Увеличить (Zoom In)",
        "zoom_reset": "Сбросить масштаб (100%)",
        "no_data": "Нет данных",
        "column_filter": "Фильтр по колонке"
      },
      "courses_page": {
        "import": "Импортировать .llpg",
        "create": "Создать курс",
        "coming_soon": "Скоро",
        "tasks": "задач",
        "sections": "разделов",
        "start": "Начать →",
        "continue": "Продолжить →",
        "retry": "Повторить →",
        "open": "Открыть →",
        "back_to_courses": "Курсы (Esc)",
        "solve": "Решить"
      },
      "task_pane": {
        "mark_solved_tooltip": "Пометить как решено",
        "solved": "Решено",
        "bookmark_tooltip": "В закладки",
        "bookmark": "Пометить",
        "collapse": "Свернуть",
        "expand": "Развернуть",
        "mock_title": "1. Все клиенты",
        "mock_description": "Напишите SQL запрос, который выводит все колонки из таблицы <code>customers</code>.",
        "mock_hint_title": "Подсказка:",
        "mock_hint_text": "Используйте символ <code>*</code> для выбора всех колонок.",
        "mock_solution_title": "Решение",
        "mock_solution_description": "Оно открывается после того, как вы совершите хотя бы одну попытку решения."
      },
      "sql_editor": {
        "title": "Редактор SQL",
        "run": "Запуск",
        "explain": "Explain",
        "collapse": "Свернуть",
        "expand": "Развернуть"
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
