from app.config import TestingConfig


def test_create_app_returns_flask_app(app):
    assert app is not None


def test_testing_config_applied(app):
    assert app.config["TESTING"] is True
    assert app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite:///:memory:"


def test_health_returns_200(client):
    assert client.get("/api/health").status_code == 200


def test_health_response_fields(client):
    data = client.get("/api/health").get_json()
    assert data["status"] == "healthy"
    assert data["api_name"] == "Smart Classroom & Timetable Scheduler API"
    assert data["version"] == "1.0.0"


def test_unknown_route_returns_404_json(client):
    response = client.get("/api/unknown-endpoint")
    assert response.status_code == 404
    data = response.get_json()
    assert data["error"] == "Not Found"
    assert "message" not in data
