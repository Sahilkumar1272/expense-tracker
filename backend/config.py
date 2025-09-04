import os
import urllib.parse
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Database
    MYSQL_HOST = os.environ.get('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.environ.get('MYSQL_USER', 'root')
    MYSQL_PASSWORD = urllib.parse.quote_plus(os.environ.get('MYSQL_PASSWORD', 'Sahilkumar1272@#'))
    MYSQL_DB = os.environ.get('MYSQL_DB', 'expense_tracker')
    
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DB}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'fallback-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Email
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_USERNAME')
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY', 'fallback-secret-key')
    
    # Rate limiting
    RATE_LIMIT_REGISTRATION = 5  # attempts per hour per IP
    RATE_LIMIT_LOGIN = 10  # attempts per hour per IP
    RATE_LIMIT_OTP = 3  # attempts per hour per IP
    
    # Cleanup settings
    PENDING_USER_EXPIRY_HOURS = 24
    CLEANUP_INTERVAL_MINUTES = 30