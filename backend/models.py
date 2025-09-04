from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import bcrypt
import secrets
import re

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    is_verified = db.Column(db.Boolean, default=True)  # Always True since we only create after verification
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        """Hash and set password"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat()
        }

class PendingUser(db.Model):
    __tablename__ = 'pending_users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    last_otp_sent = db.Column(db.DateTime, default=datetime.utcnow)
    otp_attempts = db.Column(db.Integer, default=0)
    
    def set_password(self, password):
        """Hash and set password"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def is_expired(self):
        """Check if pending user registration is expired (24 hours)"""
        return datetime.utcnow() > (self.created_at + timedelta(hours=24))
    
    def can_resend_otp(self):
        """Check if user can request new OTP (60 seconds cooldown)"""
        if not self.last_otp_sent:
            return True
        return datetime.utcnow() > (self.last_otp_sent + timedelta(seconds=60))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }

class EmailVerification(db.Model):
    __tablename__ = 'email_verifications'
    
    id = db.Column(db.Integer, primary_key=True)
    pending_user_id = db.Column(db.Integer, db.ForeignKey('pending_users.id'), nullable=False, index=True)
    otp = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    is_used = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    attempts = db.Column(db.Integer, default=0)
    
    pending_user = db.relationship('PendingUser', backref=db.backref('verification_codes', lazy=True, cascade="all, delete-orphan"))
    
    @staticmethod
    def generate_otp():
        """Generate 6-digit OTP"""
        return str(secrets.randbelow(900000) + 100000)
    
    def is_expired(self):
        """Check if OTP is expired"""
        return datetime.utcnow() > self.expires_at
    
    def increment_attempts(self):
        """Increment verification attempts"""
        self.attempts += 1

class RateLimitLog(db.Model):
    __tablename__ = 'rate_limit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False, index=True)
    endpoint = db.Column(db.String(100), nullable=False)
    attempt_time = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    @classmethod
    def cleanup_old_logs(cls):
        """Remove logs older than 1 hour"""
        cutoff = datetime.utcnow() - timedelta(hours=1)
        cls.query.filter(cls.attempt_time < cutoff).delete()

# Email validation utility
class EmailValidator:
    @staticmethod
    def is_valid_format(email):
        """Basic email format validation"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def is_disposable_email(email):
        """Check if email is from a disposable email provider"""
        disposable_domains = {
            '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
            'tempmail.org', 'throwaway.email', 'temp-mail.org',
            'getnada.com', 'maildrop.cc', 'yopmail.com'
        }
        domain = email.split('@')[1].lower() if '@' in email else ''
        return domain in disposable_domains
    
    @staticmethod
    def validate_email(email):
        """Comprehensive email validation"""
        if not EmailValidator.is_valid_format(email):
            return False, "Invalid email format"
        
        if EmailValidator.is_disposable_email(email):
            return False, "Disposable email addresses are not allowed"
        
        return True, "Valid email"