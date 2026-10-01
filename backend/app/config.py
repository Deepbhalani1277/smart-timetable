import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "change-me-in-production"
    )

    _database_url = os.environ.get(
        "DATABASE_URL",
        "sqlite:///timetable.db"
    )

    # Support PostgreSQL URLs provided by Render
    if _database_url.startswith("postgres://"):
        _database_url = _database_url.replace(
            "postgres://",
            "postgresql://",
            1
        )

    SQLALCHEMY_DATABASE_URI = _database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS configuration
    _cors_env = os.environ.get("CORS_ORIGINS", "*").strip()

    CORS_ORIGINS = (
        "*"
        if _cors_env == "*"
        else [
            origin.strip()
            for origin in _cors_env.split(",")
            if origin.strip()
        ]
    )


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config():
    env = os.environ.get("FLASK_ENV", "default")
    return config_map.get(env, DevelopmentConfig)
