"""
Analytics & Authority Dashboard Route
Provides charts data: resolution rates, category breakdown, time series, heatmap points
"""
from flask import Blueprint, jsonify, request
from database import db
from models import Issue, HelpRequest, Story, User, OfflineMessage
from sqlalchemy import func
from datetime import datetime, timedelta

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/dashboard', methods=['GET'])
def dashboard():
    """Complete analytics for the authority dashboard."""
    # Overall counts
    total_issues   = Issue.query.count()
    resolved       = Issue.query.filter_by(status='Resolved').count()
    in_progress    = Issue.query.filter(Issue.status.in_(['In Progress', 'Under Review'])).count()
    high_priority  = Issue.query.filter(Issue.priority.in_(['High Priority', 'Critical'])).count()
    total_users    = User.query.count()
    total_help     = HelpRequest.query.count()
    help_fulfilled = HelpRequest.query.filter_by(is_fulfilled=True).count()
    sos_messages   = OfflineMessage.query.count()

    # Issues by category
    by_category = db.session.query(Issue.category, func.count(Issue.id).label('count'))\
        .group_by(Issue.category).order_by(func.count(Issue.id).desc()).all()

    # Issues by status
    by_status = db.session.query(Issue.status, func.count(Issue.id).label('count'))\
        .group_by(Issue.status).all()

    # Issues by priority
    by_priority = db.session.query(Issue.priority, func.count(Issue.id).label('count'))\
        .group_by(Issue.priority).all()

    # Time series: issues created per day (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_issues = db.session.query(
        func.date(Issue.created_at).label('date'),
        func.count(Issue.id).label('count')
    ).filter(Issue.created_at >= thirty_days_ago)\
     .group_by(func.date(Issue.created_at))\
     .order_by(func.date(Issue.created_at)).all()

    # Resolution time (average days between created_at and resolved_at)
    resolved_issues = Issue.query.filter(
        Issue.resolved_at.isnot(None), Issue.created_at.isnot(None)
    ).all()
    if resolved_issues:
        avg_days = sum(
            (i.resolved_at - i.created_at).days for i in resolved_issues
        ) / len(resolved_issues)
    else:
        avg_days = 0

    # Geo heatmap points (issues with coordinates)
    geo_issues = Issue.query.filter(
        Issue.latitude.isnot(None), Issue.longitude.isnot(None)
    ).with_entities(Issue.latitude, Issue.longitude, Issue.priority, Issue.status).all()

    return jsonify({
        'summary': {
            'total_issues':    total_issues,
            'resolved':        resolved,
            'in_progress':     in_progress,
            'high_priority':   high_priority,
            'resolution_rate': round(resolved / total_issues * 100, 1) if total_issues else 0,
            'avg_resolution_days': round(avg_days, 1),
            'total_users':     total_users,
            'total_help':      total_help,
            'help_fulfilled':  help_fulfilled,
            'sos_messages':    sos_messages,
        },
        'by_category': [{'category': c, 'count': n} for c, n in by_category],
        'by_status':   [{'status':   s, 'count': n} for s, n in by_status],
        'by_priority': [{'priority': p, 'count': n} for p, n in by_priority],
        'daily_issues':[{'date': str(d), 'count': n} for d, n in daily_issues],
        'heatmap': [
            {'lat': lat, 'lng': lng, 'priority': pri, 'status': st}
            for lat, lng, pri, st in geo_issues
        ],
    })


@analytics_bp.route('/ward/<ward>', methods=['GET'])
def ward_analytics(ward):
    """Per-ward analytics for municipal use."""
    issues = Issue.query.filter_by(ward=ward).all()
    by_cat = db.session.query(Issue.category, func.count(Issue.id))\
        .filter_by(ward=ward).group_by(Issue.category).all()
    return jsonify({
        'ward': ward,
        'total': len(issues),
        'resolved': sum(1 for i in issues if i.status == 'Resolved'),
        'by_category': [{'category': c, 'count': n} for c, n in by_cat],
    })
