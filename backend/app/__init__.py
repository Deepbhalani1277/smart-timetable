from flask import Flask, jsonify
from .config import get_config
from .extensions import db, migrate, cors
from .routes import register_blueprints


def create_app(config_object=None):
    app = Flask(__name__)

    cfg = config_object if config_object is not None else get_config()
    app.config.from_object(cfg)

    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"])

    # Import models so Flask-Migrate can detect them
    from . import models  # noqa: F401

    register_blueprints(app)
    _register_error_handlers(app)

    return app


def _register_error_handlers(app):
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not Found"}), 404

    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": "Bad Request"}), 400

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error("Internal server error: %s", e)
        return jsonify({"error": "Internal Server Error"}), 500
