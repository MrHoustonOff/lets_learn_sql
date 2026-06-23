import json

paths = [
    'frontend/src/i18n/locales/ru/common.json',
    'frontend/src/i18n/locales/en/common.json'
]

ru_additions = {
    "picker": {
        "select_tasks": "Выберите задачи из базы",
        "selected_count": "Выбрано: {{count}}",
        "search_placeholder": "Поиск по названию...",
        "all_difficulties": "Все сложности",
        "diff_easy": "Легкие (1)",
        "diff_medium": "Средние (2)",
        "diff_hard": "Сложные (3)",
        "all_tags": "Все теги",
        "all_databases": "Все базы данных",
        "loading_tasks": "Загрузка задач...",
        "nothing_found": "Ничего не найдено",
        "already_in_course": "(Уже в курсе)",
        "preview": "Просмотреть",
        "page_info": "Стр. {{page}} (Всего: {{total}})",
        "cancel": "Отмена",
        "add": "Добавить"
    }
}

en_additions = {
    "picker": {
        "select_tasks": "Select tasks from the pool",
        "selected_count": "Selected: {{count}}",
        "search_placeholder": "Search by title...",
        "all_difficulties": "All difficulties",
        "diff_easy": "Easy (1)",
        "diff_medium": "Medium (2)",
        "diff_hard": "Hard (3)",
        "all_tags": "All tags",
        "all_databases": "All databases",
        "loading_tasks": "Loading tasks...",
        "nothing_found": "Nothing found",
        "already_in_course": "(Already in course)",
        "preview": "Preview",
        "page_info": "Page {{page}} (Total: {{total}})",
        "cancel": "Cancel",
        "add": "Add"
    }
}

for path, add_data in zip(paths, [ru_additions, en_additions]):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    wizard = data.get("wizard_course", {})
    
    for section, fields in add_data.items():
        if section not in wizard:
            wizard[section] = {}
        for k, v in fields.items():
            wizard[section][k] = v
            
    data["wizard_course"] = wizard
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("JSON files updated 3")
