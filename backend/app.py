from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from config import Config
from models import db, seed_default_categories
from routes.auth import auth_bp
from routes.expense import expense_bp
import logging
import threading
import time
from utils.cleanup import CleanupService
from flask_migrate import Migrate


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(name)s %(message)s'
    )
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=["http://localhost:5173"])
    JWTManager(app)
    Migrate(app, db)

    # Initialize Flask-Mail
    mail = Mail(app)
    app.mail = mail
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(expense_bp, url_prefix='/api')
    
    # Create database tables + seed defaults
    with app.app_context():
        db.create_all()
        seed_default_categories()  # Use the function from models.py
    
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'Backend is running!'}), 200
    
    # Manual seed endpoint for debugging (remove in production)
    @app.route('/api/seed-categories', methods=['POST'])
    def manual_seed():
        try:
            seed_default_categories()  # Use the function from models.py
            return jsonify({'message': 'Categories seeded successfully'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    # Start cleanup background task
    def cleanup_task():
        while True:
            try:
                with app.app_context():
                    CleanupService.run_all_cleanup_tasks()
                time.sleep(1800)  # Run every 30 minutes
            except Exception as e:
                app.logger.error(f"Background cleanup error: {str(e)}")
                time.sleep(300)  # Wait 5 minutes on error
    
    # Start cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_task, daemon=True)
    cleanup_thread.start()
    
    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)