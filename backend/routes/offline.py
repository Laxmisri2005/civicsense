"""
Module 3: Emergency Offline Communication – Sync Endpoint
Messages are composed locally (IndexedDB) and synced here when connectivity returns.
"""

from flask import Blueprint, request, jsonify
from database import db
from models import OfflineMessage

offline_bp = Blueprint('offline', __name__)

# Predefined emergency message templates
PREDEFINED_MESSAGES = [
    {"id": "need_food",    "label": "🍚 Need Food",         "text": "I need food urgently. Please help."},
    {"id": "need_water",   "label": "💧 Need Water",        "text": "I need clean drinking water."},
    {"id": "need_medical", "label": "🏥 Need Medical Help", "text": "I need urgent medical assistance."},
    {"id": "need_shelter", "label": "🏠 Need Shelter",      "text": "I need a safe place to stay."},
    {"id": "iam_safe",     "label": "✅ I Am Safe",         "text": "I am safe. Do not send help."},
    {"id": "need_rescue",  "label": "🆘 Need Rescue",       "text": "I am trapped. Please send rescue immediately."},
    {"id": "can_help",     "label": "🤝 I Can Help",        "text": "I am safe and can offer help to others nearby."},
]


# ─── GET predefined message templates ──────────────────────────────────────────
@offline_bp.route('/templates', methods=['GET'])
def get_templates():
    """Return the list of predefined emergency messages."""
    return jsonify(PREDEFINED_MESSAGES)


# ─── POST sync offline messages ────────────────────────────────────────────────
@offline_bp.route('/sync', methods=['POST'])
def sync_messages():
    """
    Receive a batch of offline-queued messages and store them.
    Frontend sends this when connectivity is restored.
    """
    data = request.json or {}
    messages = data.get('messages', [])

    if not isinstance(messages, list):
        return jsonify({'error': 'messages must be an array'}), 400

    saved = []
    for msg in messages:
        offline_msg = OfflineMessage(
            message_type = msg.get('message_type', 'custom'),
            custom_text  = msg.get('custom_text'),
            latitude     = msg.get('latitude'),
            longitude    = msg.get('longitude'),
            device_id    = msg.get('device_id'),
        )
        db.session.add(offline_msg)
        saved.append(offline_msg)

    db.session.commit()
    return jsonify({
        'synced': len(saved),
        'message': f'{len(saved)} emergency message(s) synced successfully.'
    }), 201


# ─── GET nearby synced messages ────────────────────────────────────────────────
@offline_bp.route('/nearby', methods=['GET'])
def get_nearby_messages():
    """Return recently synced messages (simulate nearby discovery)."""
    messages = OfflineMessage.query.order_by(OfflineMessage.synced_at.desc()).limit(50).all()
    return jsonify([m.to_dict() for m in messages])
