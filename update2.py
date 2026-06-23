import json

paths = [
    'frontend/src/i18n/locales/ru/common.json',
    'frontend/src/i18n/locales/en/common.json'
]

ru_additions = {
    "content": {
        "section_description": "Описание раздела",
        "section_desc_placeholder": "Краткое описание раздела (поддерживается Markdown)...",
        "click_here": "Нажми или кликни сюда"
    }
}

en_additions = {
    "content": {
        "section_description": "Section Description",
        "section_desc_placeholder": "Short section description (Markdown supported)...",
        "click_here": "Click or tap here"
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

print("JSON files updated 2")
