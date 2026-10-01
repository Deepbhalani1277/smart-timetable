import pytest
from app import create_app
from app.config import TestingConfig
from app.extensions import db as _db


@pytest.fixture(scope="session")
def app():
    application = create_app(TestingConfig)
    yield application


@pytest.fixture(scope="session")
def db_tables(app):
    with app.app_context():
        _db.create_all()
        yield _db
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db_session(db_tables, app):
    with app.app_context():
        yield db_tables.session
        db_tables.session.rollback()


@pytest.fixture
def db_client(db_tables, app):
    """
    HTTP test client whose database writes are rolled back after each test.
    Uses a nested transaction (SAVEPOINT) so the session-scoped schema stays intact.
    """
    with app.app_context():
        connection = _db.engine.connect()
        transaction = connection.begin()
        _db.session.bind = connection  # type: ignore[attr-defined]

        yield app.test_client()

        _db.session.remove()
        transaction.rollback()
        connection.close()
