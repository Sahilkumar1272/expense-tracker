from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message
from models import db, User, PendingUser, EmailVerification, EmailValidator, PasswordResetToken
from utils.rate_limiter import rate_limit
from utils.cleanup import CleanupService
from datetime import datetime, timedelta
from sqlalchemy.exc import SQLAlchemyError
import smtplib
import re
import logging

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
                <h1 style="color: white; margin: 0;">ExpenseTracker Password Reset</h1>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9;">
                <h2>Hi {user.name},</h2>
                <p>We received a request to reset your password. Click the button below to reset it:</p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <a href="{reset_url}" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
                </div>
                
                <p>Or copy and paste this link: <a href="{reset_url}">{reset_url}</a></p>
                
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
        logger.info(f"Password reset email sent to {user.email} with token {token}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP authentication error for {user.email}: {str(e)}")
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error for {user.email}: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending reset email for {user.email}: {str(e)}")
        return False


@auth_bp.route('/register', methods=['POST'])
@rate_limit(max_attempts=15, window_hours=1, endpoint_name='register')
def register():
    try:
        data = request.get_json()
        
        required_fields = ['name', 'email', 'password', 'confirmPassword']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        if data['password'] != data['confirmPassword']:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        is_valid, message = validate_password(data['password'])
        if not is_valid:
            return jsonify({'error': message}), 400
        
        email = data['email'].lower().strip()
        name = data['name'].strip()
        
        if len(name) < 2:
            return jsonify({'error': 'Name must be at least 2 characters long'}), 400
        
        if len(name) > 100:
            return jsonify({'error': 'Name is too long (maximum 100 characters)'}), 400
        
        is_email_valid, email_message = EmailValidator.validate_email(email)
        if not is_email_valid:
            return jsonify({'error': email_message}), 400
        
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already registered and verified'}), 409
        
        pending_user = PendingUser.query.filter_by(email=email).first()
        if pending_user:
            if not pending_user.is_expired():
                pending_user.name = name
                pending_user.set_password(data['password'])
                pending_user.created_at = datetime.utcnow()
                pending_user.otp_attempts = 0
                EmailVerification.query.filter_by(pending_user_id=pending_user.id).delete()
            else:
                db.session.delete(pending_user)
                db.session.commit()
                pending_user = None
        
        if not pending_user:
            pending_user = PendingUser(
                name=name,
                email=email
            )
            pending_user.set_password(data['password'])
            db.session.add(pending_user)
        
        db.session.commit()
        
        otp = EmailVerification.generate_otp()
        verification = EmailVerification(
            pending_user_id=pending_user.id,
            otp=otp,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        db.session.add(verification)
        pending_user.last_otp_sent = datetime.utcnow()
        db.session.commit()
        
        if send_verification_email(current_app.mail, pending_user, otp):
            logger.info(f"User {email} registered successfully, verification email sent")
            return jsonify({
                'message': 'Registration initiated! Please check your email for verification code.',
                'user_id': pending_user.id,
                'expires_in_hours': 24
            }), 201
        else:
            db.session.delete(pending_user)
            db.session.commit()
            logger.error(f"Failed to send verification email for {email}")
            return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500
            
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during registration for {email}: {str(e)}")
        return jsonify({'error': 'Registration failed due to database issue. Please try again.'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected registration error for {email}: {str(e)}")
        return jsonify({'error': 'Registration failed. Please try again.'}), 500

@auth_bp.route('/verify-email', methods=['POST'])
@rate_limit(max_attempts=20, window_hours=1, endpoint_name='verify_email')
def verify_email():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        otp = data.get('otp')
        
        if not user_id or not otp:
            return jsonify({'error': 'User ID and OTP are required'}), 400
        
        if len(otp) != 6 or not otp.isdigit():
            return jsonify({'error': 'OTP must be a 6-digit number'}), 400
        
        verification = EmailVerification.query.filter_by(
            pending_user_id=user_id,
            otp=otp,
            is_used=False
        ).first()
        
        if not verification:
            existing_verification = EmailVerification.query.filter_by(
                pending_user_id=user_id,
                is_used=False
            ).first()
            if existing_verification:
                existing_verification.increment_attempts()
                db.session.commit()
            return jsonify({'error': 'Invalid verification code'}), 400
        
        if verification.attempts >= 5:
            return jsonify({'error': 'Too many failed attempts. Please request a new code.'}), 400
        
        if verification.is_expired():
            return jsonify({'error': 'Verification code has expired. Please request a new one.'}), 400
        
        pending_user = PendingUser.query.get(user_id)
        if not pending_user:
            return jsonify({'error': 'Pending registration not found'}), 404
        
        if pending_user.is_expired():
            db.session.delete(pending_user)
            db.session.commit()
            return jsonify({'error': 'Registration has expired. Please register again.'}), 410
        
        user = User(
            name=pending_user.name,
            email=pending_user.email,
            password_hash=pending_user.password_hash,
            is_verified=True
        )
        
        db.session.add(user)
        
        verification.is_used = True
        EmailVerification.query.filter_by(pending_user_id=pending_user.id).delete()
        db.session.delete(pending_user)
        
        db.session.commit()
        
        access_token = create_access_token(identity=user.id)
        
        logger.info(f"User {user.email} successfully verified and created account")
        
        return jsonify({
            'message': 'Email verified successfully! Account created.',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during verification for user_id {user_id}: {str(e)}")
        return jsonify({'error': 'Verification failed due to database issue. Please try again.'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected verification error for user_id {user_id}: {str(e)}")
        return jsonify({'error': 'Verification failed. Please try again.'}), 500

@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_attempts=20, window_hours=1, endpoint_name='login')
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            pending_user = PendingUser.query.filter_by(email=email).first()
            if pending_user and not pending_user.is_expired():
                return jsonify({
                    'error': 'Please verify your email before logging in. Check your inbox for verification code.',
                    'action': 'verify',
                    'user_id': pending_user.id
                }), 401
            else:
                return jsonify({'error': 'Invalid email or password'}), 401
        
        access_token = create_access_token(identity=user.id)
        
        logger.info(f"User {user.email} logged in successfully")
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except SQLAlchemyError as e:
        logger.error(f"Database error during login for {email}: {str(e)}")
        return jsonify({'error': 'Login failed due to database issue. Please try again.'}), 500
    except Exception as e:
        logger.error(f"Unexpected login error for {email}: {str(e)}")
        return jsonify({'error': 'Login failed. Please try again.'}), 500

@auth_bp.route('/resend-otp', methods=['POST'])
@rate_limit(max_attempts=13, window_hours=1, endpoint_name='resend_otp')
def resend_otp():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        pending_user = PendingUser.query.get(user_id)
        if not pending_user:
            return jsonify({'error': 'Pending registration not found'}), 404
        
        if pending_user.is_expired():
            db.session.delete(pending_user)
            db.session.commit()
            return jsonify({'error': 'Registration has expired. Please register again.'}), 410
        
        if not pending_user.can_resend_otp():
            return jsonify({'error': 'Please wait before requesting another code'}), 429
        
        otp = EmailVerification.generate_otp()
        EmailVerification.query.filter_by(pending_user_id=pending_user.id).delete()
        
        verification = EmailVerification(
            pending_user_id=pending_user.id,
            otp=otp,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        db.session.add(verification)
        pending_user.last_otp_sent = datetime.utcnow()
        db.session.commit()
        
        if send_verification_email(current_app.mail, pending_user, otp):
            logger.info(f"Resent verification email to {pending_user.email}")
            return jsonify({'message': 'Verification code sent successfully'}), 200
        else:
            logger.error(f"Failed to resend verification email for {pending_user.email}")
            return jsonify({'error': 'Failed to send verification email'}), 500
            
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during OTP resend for user_id {user_id}: {str(e)}")
        return jsonify({'error': 'Failed to resend code due to database issue. Please try again.'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error during OTP resend for user_id {user_id}: {str(e)}")
        return jsonify({'error': 'Failed to resend code. Please try again.'}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
@rate_limit(max_attempts=15, window_hours=1, endpoint_name='forgot_password')
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Email not found'}), 404
        
        if not user.is_verified:
            return jsonify({'error': 'Please verify your email before resetting password'}), 401
        
        # Invalidate previous reset tokens
        PasswordResetToken.query.filter_by(user_id=user.id, is_used=False).delete()
        
        # Generate new reset token
        token = PasswordResetToken.generate_token()
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        
        db.session.add(reset_token)
        db.session.commit()
        
        if send_reset_password_email(current_app.mail, user, token):
            logger.info(f"Password reset email sent to {user.email}")
            return jsonify({'message': 'Password reset link sent to your email'}), 200
        else:
            db.session.delete(reset_token)
            db.session.commit()
            logger.error(f"Failed to send password reset email for {user.email}")
            return jsonify({'error': 'Failed to send reset email. Please try again.'}), 500
            
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Database error during forgot password for {email}: {str(e)}")
        return jsonify({'error': 'Failed to process request due to database issue'}), 500
    except Exception as e:
        db.session.rollback()
        logger.error(f"Unexpected error during forgot password for {email}: {str(e)}")
        return jsonify({'error': 'Failed to process request. Please try again.'}), 500

@auth_bp.route('/verify-reset-token', methods=['POST'])
@rate_limit(max_attempts=15, window_hours=1, endpoint_name='verify_reset_token')
def verify_reset_token():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        reset_token = PasswordResetToken.query.filter_by(token=token, is_used=False).first()
        if not reset_token:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        if reset_token.is_expired():
            return jsonify({'error': 'Reset token has expired. Please request a new one.'}), 400
        
        user = User.query.get(reset_token.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'message': 'Reset token is valid',
            'user_id': user.id
        }), 200
        
    except SQLAlchemyError as e:
        logger.error(f"Database error during reset token verification: {str(e)}")
        return jsonify({'error': 'Verification failed due to database issue'}), 500
    except Exception as e:
        logger.error(f"Unexpected error during reset token verification: {str(e)}")
        return jsonify({'error': 'Verification failed. Please try again.'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
@rate_limit(max_attempts=15, window_hours=1, endpoint_name='reset_password')
def reset_password():
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')
        
        if not token or not new_password or not confirm_password:
            return jsonify({'error': 'Token, new password, and confirm password are required'}), 400
        
        if new_password != confirm_password:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        is_valid, message = validate_password(new_password)
        if not is_valid:
            return jsonify({'error': message}), 400
        
        reset_token = PasswordResetToken.query.filter_by(token=token, is_used=False).first()
        if not reset_token:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
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
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except SQLAlchemyError as e:
        logger.error(f"Database error during profile fetch for user_id {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to get profile due to database issue'}), 500
    except Exception as e:
        logger.error(f"Unexpected profile error for user_id {current_user_id}: {str(e)}")
        return jsonify({'error': 'Failed to get profile'}), 500

@auth_bp.route('/cleanup', methods=['POST'])
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