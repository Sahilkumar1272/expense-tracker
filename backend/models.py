from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import bcrypt
import secrets
import re
import random
import string

db = SQLAlchemy()

# ---------------------- USER ----------------------
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # Nullable for OAuth users
    is_verified = db.Column(db.Boolean, default=True)
    oauth_provider = db.Column(db.String(50), nullable=True)
    oauth_id = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_password(self, password):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        if self.password_hash is None:
            return False
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'is_verified': self.is_verified,
            'oauth_provider': self.oauth_provider,
            'created_at': self.created_at.isoformat()
        }

# ---------------------- CATEGORY ----------------------
class Category(db.Model):
    __tablename__ = "categories"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # ✅ must match 'users'
    name = db.Column(db.String(100), nullable=False)
    is_default = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "is_default": self.is_default
        }

# ---------------------- EXPENSE ----------------------
class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('expenses', lazy=True))
    category = db.relationship('Category', backref=db.backref('expenses', lazy=True))
    
    def to_dict(self):
        return {
        'id': self.id,
        'description': self.description,
        'amount': self.amount,
        'category_id': self.category_id,
        'date': self.date.isoformat() if self.date else None,
        'created_at': self.created_at.isoformat() if self.created_at else None,
        'updated_at': self.updated_at.isoformat() if self.updated_at else None
    }

# ---------------------- PENDING USER ----------------------
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
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def is_expired(self):
        return datetime.utcnow() > self.created_at + timedelta(hours=24)

# ---------------------- EMAIL VERIFICATION ----------------------
class EmailVerification(db.Model):
    __tablename__ = 'email_verifications'
    
    id = db.Column(db.Integer, primary_key=True)
    pending_user_id = db.Column(db.Integer, db.ForeignKey('pending_users.id'), nullable=False)
    otp = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, default=0)
    
    pending_user = db.relationship(
        'PendingUser',
        backref=db.backref('verification_codes', lazy=True, cascade="all, delete-orphan")
    )
    
    @staticmethod
    def generate_otp():
        return str(secrets.randbelow(900000) + 100000)
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def increment_attempts(self):
        self.attempts += 1

# ---------------------- RATE LIMIT LOG ----------------------
class RateLimitLog(db.Model):
    __tablename__ = 'rate_limit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False, index=True)
    endpoint = db.Column(db.String(100), nullable=False)
    attempt_time = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    @classmethod
    def cleanup_old_logs(cls):
        cutoff = datetime.utcnow() - timedelta(hours=1)
        cls.query.filter(cls.attempt_time < cutoff).delete()

# ---------------------- EMAIL VALIDATOR ----------------------
class EmailValidator:
    @staticmethod
    def is_valid_format(email):
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def is_disposable_email(email):
        disposable_domains = {
            '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
            'tempmail.org', 'throwaway.email', 'temp-mail.org',
            'getnada.com', 'maildrop.cc', 'yopmail.com'
        }
        domain = email.split('@')[1].lower() if '@' in email else ''
        return domain in disposable_domains
    
    @staticmethod
    def validate_email(email):
        if not EmailValidator.is_valid_format(email):
            return False, "Invalid email format"
        if EmailValidator.is_disposable_email(email):
            return False, "Disposable email addresses are not allowed"
        return True, "Valid email"

# ---------------------- PASSWORD RESET ----------------------
class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(32), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)

    @staticmethod
    def generate_token():
        return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

    def is_expired(self):
        return datetime.utcnow() > self.expires_at
