"""
Auth Routes — register, login, logout, email verification,
forgot/reset password, profile update, NGO badge request.
"""
import secrets, hashlib
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies
)
from database import db
from models import User, Notification, AuditLog
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

# In-memory OTP store (use Redis in production)
_otp_store = {}   # { email: { otp, expires, purpose } }


def _send_email(to, subject, body):
    """Send email if configured, otherwise log to console (dev mode)."""
    try:
        from flask_mail import Message
        from app import mail
        msg = Message(subject, recipients=[to], body=body)
        mail.send(msg)
        return True
    except Exception as e:
        print(f"[EMAIL] To: {to} | Subject: {subject}\n{body}\n(Not sent: {e})")
        return False


def _send_sms(to_number, message):
    """Send SMS via Twilio if configured, else log to console."""
    sid   = current_app.config.get('TWILIO_ACCOUNT_SID', '')
    token = current_app.config.get('TWILIO_AUTH_TOKEN', '')
    from_ = current_app.config.get('TWILIO_FROM_NUMBER', '')
    if sid and token and from_:
        try:
            from twilio.rest import Client
            Client(sid, token).messages.create(body=message, from_=from_, to=to_number)
            return True
        except Exception as e:
            print(f"[SMS] {e}")
    print(f"[SMS SIM] To: {to_number} | {message}")
    return False


def _generate_otp():
    return str(secrets.randbelow(900000) + 100000)   # 6-digit OTP


