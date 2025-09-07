from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_mail import Message
from models import db, User, PendingUser, EmailVerification, EmailValidator, PasswordResetToken, Expense, Category
from utils.rate_limiter import rate_limit
from utils.cleanup import CleanupService
from datetime import datetime, timedelta
from sqlalchemy.exc import SQLAlchemyError
import smtplib
import re
import logging
from google.oauth2 import id_token as google_id_token
from google.auth.transport.requests import Request
from google.auth.exceptions import GoogleAuthError
import secrets

auth_bp = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"

def send_verification_email(mail, pending_user, otp):
    """Send verification email"""
    try:
        msg = Message(
            'Verify Your Email - ExpenseTracker',
            sender=current_app.config['MAIL_DEFAULT_SENDER'],
            recipients=[pending_user.email]
        )
        
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to ExpenseTracker!</h1>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9;">
                <h2>Hi {pending_user.name},</h2>
                <p>Thank you for signing up! Please verify your email address with the code below:</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0;">{otp}</h1>
                </div>
                
                <p><strong>This code will expire in 10 minutes.</strong></p>
                <p>If you didn't create an account, please ignore this email.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px; text-align: center;">
                        © 2025 ExpenseTracker. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
        """
        
        mail.send(msg)
        return True
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending verification email: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending verification email: {str(e)}")
        return False

@auth_bp.route('/register', methods=['POST'])
@rate_limit(limit=15, period=3600)
def register():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        if not all([name, email, password, confirm_password]):
            return jsonify({'error': 'All fields are required'}), 400
        
        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        valid, msg = validate_password(password)
        if not valid:
            return jsonify({'error': msg}), 400
        
        valid_email, email_msg = EmailValidator.validate_email(email)
        if not valid_email:
            return jsonify({'error': email_msg}), 400
        
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if PendingUser.query.filter_by(email=email).first():
            return jsonify({'error': 'Verification email already sent. Please check your inbox.'}), 400
        
        pending_user = PendingUser(
            name=name,
            email=email
        )
        pending_user.set_password(password)
        
        db.session.add(pending_user)
        db.session.flush()
        
        otp = EmailVerification.generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        verification = EmailVerification(
            pending_user_id=pending_user.id,
            otp=otp,
            expires_at=expires_at
        )
        
        db.session.add(verification)
        db.session.commit()
        
        if not send_verification_email(current_app.mail, pending_user, otp):
            db.session.rollback()
            return jsonify({'error': 'Failed to send verification email'}), 500
        
        logger.info(f"Registration pending for {email}")
        return jsonify({
            'message': 'Verification email sent',
            'user_id': pending_user.id
        }), 201
    
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during registration: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error during registration: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@auth_bp.route('/verify-email', methods=['POST'])
@rate_limit(limit=10, period=3600)
def verify_email():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        otp = data.get('otp')
        
        if not user_id or not otp:
            return jsonify({'error': 'User ID and OTP are required'}), 400
        
        pending_user = PendingUser.query.get(user_id)
        if not pending_user:
            return jsonify({'error': 'Invalid verification request'}), 400
        
        if pending_user.is_expired():
            db.session.delete(pending_user)
            db.session.commit()
            return jsonify({'error': 'Registration expired. Please register again.'}), 400
        
        verification = EmailVerification.query.filter_by(
            pending_user_id=pending_user.id
        ).order_by(EmailVerification.id.desc()).first()
        
        if not verification:
            return jsonify({'error': 'No verification code found'}), 400
        
        if verification.is_expired():
            return jsonify({'error': 'Verification code expired'}), 400
        
        if verification.attempts >= 3:
            return jsonify({'error': 'Maximum attempts exceeded'}), 429
        
        if verification.otp != otp:
            verification.increment_attempts()
            db.session.commit()
            return jsonify({'error': 'Invalid OTP'}), 400
        
        user = User(
            name=pending_user.name,
            email=pending_user.email,
            password_hash=pending_user.password_hash,
            is_verified=True
        )
        
        db.session.add(user)
        db.session.delete(pending_user)
        db.session.commit()
        
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        logger.info(f"Email verified for {user.email}")
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during verification: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error during verification: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@auth_bp.route('/resend-otp', methods=['POST'])
@rate_limit(limit=20, period=3600)
def resend_otp():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        pending_user = PendingUser.query.get(user_id)
        if not pending_user:
            return jsonify({'error': 'Invalid request'}), 400
        
        if pending_user.is_expired():
            db.session.delete(pending_user)
            db.session.commit()
            return jsonify({'error': 'Registration expired. Please register again.'}), 400
        
        if datetime.utcnow() - pending_user.last_otp_sent < timedelta(minutes=1):
            return jsonify({'error': 'Please wait before requesting another code'}), 429
        
        otp = EmailVerification.generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        verification = EmailVerification(
            pending_user_id=pending_user.id,
            otp=otp,
            expires_at=expires_at
        )
        
        db.session.add(verification)
        pending_user.last_otp_sent = datetime.utcnow()
        db.session.commit()
        
        if not send_verification_email(current_app.mail, pending_user, otp):
            return jsonify({'error': 'Failed to send verification email'}), 500
        
        logger.info(f"OTP resent for {pending_user.email}")
        return jsonify({'message': 'Verification code resent'}), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error resending OTP: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected error resending OTP: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@auth_bp.route('/login', methods=['POST'])
@rate_limit(limit=20, period=3600)
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        # Use generic error message for security (prevents email enumeration)
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        logger.info(f"Successful login for {email}")
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error during login: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500
    
    
@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    try:
        current_user = get_jwt_identity()
        access_token = create_access_token(identity=current_user)
        return jsonify({
            'access_token': access_token
        }), 200
    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        return jsonify({'error': 'Invalid refresh token'}), 401


@auth_bp.route('/forgot-password', methods=['POST'])
@rate_limit(limit=15, period=3600)
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'message': 'If an account exists, a reset link has been sent'}), 200
        
        token = PasswordResetToken.generate_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        
        db.session.add(reset_token)
        db.session.commit()
        
        try:
            msg = Message(
                'Reset Your Password - ExpenseTracker',
                sender=current_app.config['MAIL_DEFAULT_SENDER'],
                recipients=[email]
            )
            
            reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
            
            msg.html = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">ExpenseTracker Password Reset</h1>
                </div>
                <div style="padding: 30px; background-color: #f9f9f9;">
                    <h2>Hi {user.name},</h2>
                    <p>We received a request to reset your password. Click the button below to reset it:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #667eea;">{reset_url}</p>
                    
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, please ignore this email.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 12px; text-align: center;">
                            © 2025 ExpenseTracker. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
            """
            
            current_app.mail.send(msg)
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending reset email: {str(e)}")
            return jsonify({'error': 'Failed to send reset email'}), 500
        
        logger.info(f"Password reset requested for {email}")
        return jsonify({'message': 'If an account exists, a reset link has been sent'}), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error in forgot password: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in forgot password: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@auth_bp.route('/verify-reset-token', methods=['POST'])
