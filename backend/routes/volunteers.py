"""
Volunteer Coordination Module
Create missions, enroll, track skills, complete missions
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import VolunteerMission, VolunteerEnrollment, User, UserBadge, Badge, Notification
from datetime import datetime

volunteers_bp = Blueprint('volunteers', __name__)

MISSION_TYPES = ['Flood Relief', 'Earthquake Response', 'Medical Camp',
                 'Food Distribution', 'Road Cleanup', 'Tree Plantation',
                 'Shelter Setup', 'Education Drive', 'Blood Donation', 'Other']


@volunteers_bp.route('/', methods=['GET'])
def get_missions():
    status = request.args.get('status', '')
    mtype  = request.args.get('type', '')
    q = VolunteerMission.query
    if status: q = q.filter_by(status=status)
    if mtype:  q = q.filter_by(mission_type=mtype)
    missions = q.order_by(VolunteerMission.created_at.desc()).all()
    return jsonify([m.to_dict() for m in missions])


@volunteers_bp.route('/<int:mid>', methods=['GET'])
def get_mission(mid):
    m = VolunteerMission.query.get_or_404(mid)
    data = m.to_dict()
    data['enrollments'] = [e.to_dict() for e in m.enrollments]
    return jsonify(data)


@volunteers_bp.route('/', methods=['POST'])
@jwt_required()
def create_mission():
    user_id = get_jwt_identity()
    data = request.json or {}
    if not data.get('title') or not data.get('description'):
        return jsonify({'error': 'title and description required'}), 400

    m = VolunteerMission(
        title        = data['title'],
        description  = data['description'],
        mission_type = data.get('mission_type', 'Other'),
        location_text= data.get('location_text'),
        latitude     = data.get('latitude'),
        longitude    = data.get('longitude'),
        max_volunteers = data.get('max_volunteers', 20),
        start_date   = datetime.fromisoformat(data['start_date']) if data.get('start_date') else None,
        end_date     = datetime.fromisoformat(data['end_date'])   if data.get('end_date')   else None,
        organizer_id = user_id,
    )
    db.session.add(m)
    db.session.commit()
    return jsonify(m.to_dict()), 201


@volunteers_bp.route('/<int:mid>/enroll', methods=['POST'])
@jwt_required()
def enroll(mid):
    user_id = get_jwt_identity()
    m = VolunteerMission.query.get_or_404(mid)

    if m.status != 'Open':
        return jsonify({'error': 'Mission is not open for enrollment'}), 400
    if len(m.enrollments) >= m.max_volunteers:
        return jsonify({'error': 'Mission is full'}), 400
    if VolunteerEnrollment.query.filter_by(mission_id=mid, user_id=user_id).first():
        return jsonify({'error': 'Already enrolled'}), 409

    data = request.json or {}
    e = VolunteerEnrollment(mission_id=mid, user_id=user_id, skills=data.get('skills', ''))
    db.session.add(e)

    # Update user stats
    u = User.query.get(user_id)
    if u:
        u.helps_given      += 1
        u.reputation_score += 10
        _check_and_award_badges(u)

    # Notify organizer
    if m.organizer_id and m.organizer_id != int(user_id):
        db.session.add(Notification(
            user_id=m.organizer_id, type='volunteer_enrolled',
            title=f'New volunteer joined "{m.title}"',
            message=f'{u.username if u else "Someone"} enrolled in your mission.',
            link='/volunteers'
        ))

    db.session.commit()
    return jsonify(e.to_dict()), 201


@volunteers_bp.route('/<int:mid>/complete', methods=['PATCH'])
@jwt_required()
def complete_mission(mid):
    user_id = get_jwt_identity()
    m = VolunteerMission.query.get_or_404(mid)
    if str(m.organizer_id) != str(user_id):
        return jsonify({'error': 'Only the organizer can complete the mission'}), 403
    m.status = 'Completed'
    db.session.commit()
    return jsonify(m.to_dict())


@volunteers_bp.route('/types', methods=['GET'])
def get_types():
    return jsonify(MISSION_TYPES)


def _check_and_award_badges(user):
    """Award badges based on current stats."""
    metrics = {
        'issue':     user.issues_reported,
        'help':      user.helps_given,
        'rep':       user.reputation_score,
    }
    existing = {ub.badge_id for ub in UserBadge.query.filter_by(user_id=user.id).all()}
    for badge in Badge.query.filter(Badge.metric.in_(list(metrics.keys()))).all():
        if badge.id not in existing and metrics.get(badge.metric, 0) >= badge.threshold:
            db.session.add(UserBadge(user_id=user.id, badge_id=badge.id))
            db.session.add(Notification(
                user_id=user.id, type='badge_earned',
                title=f'🏅 Badge Earned: {badge.name}!',
                message=badge.description, link='/profile'
            ))
