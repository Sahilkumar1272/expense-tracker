from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_mail import Message
from models import db, User, PendingUser, EmailVerification, EmailValidator, PasswordResetToken
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
                    <p style="color: #666; font-size: 12px;">
                        This email was sent from ExpenseTracker. 
                        Your registration will expire in 24 hours if not verified.
                    </p>
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <p style="color: #666;">Best regards,<br>ExpenseTracker Team</p>
                </div>
            </div>
        </div>
        """
        
        mail.send(msg)
        logger.info(f"Verification email sent to {pending_user.email}")
        return True
    except smtplib.SMTPException as e:
        logger.error(f"Email send error for {pending_user.email}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email for {pending_user.email}: {str(e)}")
        return False

def send_reset_password_email(mail, user, token):
    """Send password reset email"""
    try:
        if not current_app.config.get('FRONTEND_URL'):
            logger.error(f"FRONTEND_URL not configured for {user.email}")
            return False
        
        msg = Message(
            'Reset Your Password - ExpenseTracker',
            sender=current_app.config['MAIL_DEFAULT_SENDER'],
            recipients=[user.email]
        )
        
        reset_url = f"{current_app.config['FRONTEND_URL']}/reset-password?token={token}"
        
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">ExpenseTracker</h1>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9;">
                <h2>Hi {user.name},</h2>
                <p>We received a request to reset your password. Click the link below to reset it:</p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="{reset_url}" style="background-color: #667eea; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
                </div>
                
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request a password reset, please ignore this email.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        This email was sent from ExpenseTracker.
                    </p>
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <p style="color: #666;">Best regards,<br>ExpenseTracker Team</p>
                </div>
            </div>
        </div>
        """
        
        mail.send(msg)
        logger.info(f"Password reset email sent to {user.email}")
        return True
    except smtplib.SMTPException as e:
        logger.error(f"Email send error for {user.email}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending email for {user.email}: {str(e)}")
        return False

