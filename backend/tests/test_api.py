def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "PGym Backend"}

def test_list_courses(client):
    response = client.get("/api/courses")
    assert response.status_code == 200
    courses = response.json()
    assert isinstance(courses, list)

def test_list_tasks(client):
    response = client.get("/api/tasks")
    assert response.status_code == 200
    tasks_data = response.json()
    assert "tasks" in tasks_data
    assert "courses" in tasks_data
    assert isinstance(tasks_data["tasks"], list)


def test_export_import_tasks(client):
    # 1. Fetch existing tasks
    response = client.get("/api/tasks")
    assert response.status_code == 200
    tasks_data = response.json()
    tasks = tasks_data.get("tasks", [])
    if not tasks:
        export_resp = client.post("/api/tasks/export", json={"task_ids": []})
        assert export_resp.status_code == 200
        assert export_resp.json() == {"tasks": []}
        return

    # Export first task
    task_id = tasks[0]["id"]
    export_resp = client.post("/api/tasks/export", json={"task_ids": [task_id]})
    assert export_resp.status_code == 200
    payload = export_resp.json()
    assert "tasks" in payload
    assert len(payload["tasks"]) == 1
    exported_task = payload["tasks"][0]
    assert exported_task["title"] == tasks[0]["title"]
    assert "db_name" in exported_task

    # 2. Import task - mode 'skip' (should be skipped since it already exists)
    import_resp = client.post("/api/tasks/import?mode=skip", json=payload)
    assert import_resp.status_code == 200
    import_data = import_resp.json()
    assert import_data["skipped_count"] == 1
    assert import_data["imported_count"] == 0
    assert import_data["results"][0]["status"] == "skipped"

    # 3. Import task - mode 'overwrite' (should overwrite)
    import_resp2 = client.post("/api/tasks/import?mode=overwrite", json=payload)
    assert import_resp2.status_code == 200
    import_data2 = import_resp2.json()
    assert import_data2["overwritten_count"] == 1
    assert import_data2["imported_count"] == 0
    assert import_data2["results"][0]["status"] == "overwritten"