# ─── REGISTER ─────────────────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json or {}
    username  = data.get('username', '').strip()
    email     = data.get('email', '').strip().lower()
    password  = data.get('password', '')
    full_name = data.get('full_name', '').strip()
    phone     = data.get('phone', '').strip()

    if not username or not email or not password:
        return jsonify({'error': 'username, email and password are required'}), 400
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if '@' not in email:
        return jsonify({'error': 'Invalid email address'}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already taken'}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(username=username, email=email, full_name=full_name, phone=phone)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Send verification email
    otp = _generate_otp()
    _otp_store[email] = {'otp': otp, 'expires': datetime.utcnow() + timedelta(minutes=30), 'purpose': 'verify'}
    _send_email(email, 'Verify your CivicSense account',
        f"Hello {full_name or username},\n\nYour verification OTP is: {otp}\n\nThis expires in 30 minutes.\n\n— CivicSense Team")

    access_token  = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    refresh_token = create_refresh_token(identity=str(user.id))
    response = jsonify({'message': 'Account created. Check your email for verification OTP.',
                        'user': user.to_dict(public=False), 'access_token': access_token})
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    return response, 201


# ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
@auth_bp.route('/verify-email', methods=['POST'])
@jwt_required()
def verify_email():
    user_id = get_jwt_identity()
    user    = User.query.get_or_404(user_id)
    data    = request.json or {}
    otp     = data.get('otp', '').strip()

    record = _otp_store.get(user.email)
    if not record or record.get('purpose') != 'verify':
        return jsonify({'error': 'No verification request found. Please request a new OTP.'}), 400
    if datetime.utcnow() > record['expires']:
        _otp_store.pop(user.email, None)
        return jsonify({'error': 'OTP expired. Please request a new one.'}), 400
    if record['otp'] != otp:
        return jsonify({'error': 'Invalid OTP'}), 400

    user.is_verified = True
    user.reputation_score += 10   # bonus for verifying
    _otp_store.pop(user.email, None)
    db.session.add(Notification(user_id=user.id, type='verified',
        title='Email Verified! +10 Reputation', message='Your account is now verified.',
        link='/profile'))
    db.session.commit()
    return jsonify({'message': 'Email verified successfully!', 'user': user.to_dict(public=False)})


# ─── RESEND VERIFICATION OTP ──────────────────────────────────────────────────
@auth_bp.route('/resend-verification', methods=['POST'])
@jwt_required()
def resend_verification():
    user_id = get_jwt_identity()
    user    = User.query.get_or_404(user_id)
    if user.is_verified:
        return jsonify({'error': 'Email already verified'}), 400
    otp = _generate_otp()
    _otp_store[user.email] = {'otp': otp, 'expires': datetime.utcnow() + timedelta(minutes=30), 'purpose': 'verify'}
    _send_email(user.email, 'CivicSense — New Verification OTP',
        f"Your new OTP is: {otp}\n\nExpires in 30 minutes.\n\n— CivicSense Team")
    return jsonify({'message': 'Verification OTP sent to your email.'})


# ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data  = request.json or {}
    email = data.get('email', '').strip().lower()
    user  = User.query.filter_by(email=email).first()
    # Always return 200 to avoid email enumeration
    if user:
        otp = _generate_otp()
        _otp_store[email] = {'otp': otp, 'expires': datetime.utcnow() + timedelta(minutes=15), 'purpose': 'reset'}
        _send_email(email, 'CivicSense — Password Reset OTP',
            f"Your password reset OTP is: {otp}\n\nThis expires in 15 minutes.\n\nIf you did not request this, ignore this email.\n\n— CivicSense Team")
    return jsonify({'message': 'If that email is registered, an OTP has been sent.'})


# ─── RESET PASSWORD ───────────────────────────────────────────────────────────
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data         = request.json or {}
    email        = data.get('email', '').strip().lower()
    otp          = data.get('otp', '').strip()
    new_password = data.get('new_password', '')

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    record = _otp_store.get(email)
    if not record or record.get('purpose') != 'reset':
        return jsonify({'error': 'No reset request found for this email.'}), 400
    if datetime.utcnow() > record['expires']:
        _otp_store.pop(email, None)
        return jsonify({'error': 'OTP expired.'}), 400
    if record['otp'] != otp:
        return jsonify({'error': 'Invalid OTP'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.set_password(new_password)
    _otp_store.pop(email, None)
    db.session.add(AuditLog(user_id=user.id, action='password_reset', entity='user', entity_id=user.id))
    db.session.commit()
    return jsonify({'message': 'Password reset successfully. Please log in.'})


# ─── LOGIN ────────────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data       = request.json or {}
    identifier = data.get('identifier', '').strip()
    password   = data.get('password', '')
    if not identifier or not password:
        return jsonify({'error': 'identifier and password are required'}), 400

    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
    if not user.is_active:
        return jsonify({'error': 'Account is deactivated. Contact support.'}), 403

    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token  = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    refresh_token = create_refresh_token(identity=str(user.id))
    response = jsonify({'message': 'Login successful', 'user': user.to_dict(public=False), 'access_token': access_token})
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
    return response, 200


# ─── ME ───────────────────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user = User.query.get_or_404(get_jwt_identity())
    return jsonify(user.to_dict(public=False))


# ─── LOGOUT ───────────────────────────────────────────────────────────────────
@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = jsonify({'message': 'Logged out successfully'})
    unset_jwt_cookies(response)
    return response


# ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
@auth_bp.route('/profile', methods=['PATCH'])
@jwt_required()
def update_profile():
    user = User.query.get_or_404(get_jwt_identity())
    data = request.json or {}

    for field in ('full_name', 'bio', 'phone', 'city', 'state'):
        if field in data:
            setattr(user, field, data[field].strip() if data[field] else None)

    if data.get('new_password'):
        if not data.get('current_password'):
            return jsonify({'error': 'current_password is required'}), 400
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 401
        if len(data['new_password']) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400
        user.set_password(data['new_password'])

    db.session.commit()
    return jsonify({'message': 'Profile updated', 'user': user.to_dict(public=False)})


# ─── REQUEST NGO BADGE ────────────────────────────────────────────────────────
@auth_bp.route('/request-ngo-badge', methods=['POST'])
@jwt_required()
def request_ngo_badge():
    user = User.query.get_or_404(get_jwt_identity())
    data = request.json or {}
    org_name = data.get('org_name', '').strip()
    reg_no   = data.get('reg_no',   '').strip()
    website  = data.get('website',  '').strip()

    if not org_name or not reg_no:
        return jsonify({'error': 'org_name and reg_no are required'}), 400

    # Notify admins (in production, email admin team)
    admin_users = User.query.filter_by(role='admin').all()
    for admin in admin_users:
        db.session.add(Notification(user_id=admin.id, type='ngo_request',
            title=f'NGO Badge Request: {org_name}',
            message=f'{user.username} ({user.email}) requested NGO badge. Reg: {reg_no}. Website: {website}',
            link='/admin'))

    # Log request
    db.session.add(AuditLog(user_id=user.id, action='ngo_badge_request', entity='user', entity_id=user.id,
        detail=f'{org_name} | {reg_no} | {website}'))
    db.session.commit()
    return jsonify({'message': 'NGO badge request submitted. Admins will review within 3–5 working days.'})
