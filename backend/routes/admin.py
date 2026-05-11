"""
Admin Panel Route — issue moderation, user management, stats
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import User, Issue, Story, AuditLog

admin_bp = Blueprint('admin', __name__)


def require_admin():
    user_id = get_jwt_identity()
    u = User.query.get(user_id)
    if not u or u.role not in ('admin', 'authority'):
        return None, jsonify({'error': 'Admin access required'}), 403
    return u, None, None


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    u, err, code = require_admin()
    if err: return err, code
    page  = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    q = User.query
    if search:
        lk = f'%{search}%'
        q = q.filter(User.username.ilike(lk) | User.email.ilike(lk))
    p = q.order_by(User.created_at.desc()).paginate(page=page, per_page=20, error_out=False)
    return jsonify({'items': [u.to_dict(public=False) for u in p.items],
                    'total': p.total, 'pages': p.pages})


@admin_bp.route('/users/<int:uid>/toggle', methods=['PATCH'])
@jwt_required()
def toggle_user(uid):
    u, err, code = require_admin()
    if err: return err, code
    target = User.query.get_or_404(uid)
    target.is_active = not target.is_active
    db.session.commit()
    return jsonify({'is_active': target.is_active})


@admin_bp.route('/users/<int:uid>/role', methods=['PATCH'])
@jwt_required()
def change_role(uid):
    u, err, code = require_admin()
    if err: return err, code
    data = request.json or {}
    if data.get('role') not in ('citizen', 'authority', 'admin'):
        return jsonify({'error': 'Invalid role'}), 400
    target = User.query.get_or_404(uid)
    target.role = data['role']
    db.session.commit()
    return jsonify({'role': target.role})


@admin_bp.route('/issues/<int:iid>/moderate', methods=['PATCH'])
@jwt_required()
def moderate_issue(iid):
    u, err, code = require_admin()
    if err: return err, code
    issue = Issue.query.get_or_404(iid)
    data  = request.json or {}
    if data.get('action') == 'mark_duplicate':
        issue.is_duplicate = True
        issue.status = 'Duplicate'
    elif data.get('action') == 'restore':
        issue.is_duplicate = False
        issue.status = 'Reported'
    db.session.commit()
    return jsonify(issue.to_dict())


@admin_bp.route('/audit-log', methods=['GET'])
@jwt_required()
def audit_log():
    u, err, code = require_admin()
    if err: return err, code
    page = request.args.get('page', 1, type=int)
    logs = AuditLog.query.order_by(AuditLog.created_at.desc())\
        .paginate(page=page, per_page=50, error_out=False)
    return jsonify({'items': [{
        'id': l.id, 'user_id': l.user_id, 'action': l.action,
        'entity': l.entity, 'entity_id': l.entity_id,
        'detail': l.detail, 'ip_address': l.ip_address,
        'created_at': l.created_at.isoformat()
    } for l in logs.items], 'total': logs.total, 'pages': logs.pages})
