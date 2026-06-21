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
