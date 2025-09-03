from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from config import Config
from models import db
from routes.auth import auth_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, origins=["http://localhost:5173"])  # Allow frontend origin
    JWTManager(app)
    
    # Initialize Flask-Mail
    mail = Mail(app)
    app.mail = mail
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'Backend is running!'}), 200
    
    return app

app = create_app()
mail = app.mail

if __name__ == '__main__':
    app.run(debug=True, port=5000)