import json

paths = [
    'frontend/src/i18n/locales/ru/common.json',
    'frontend/src/i18n/locales/en/common.json'
]

ru_additions = {
    "preview": {
        "untitled": "Без названия",
        "tasks_label": "задач",
        "sections_label": "разделов",
        "readiness_title": "Готовность к публикации",
        "req_title": "Название курса",
        "req_author": "Хотя бы один автор",
        "req_section": "Хотя бы один раздел",
        "req_tasks": "Задачи добавлены"
    }
}

en_additions = {
    "preview": {
        "untitled": "Untitled",
        "tasks_label": "tasks",
        "sections_label": "sections",
        "readiness_title": "Readiness for publishing",
        "req_title": "Course title",
        "req_author": "At least one author",
        "req_section": "At least one section",
        "req_tasks": "Tasks added"
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

print("JSON files updated 4")