@rate_limit(limit=20, period=3600)
def verify_reset_token():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token or reset_token.is_used or reset_token.is_expired():
            return jsonify({'error': 'Invalid or expired token'}), 400
        
        return jsonify({'message': 'Token is valid'}), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error verifying reset token: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected error verifying reset token: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
@rate_limit(limit=15, period=3600)
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not all([token, new_password, confirm_password]):
            return jsonify({'error': 'All fields are required'}), 400
        
        if new_password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        valid, msg = validate_password(new_password)
        if not valid:
            return jsonify({'error': msg}), 400
        
        reset_token = PasswordResetToken.query.filter_by(token=token).first()
        
        if not reset_token or reset_token.is_used or reset_token.is_expired():
            return jsonify({'error': 'Invalid or expired token'}), 400
        
        user = User.query.get(reset_token.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.set_password(new_password)
        reset_token.is_used = True
        
        db.session.commit()
        
        logger.info(f"Password reset successful for user {user.id}")
        return jsonify({'message': 'Password reset successful'}), 200
    
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error resetting password: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error resetting password: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching profile: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected error fetching profile: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@auth_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    try:
        user_id = get_jwt_identity()
        stats = {
            'total_expenses': Expense.query.filter_by(user_id=user_id).count(),
            'total_categories': Category.query.filter_by(user_id=user_id).count()
        }
        return jsonify(stats), 200
    
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching stats: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected stats error: {str(e)}")
        return jsonify({'error': 'Failed to get stats'}), 500

@auth_bp.route('/google', methods=['POST'])
@rate_limit(limit=20, period=3600)
def google_auth():
    try:
        data = request.get_json()
        id_token_str = data.get('id_token')
        if not id_token_str:
            return jsonify({'error': 'ID token is required'}), 400

        idinfo = google_id_token.verify_oauth2_token(
            id_token_str, Request(), current_app.config['GOOGLE_CLIENT_ID']
        )
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])
        email_verified = idinfo.get('email_verified', False)

        if not email_verified:
            return jsonify({'error': 'Email not verified by Google'}), 400

        valid, msg = EmailValidator.validate_email(email)
        if not valid:
            return jsonify({'error': msg}), 400

        user = User.query.filter_by(email=email).first()

        if user:
            if user.oauth_provider != 'google' or user.oauth_id != google_id:
                user.oauth_provider = 'google'
                user.oauth_id = google_id
                db.session.commit()
        else:
            user = User(
                name=name,
                email=email,
                is_verified=True,
                oauth_provider='google',
                oauth_id=google_id,
                password_hash=None
            )
            db.session.add(user)
            db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        logger.info(f"Google auth successful for {email}")
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200

    except (ValueError, GoogleAuthError) as e:
        logger.error(f"Google auth validation error: {str(e)}")
        return jsonify({'error': 'Invalid Google token'}), 401
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error in Google auth: {str(e)}")
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in Google auth: {str(e)}")
        return jsonify({'error': 'An unexpected error occurred'}), 500