@auth_bp.route('/register', methods=['POST'])
@rate_limit(limit=5, period=3600)
def register():
    try:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')
        
        # Input validation
        if not all([name, email, password, confirm_password]):
            return jsonify({'error': 'All fields are required'}), 400
        
        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        # Validate email
        valid, msg = EmailValidator.validate_email(email)
        if not valid:
            return jsonify({'error': msg}), 400
        
        # Validate password
        valid, msg = validate_password(password)
        if not valid:
            return jsonify({'error': msg}), 400
        
        # Check for existing user or pending user
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if PendingUser.query.filter_by(email=email).first():
            return jsonify({'error': 'Email is pending verification'}), 400
        
        # Create pending user
        pending_user = PendingUser(
            name=name.strip(),
            email=email.strip()
        )
        pending_user.set_password(password)
        db.session.add(pending_user)
        db.session.commit()
        
        # Generate and store OTP
        otp = EmailVerification.generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        verification = EmailVerification(
            pending_user_id=pending_user.id,
            otp=otp,
            expires_at=expires_at
        )
        db.session.add(verification)
        db.session.commit()
        
        # Send verification email
        if not send_verification_email(current_app.mail, pending_user, otp):
            db.session.delete(pending_user)
            db.session.commit()
            return jsonify({'error': 'Failed to send verification email'}), 500
        
        logger.info(f"Registration initiated for {email}")
        return jsonify({
            'message': 'Verification email sent. Please check your inbox.',
            'user_id': pending_user.id
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during registration: {str(e)}")
        return jsonify({'error': 'Registration failed due to database issue'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/verify-email', methods=['POST'])
@rate_limit(limit=3, period=3600)
def verify_email():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        otp = data.get('otp')
        
        if not user_id or not otp:
            return jsonify({'error': 'User ID and OTP are required'}), 400
        
        pending_user = PendingUser.query.get(user_id)
        if not pending_user:
            return jsonify({'error': 'Invalid user ID or registration expired'}), 404
        
        verification = EmailVerification.query.filter_by(
            pending_user_id=user_id,
            otp=otp,
            is_used=False
        ).first()
        
        if not verification:
            return jsonify({'error': 'Invalid OTP'}), 400
        
        if verification.is_expired():
            return jsonify({'error': 'OTP has expired'}), 400
        
        if verification.attempts >= 3:
            return jsonify({'error': 'Maximum OTP attempts exceeded'}), 429
        
        verification.increment_attempts()
        db.session.commit()
        
        # Create actual user
        user = User(
            name=pending_user.name,
            email=pending_user.email,
            password_hash=pending_user.password_hash,
            is_verified=True
        )
        db.session.add(user)
        
        # Delete pending user and related verification codes
        EmailVerification.query.filter_by(pending_user_id=pending_user.id).delete()
        db.session.delete(pending_user)
        db.session.commit()
        
        # Generate JWT tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        logger.info(f"Email verified successfully for {user.email}")
        return jsonify({
            'message': 'Email verified successfully',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during email verification: {str(e)}")
        return jsonify({'error': 'Email verification failed due to database issue'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected verification error: {str(e)}")
        return jsonify({'error': 'Email verification failed'}), 500

@auth_bp.route('/resend-otp', methods=['POST'])
@rate_limit(limit=3, period=3600)
def resend_otp():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        pending_user = PendingUser.query.get(user_id)
        if not pending_user:
            return jsonify({'error': 'Invalid user ID or registration expired'}), 404
        
        if pending_user.is_expired():
            EmailVerification.query.filter_by(pending_user_id=pending_user.id).delete()
            db.session.delete(pending_user)
            db.session.commit()
            return jsonify({'error': 'Registration has expired. Please register again.'}), 400
        
        if not pending_user.can_resend_otp():
            return jsonify({'error': 'Please wait before requesting a new OTP'}), 429
        
        # Generate new OTP
        otp = EmailVerification.generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        verification = EmailVerification(
            pending_user_id=pending_user.id,
            otp=otp,
            expires_at=expires_at
        )
        
        # Delete old verification codes
        EmailVerification.query.filter_by(pending_user_id=pending_user.id).delete()
        db.session.add(verification)
        pending_user.last_otp_sent = datetime.utcnow()
        db.session.commit()
        
        # Send verification email
        if not send_verification_email(current_app.mail, pending_user, otp):
            return jsonify({'error': 'Failed to send verification email'}), 500
        
        logger.info(f"OTP resent to {pending_user.email}")
        return jsonify({'message': 'New OTP sent to your email'}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during OTP resend: {str(e)}")
        return jsonify({'error': 'Failed to resend OTP due to database issue'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected OTP resend error: {str(e)}")
        return jsonify({'error': 'Failed to resend OTP'}), 500

@auth_bp.route('/login', methods=['POST'])
@rate_limit(limit=10, period=3600)
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not user.is_verified:
            pending_user = PendingUser.query.filter_by(email=email).first()
            if pending_user:
                return jsonify({
                    'error': 'Please verify your email first',
                    'action': 'verify',
                    'user_id': pending_user.id
                }), 401
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        logger.info(f"Login successful for {email}")
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        logger.error(f"Database error during login: {str(e)}")
        return jsonify({'error': 'Login failed due to database issue'}), 500
    except Exception as e:
        logger.error(f"Unexpected login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
@rate_limit(limit=5, period=3600)
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Email not found'}), 404
        
        if not user.is_verified:
            return jsonify({'error': 'Please verify your email first'}), 401
        
        token = PasswordResetToken.generate_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        db.session.add(reset_token)
        db.session.commit()
        
        if not send_reset_password_email(current_app.mail, user, token):
            db.session.delete(reset_token)
            db.session.commit()
            return jsonify({'error': 'Failed to send password reset email'}), 500
        
        logger.info(f"Password reset requested for {email}")
        return jsonify({'message': 'Password reset email sent'}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during password reset request: {str(e)}")
        return jsonify({'error': 'Password reset request failed due to database issue'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error during password reset request: {str(e)}")
        return jsonify({'error': 'Password reset request failed'}), 500

@auth_bp.route('/verify-reset-token', methods=['POST'])
def verify_reset_token():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        reset_token = PasswordResetToken.query.filter_by(token=token, is_used=False).first()
        if not reset_token:
            return jsonify({'error': 'Invalid or used reset token'}), 400
        
        if reset_token.is_expired():
            return jsonify({'error': 'Reset token has expired'}), 400
        
        return jsonify({'message': 'Token is valid'}), 200
        
    except SQLAlchemyError as e:
        logger.error(f"Database error during token verification: {str(e)}")
        return jsonify({'error': 'Token verification failed due to database issue'}), 500
    except Exception as e:
        logger.error(f"Unexpected token verification error: {str(e)}")
        return jsonify({'error': 'Token verification failed'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        # Validate password
        valid, msg = validate_password(new_password)
        if not valid:
            return jsonify({'error': msg}), 400
        
        reset_token = PasswordResetToken.query.filter_by(token=token, is_used=False).first()
        if not reset_token:
            return jsonify({'error': 'Invalid or used reset token'}), 400
        
        if reset_token.is_expired():
            return jsonify({'error': 'Reset token has expired. Please request a new one.'}), 400
        
        user = User.query.get(reset_token.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user.set_password(new_password)
        reset_token.is_used = True
        db.session.commit()
        
        logger.info(f"Password reset successfully for {user.email}")
        return jsonify({'message': 'Password reset successfully'}), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during password reset: {str(e)}")
        return jsonify({'error': 'Password reset failed due to database issue'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error during password reset: {str(e)}")
        return jsonify({'error': 'Password reset failed. Please try again.'}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            logger.error(f"User not found for ID: {current_user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except SQLAlchemyError as e:
        logger.error(f"Database error during profile fetch for user_id {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to get profile due to database issue'}), 500
    except Exception as e:
        logger.error(f"Unexpected profile error for user_id {current_user_id}: {str(e)}")
        if str(e).lower().find('invalid token') != -1:
            return jsonify({'error': 'Invalid token'}), 401
        return jsonify({'error': 'Failed to get profile'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    try:
        user_id = get_jwt_identity()
        # Ensure user_id is a string for the new access token
        access_token = create_access_token(identity=str(user_id))
        return jsonify({'access_token': access_token}), 200
    except Exception as e:
        logger.error(f"Unexpected error during token refresh: {str(e)}")
        if str(e).lower().find('invalid token') != -1:
            return jsonify({'error': 'Invalid refresh token'}), 401
        return jsonify({'error': 'Token refresh failed'}), 500

@auth_bp.route('/cleanup', methods=['POST'])
@rate_limit(limit=15, period=3600)
def run_cleanup():
    """Manual cleanup endpoint (can be called by cron job)"""
    try:
        results = CleanupService.run_all_cleanup_tasks()
        logger.info(f"Cleanup completed: {results}")
        return jsonify({
            'message': 'Cleanup completed successfully',
            'results': results
        }), 200
    except SQLAlchemyError as e:
        logger.error(f"Database error during cleanup: {str(e)}")
        return jsonify({'error': 'Cleanup failed due to database issue'}), 500
    except Exception as e:
        logger.error(f"Unexpected cleanup error: {str(e)}")
        return jsonify({'error': 'Cleanup failed'}), 500

@auth_bp.route('/stats', methods=['GET'])
@rate_limit(limit=10, period=3600)
def get_stats():
    """Get system statistics"""
    try:
        stats = {
            'total_users': User.query.count(),
            'pending_registrations': PendingUser.query.count(),
            'active_verification_codes': EmailVerification.query.filter_by(is_used=False).count(),
            'expired_pending_users': PendingUser.query.filter(
                PendingUser.created_at < (datetime.utcnow() - timedelta(hours=24))
            ).count(),
            'active_reset_tokens': PasswordResetToken.query.filter_by(is_used=False).count()
        }
        logger.info(f"Stats retrieved: {stats}")
        return jsonify(stats), 200
    except SQLAlchemyError as e:
        logger.error(f"Database error during stats retrieval: {str(e)}")
        return jsonify({'error': 'Failed to get stats due to database issue'}), 500
    except Exception as e:
        logger.error(f"Unexpected stats error: {str(e)}")
        return jsonify({'error': 'Failed to get stats'}), 500

@auth_bp.route('/google', methods=['POST'])
@rate_limit(limit=10, period=3600)
def google_auth():
    try:
        data = request.get_json()
        id_token_str = data.get('id_token')
        if not id_token_str:
            return jsonify({'error': 'ID token is required'}), 400

        # Verify ID token
        idinfo = google_id_token.verify_oauth2_token(
            id_token_str, Request(), current_app.config['GOOGLE_CLIENT_ID']
        )
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', email.split('@')[0])  # Fallback to username from email
        email_verified = idinfo.get('email_verified', False)

        if not email_verified:
            return jsonify({'error': 'Email not verified by Google'}), 400

        # Validate email (reuse existing validator)
        valid, msg = EmailValidator.validate_email(email)
        if not valid:
            return jsonify({'error': msg}), 400

        # Check for existing user by email
        user = User.query.filter_by(email=email).first()

        if user:
            # Update OAuth details if not set or mismatched
            if user.oauth_provider != 'google' or user.oauth_id != google_id:
                user.oauth_provider = 'google'
                user.oauth_id = google_id
                db.session.commit()
        else:
            # Create new user
            user = User(
                name=name,
                email=email,
                is_verified=True,
                oauth_provider='google',
                oauth_id=google_id,
                password_hash=None  # No password for Google users
            )
            db.session.add(user)
            db.session.commit()

        # Generate JWT tokens
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