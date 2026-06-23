import json

paths = [
    'frontend/src/i18n/locales/ru/common.json',
    'frontend/src/i18n/locales/en/common.json'
]

ru_additions = {
    "footer": {
        "publishing": "Публикация...",
        "error_retry": "Ошибка — повторить"
    },
    "info": {
        "author_hint": "Один или несколько — ссылка необязательна",
        "add_author": "Добавить автора",
        "supports_markdown": "поддерживает Markdown"
    },
    "content": {
        "section_count": "{count} разд.",
        "task_count": "{count} зад.",
        "new_section": "Новый раздел",
        "add_first_section": "Добавить первый раздел",
        "section_title": "Раздел {index}",
        "add_task_to_section": "Добавить задачу в «{section}»",
        "no_tasks_yet": "Задач пока нет — добавь через кнопку ниже"
    }
}

en_additions = {
    "footer": {
        "publishing": "Publishing...",
        "error_retry": "Error — retry"
    },
    "info": {
        "author_hint": "One or more — link is optional",
        "add_author": "Add author",
        "supports_markdown": "supports Markdown"
    },
    "content": {
        "section_count": "{count} sec.",
        "task_count": "{count} tsk.",
        "new_section": "New section",
        "add_first_section": "Add first section",
        "section_title": "Section {index}",
        "add_task_to_section": "Add task to «{section}»",
        "no_tasks_yet": "No tasks yet — add via button below"
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
            # Only fix {count} to {{count}} format
            v_fix = v.replace("{", "{{").replace("}", "}}").replace("{{{{", "{{").replace("}}}}", "}}")
            wizard[section][k] = v_fix
            
    data["wizard_course"] = wizard
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

print("JSON files updated")
