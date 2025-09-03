from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask_mail import Message
from models import db, User, EmailVerification
from datetime import datetime, timedelta
import re

auth_bp = Blueprint('auth', __name__)

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

def send_verification_email(mail, user, otp):
    """Send verification email"""
    try:
        msg = Message(
            'Verify Your Email - ExpenseTracker',
            sender='your-email@gmail.com',
            recipients=[user.email]
        )
        
        msg.html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Welcome to ExpenseTracker!</h1>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9;">
                <h2>Hi {user.name},</h2>
                <p>Thank you for signing up! Please verify your email address with the code below:</p>
                
                <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #667eea; font-size: 32px; letter-spacing: 5px; margin: 0;">{otp}</h1>
                </div>
                
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't create an account, please ignore this email.</p>
                
                <div style="margin-top: 30px; text-align: center;">
                    <p style="color: #666;">Best regards,<br>ExpenseTracker Team</p>
                </div>
            </div>
        </div>
        """
        
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Email send error: {str(e)}")
        return False

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'confirmPassword']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate password match
        if data['password'] != data['confirmPassword']:
            return jsonify({'error': 'Passwords do not match'}), 400
        
        # Validate password strength
        is_valid, message = validate_password(data['password'])
        if not is_valid:
            return jsonify({'error': message}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email'].lower()).first()
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 409
        
        # Create new user
        user = User(
            name=data['name'].strip(),
            email=data['email'].lower().strip()
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Generate and save OTP
        otp = EmailVerification.generate_otp()
        verification = EmailVerification(
            user_id=user.id,
            otp=otp,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        db.session.add(verification)
        db.session.commit()
        
        # Send verification email
        from app import mail
        if send_verification_email(mail, user, otp):
            return jsonify({
                'message': 'Registration successful! Please check your email for verification code.',
                'user_id': user.id
            }), 201
        else:
            return jsonify({'error': 'Registration successful but failed to send verification email'}), 201
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        otp = data.get('otp')
        
        if not user_id or not otp:
            return jsonify({'error': 'User ID and OTP are required'}), 400
        
        # Find verification record
        verification = EmailVerification.query.filter_by(
            user_id=user_id,
            otp=otp,
            is_used=False
        ).first()
        
        if not verification:
            return jsonify({'error': 'Invalid verification code'}), 400
        
        if verification.is_expired():
            return jsonify({'error': 'Verification code has expired'}), 400
        
        # Mark user as verified
        user = User.query.get(user_id)
        user.is_verified = True
        verification.is_used = True
        
        db.session.commit()
        
        # Generate access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Email verified successfully!',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        if not user.is_verified:
            return jsonify({'error': 'Please verify your email before logging in'}), 401
        
        # Generate access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.is_verified:
            return jsonify({'error': 'Email already verified'}), 400
        
        # Generate new OTP
        otp = EmailVerification.generate_otp()
        verification = EmailVerification(
            user_id=user.id,
            otp=otp,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        db.session.add(verification)
        db.session.commit()
        
        # Send verification email
        from app import mail
        if send_verification_email(mail, user, otp):
            return jsonify({'message': 'Verification code sent successfully'}), 200
        else:
            return jsonify({'error': 'Failed to send verification email'}), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500