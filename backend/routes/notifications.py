"""
Notifications Route — real-time in-app notifications
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import Notification

notif_bp = Blueprint('notifications', __name__)

@notif_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id  = get_jwt_identity()
    page     = request.args.get('page', 1, type=int)
    unread_only = request.args.get('unread', 'false').lower() == 'true'
    q = Notification.query.filter_by(user_id=user_id)
    if unread_only: q = q.filter_by(is_read=False)
    q = q.order_by(Notification.created_at.desc())
    p = q.paginate(page=page, per_page=20, error_out=False)
    return jsonify({'items': [n.to_dict() for n in p.items],
                    'unread_count': Notification.query.filter_by(user_id=user_id, is_read=False).count(),
                    'total': p.total, 'page': page, 'pages': p.pages})

@notif_bp.route('/read-all', methods=['POST'])
@jwt_required()
def mark_all_read():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'})

@notif_bp.route('/<int:notif_id>/read', methods=['PATCH'])
@jwt_required()
def mark_read(notif_id):
    user_id = get_jwt_identity()
    n = Notification.query.filter_by(id=notif_id, user_id=user_id).first_or_404()
    n.is_read = True
    db.session.commit()
    return jsonify(n.to_dict())

@notif_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def unread_count():
    user_id = get_jwt_identity()
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({'count': count})
