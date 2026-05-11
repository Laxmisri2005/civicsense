"""
Civic Issue Reporting — Production Grade
Real categories based on actual Indian civic problems.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from database import db
from models import Issue, Comment, IssueUpvote, Notification, User, AuditLog
import os, uuid
from datetime import datetime
from werkzeug.utils import secure_filename

issues_bp = Blueprint('issues', __name__)

CATEGORIES = {
    'Road & Infrastructure': [
        'Pothole', 'Road Damage', 'Broken Divider', 'Damaged Speed Breaker',
        'No Road Signage', 'Damaged Footpath', 'Broken Curb', 'Bridge Damage',
        'Flyover Damage', 'Unpaved Road', 'Road Cave-in', 'Damaged Road Marking'
    ],
    'Water Supply': [
        'No Water Supply', 'Low Water Pressure', 'Dirty / Contaminated Water',
        'Broken Water Pipeline', 'Water Meter Issue', 'Illegal Water Connection',
        'Water Wastage by Tanker', 'Water Main Burst', 'Sewage Mixed in Water'
    ],
    'Drainage & Sewage': [
        'Drain Overflow', 'Blocked Drain', 'Open Drain', 'Sewage Spill on Road',
        'Broken Manhole', 'Missing Manhole Cover', 'Water Logging',
        'Flooding in Colony', 'Sewage Smell', 'Storm Drain Blocked'
    ],
    'Electricity': [
        'Street Light Not Working', 'Street Light Damaged', 'Exposed Wires',
        'Power Pole Leaning', 'Transformer Fault', 'Frequent Power Cut',
        'Overloaded Electric Line', 'Illegal Electric Connection',
        'Meter Tampering', 'Electric Sparks from Pole'
    ],
    'Sanitation & Waste': [
        'Garbage Not Collected', 'Overflowing Dustbin', 'Open Garbage Dump',
        'Littering in Public Area', 'Burning of Waste', 'Dead Animal Not Removed',
        'No Dustbins in Area', 'Waste Dumping in Drain', 'Hospital Waste Dumped',
        'Rotting Waste Pile', 'Plastic Waste Accumulation'
    ],
    'Pollution': [
        'Air Pollution — Factory Smoke', 'Air Pollution — Vehicle Emissions',
        'Water Body Pollution', 'Soil Pollution', 'Noise Pollution — Construction',
        'Noise Pollution — Loudspeaker', 'Industrial Chemical Discharge',
        'Burning of Crop Stubble', 'Oil Spill', 'Sewage into River or Lake'
    ],
    'Public Safety': [
        'Stray Dog / Animal Attack Risk', 'Unsafe Abandoned Building',
        'Broken Wall or Fence', 'Unlit Dark Area', 'Dangerous Open Plot',
        'Fallen Tree Blocking Road', 'Landslide Risk', 'Fire Hazard',
        'Drunk and Disorderly', 'Suspicious Activity'
    ],
    'Parks & Public Spaces': [
        'Park Not Maintained', 'Broken Park Equipment', 'No Lighting in Park',
        'Encroachment of Park Land', 'No Toilet in Park', 'Stagnant Water in Park',
        'Damaged Playground', 'No Seating in Public Space', 'Defacement of Public Property'
    ],
    'Encroachment': [
        'Footpath Encroachment', 'Road Encroachment by Shop', 'Hawker on Footpath',
        'Illegal Parking on Road', 'Illegal Construction', 'Encroachment of Govt Land',
        'Blocking of Emergency Access', 'Encroachment of Storm Drain'
    ],
    'Government Services': [
        'Birth Certificate Delay', 'Death Certificate Delay', 'Ration Card Issue',
        'Aadhaar Update Problem', 'Pension Not Received', 'MNREGA Wages Not Paid',
        'Scholarship Not Released', 'Government Office Closed', 'Bribery / Corruption'
    ],
    'Transport & Traffic': [
        'No Bus Stop', 'Damaged Bus Shelter', 'Bus Not Running on Route',
        'No Traffic Signal', 'Broken Traffic Signal', 'No Zebra Crossing',
        'Rash Driving Spot', 'Accident Black Spot', 'No Speed Breaker Near School'
    ],
    'Healthcare': [
        'Government Hospital Closed', 'No Doctor Available', 'Medicine Shortage',
        'Ambulance Not Available', 'Unclean Hospital', 'No Toilet in Hospital',
        'Medicine Overpriced at Govt Pharmacy', 'Fake Medical Practitioner'
    ],
    'Education': [
        'Government School in Poor Condition', 'No Teacher Available',
        'School Toilet Not Working', 'No Drinking Water in School',
        'Mid-Day Meal Issue', 'Child Labour Spotted', 'Out-of-School Children'
    ],
    'Animal & Wildlife': [
        'Stray Dog Menace', 'Stray Cattle on Road', 'Wild Animal Sighting',
        'Dead Animal Not Removed', 'Animal Cruelty', 'Illegal Slaughter',
        'Bird Trap Found', 'Animal Abandonment'
    ],
    'Disaster & Emergency': [
        'Flood Damage to Property', 'Building Collapse', 'Fire Incident',
        'Gas Leak', 'Chemical Spill', 'Earthquake Damage',
        'Cyclone Damage', 'Landslide', 'Tree Fallen on House'
    ],
    'Other': ['Other Civic Issue']
}

HIGH_PRIORITY_THRESHOLD = 10
CRITICAL_THRESHOLD      = 25

DEPARTMENTS = {
    'Road & Infrastructure': 'Municipal Roads & Infrastructure Department',
    'Water Supply':          'Water Supply & Sewerage Board',
    'Drainage & Sewage':     'Drainage & Storm Water Department',
    'Electricity':           'State Electricity Distribution Company',
    'Sanitation & Waste':    'Solid Waste Management Department',
    'Pollution':             'Pollution Control Board',
    'Public Safety':         'Municipal Safety & Security Department',
    'Parks & Public Spaces': 'Parks & Horticulture Department',
    'Encroachment':          'Town Planning & Enforcement Wing',
    'Government Services':   'Collector / District Administration',
    'Transport & Traffic':   'Traffic Police & Transport Department',
    'Healthcare':            'District Health & Family Welfare Department',
    'Education':             'District Education Office',
    'Animal & Wildlife':     'Animal Husbandry & Wildlife Department',
    'Disaster & Emergency':  'District Disaster Management Authority',
    'Other':                 'General Administration / Municipal Office',
}


def allowed_file(fn):
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def get_user_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None

def get_ip():
    return request.headers.get('X-Forwarded-For', request.remote_addr)

def log_audit(user_id, action, entity, entity_id, detail=None):
    db.session.add(AuditLog(user_id=user_id, action=action, entity=entity,
                            entity_id=entity_id, detail=detail, ip_address=get_ip()))


@issues_bp.route('/', methods=['GET'])
def get_issues():
    page     = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 12, type=int), 50)
    status   = request.args.get('status')
    category = request.args.get('category')
    priority = request.args.get('priority')
    search   = request.args.get('search', '').strip()
    sort     = request.args.get('sort', 'newest')

    q = Issue.query
    if status:   q = q.filter_by(status=status)
    if category: q = q.filter_by(category=category)
    if priority: q = q.filter_by(priority=priority)
    if search:
        lk = f'%{search}%'
        q = q.filter(db.or_(Issue.title.ilike(lk), Issue.description.ilike(lk),
                             Issue.location_text.ilike(lk), Issue.tags.ilike(lk)))
    if sort == 'upvotes':    q = q.order_by(Issue.upvotes.desc())
    elif sort == 'views':    q = q.order_by(Issue.views.desc())
    else:                    q = q.order_by(Issue.created_at.desc())

    p = q.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({'items': [i.to_dict() for i in p.items],
                    'total': p.total, 'page': page, 'pages': p.pages, 'per_page': per_page})


@issues_bp.route('/<int:issue_id>', methods=['GET'])
def get_issue(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    issue.views += 1
    db.session.commit()
    data = issue.to_dict()
    data['comments'] = [c.to_dict() for c in issue.comments if c.parent_id is None and not c.is_deleted]
    return jsonify(data)


@issues_bp.route('/', methods=['POST'])
def create_issue():
    if request.content_type and 'multipart' in request.content_type:
        data = request.form
    else:
        data = request.json or {}

    errors = []
    if not data.get('title'):       errors.append('title is required')
    if not data.get('description'): errors.append('description is required')
    if not data.get('category'):    errors.append('category is required')
    if len(data.get('title', '')) > 200: errors.append('title max 200 chars')
    if errors: return jsonify({'errors': errors}), 400

    user_id = get_user_id()
    img1 = img2 = None
    files = request.files.getlist('image')
    for i, f in enumerate(files[:2]):
        if f and allowed_file(f.filename):
            fname = f"{uuid.uuid4().hex}_{secure_filename(f.filename)}"
            f.save(os.path.join(current_app.config['UPLOAD_FOLDER'], fname))
            if i == 0: img1 = f"/uploads/{fname}"
            else:      img2 = f"/uploads/{fname}"

    issue = Issue(
        title=data['title'].strip(), description=data['description'].strip(),
        category=data['category'], subcategory=data.get('subcategory'),
        latitude=data.get('latitude') or None, longitude=data.get('longitude') or None,
        location_text=data.get('location_text', '').strip() or None,
        ward=data.get('ward'), pincode=data.get('pincode'),
        image_url=img1, image_url_2=img2,
        is_anonymous=str(data.get('is_anonymous', 'true')).lower() in ('true', '1'),
        reporter_name=data.get('reporter_name', '').strip() or None,
        user_id=user_id, tags=data.get('tags', ''),
        assigned_to=DEPARTMENTS.get(data.get('category', ''), 'General Administration'),
    )
    db.session.add(issue)
    if user_id:
        u = User.query.get(user_id)
        if u: u.issues_reported += 1; u.reputation_score += 5
    db.session.commit()
    log_audit(user_id, 'create_issue', 'issue', issue.id, issue.title)
    db.session.commit()

    # ── Email all authorities about new issue ──────────────────────────────────
    try:
        from app import mail
        from flask_mail import Message
        app_url = current_app.config.get('APP_URL', 'http://localhost:5173')
        dept    = DEPARTMENTS.get(data.get('category', ''), 'General Administration')
        loc     = issue.location_text or 'Location not specified'
        ward_txt= f" | Ward: {issue.ward}" if issue.ward else ""

        authorities = User.query.filter(
            User.role.in_(['authority', 'admin']), User.is_active == True
        ).all()

        for auth in authorities:
            body = f"""Dear {auth.full_name or auth.username},

A new civic issue has been reported on CivicSense and requires your attention.

ISSUE DETAILS
Title     : {issue.title}
Category  : {issue.category}{(' > ' + issue.subcategory) if issue.subcategory else ''}
Department: {dept}
Location  : {loc}{ward_txt}
Priority  : {issue.priority}
Status    : {issue.status}
Reported  : {issue.created_at.strftime('%d %b %Y, %I:%M %p')}

Description:
{issue.description[:500]}{'...' if len(issue.description) > 500 else ''}

ACTION REQUIRED
Please log in to review and update the status of this issue:
{app_url}/issues/{issue.id}

You can update the status to:
  - Under Review  : when you have acknowledged the issue
  - In Progress   : when work has begun
  - Resolved      : when the issue has been fixed

— CivicSense Notification System
This is an automated message. Do not reply to this email.
"""
            try:
                msg = Message(
                    subject=f"[CivicSense] New Issue: {issue.title[:60]}",
                    recipients=[auth.email],
                    body=body
                )
                mail.send(msg)
            except Exception:
                pass
    except Exception as e:
        print(f"[EMAIL] Authority notification failed: {e}")

    return jsonify(issue.to_dict()), 201


@issues_bp.route('/<int:issue_id>/upvote', methods=['POST'])
def upvote_issue(issue_id):
    issue   = Issue.query.get_or_404(issue_id)
    user_id = get_user_id()
    ip      = get_ip()

    existing = IssueUpvote.query.filter_by(issue_id=issue_id, user_id=user_id).first() if user_id else None
    if not existing and not user_id:
        existing = IssueUpvote.query.filter_by(issue_id=issue_id, ip_address=ip, user_id=None).first()
    if existing:
        return jsonify({'error': 'Already upvoted', 'upvotes': issue.upvotes}), 409

    db.session.add(IssueUpvote(issue_id=issue_id, user_id=user_id, ip_address=ip))
    issue.upvotes += 1
    prev = issue.priority
    if issue.upvotes >= CRITICAL_THRESHOLD:     issue.priority = 'Critical'
    elif issue.upvotes >= HIGH_PRIORITY_THRESHOLD and issue.priority == 'Normal':
        issue.priority = 'High Priority'

    if prev != issue.priority and issue.user_id:
        db.session.add(Notification(user_id=issue.user_id, type='issue_escalated',
            title=f'Issue escalated to {issue.priority}!',
            message=f'"{issue.title}" now has {issue.upvotes} upvotes.',
            link=f'/issues/{issue.id}'))
    if issue.user_id:
        u = User.query.get(issue.user_id)
        if u: u.reputation_score += 1
    db.session.commit()
    return jsonify({'upvotes': issue.upvotes, 'priority': issue.priority, 'escalated': prev != issue.priority})


@issues_bp.route('/<int:issue_id>/comment', methods=['POST'])
def add_comment(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    data  = request.json or {}
    if not data.get('content') or len(data['content'].strip()) < 2:
        return jsonify({'error': 'content required (min 2 chars)'}), 400
    if len(data['content']) > 2000:
        return jsonify({'error': 'comment too long (max 2000 chars)'}), 400

    user_id = get_user_id()
    user    = User.query.get(user_id) if user_id else None
    comment = Comment(
        issue_id=issue_id, user_id=user_id,
        content=data['content'].strip(),
        is_anonymous=data.get('is_anonymous', True),
        author_name=data.get('author_name', '').strip() or (user.username if user else None),
        is_authority=bool(user and user.role in ('authority', 'admin')),
        parent_id=data.get('parent_id'),
    )
    db.session.add(comment)
    if issue.user_id and str(issue.user_id) != str(user_id):
        db.session.add(Notification(user_id=issue.user_id, type='new_comment',
            title='New comment on your issue',
            message=f'Someone commented on "{issue.title}"',
            link=f'/issues/{issue.id}'))
    if user: user.reputation_score += 2
    db.session.commit()
    return jsonify(comment.to_dict()), 201


@issues_bp.route('/comment/<int:comment_id>', methods=['DELETE'])
@jwt_required()
def delete_comment(comment_id):
    user_id = get_jwt_identity()
    comment = Comment.query.get_or_404(comment_id)
    user    = User.query.get(user_id)
    if str(comment.user_id) != str(user_id) and user.role not in ('admin', 'authority'):
        return jsonify({'error': 'Not authorized'}), 403
    comment.is_deleted = True
    db.session.commit()
    return jsonify({'message': 'Deleted'})


@issues_bp.route('/<int:issue_id>/status', methods=['PATCH'])
def update_status(issue_id):
    issue = Issue.query.get_or_404(issue_id)
    data  = request.json or {}
    valid = ['Reported', 'Under Review', 'In Progress', 'Resolved', 'Rejected', 'Duplicate']
    if data.get('status') not in valid:
        return jsonify({'error': f'Status must be one of {valid}'}), 400
    old = issue.status
    issue.status = data['status']
    if data.get('authority_note'): issue.authority_note = data['authority_note']
    if data['status'] == 'Resolved': issue.resolved_at = datetime.utcnow()
    user_id = get_user_id()

    # ── In-app notification to citizen ────────────────────────────────────────
    if issue.user_id:
        db.session.add(Notification(user_id=issue.user_id, type='issue_update',
            title=f'Issue status: {data["status"]}',
            message=data.get('authority_note', f'Status changed: {old} → {data["status"]}'),
            link=f'/issues/{issue.id}'))

    log_audit(user_id, 'update_status', 'issue', issue.id, f'{old} → {data["status"]}')
    db.session.commit()

    # ── Email citizen when status changes ─────────────────────────────────────
    try:
        if issue.user_id:
            citizen = User.query.get(issue.user_id)
            if citizen and citizen.email:
                from app import mail
                from flask_mail import Message
                app_url = current_app.config.get('APP_URL', 'http://localhost:5173')
                note    = data.get('authority_note', '')
                status_emoji = {
                    'Under Review': '🔍',
                    'In Progress':  '🔧',
                    'Resolved':     '✅',
                    'Rejected':     '❌',
                    'Duplicate':    '🔁',
                }.get(data['status'], '📋')

                body = f"""Dear {citizen.full_name or citizen.username},

Your civic issue has been updated by the concerned authority.

{status_emoji} STATUS UPDATE: {data['status'].upper()}

ISSUE: {issue.title}
Category: {issue.category}
Location: {issue.location_text or 'Not specified'}

{'AUTHORITY NOTE:\n' + note + chr(10) if note else ''}
Track your issue here:
{app_url}/issues/{issue.id}

{'Congratulations! Your issue has been resolved. Thank you for helping make our community better.' if data['status'] == 'Resolved' else 'The concerned department is working on your issue. You will be notified of further updates.'}

— CivicSense Team
This is an automated message. Do not reply to this email.
"""
                msg = Message(
                    subject=f"[CivicSense] {status_emoji} Your issue status: {data['status']} — {issue.title[:50]}",
                    recipients=[citizen.email],
                    body=body
                )
                mail.send(msg)
    except Exception as e:
        print(f"[EMAIL] Citizen status notification failed: {e}")

    return jsonify(issue.to_dict())


@issues_bp.route('/meta/categories', methods=['GET'])
def get_categories():
    return jsonify(CATEGORIES)


@issues_bp.route('/meta/stats', methods=['GET'])
def get_stats():
    from sqlalchemy import func
    total    = Issue.query.count()
    resolved = Issue.query.filter_by(status='Resolved').count()
    high     = Issue.query.filter_by(priority='High Priority').count()
    by_cat   = db.session.query(Issue.category, func.count(Issue.id)).group_by(Issue.category).all()
    return jsonify({
        'total': total, 'resolved': resolved, 'high_priority': high,
        'resolution_rate': round((resolved / total * 100), 1) if total else 0,
        'by_category': [{'category': c, 'count': n} for c, n in by_cat],
    })


@issues_bp.route('/my-issues', methods=['GET'])
@jwt_required()
def my_issues():
    """Get all issues reported by the logged-in citizen."""
    user_id  = get_jwt_identity()
    page     = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 50)
    status   = request.args.get('status', '')

    q = Issue.query.filter_by(user_id=user_id)
    if status:
        q = q.filter_by(status=status)
    q = q.order_by(Issue.created_at.desc())
    p = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'items': [i.to_dict() for i in p.items],
        'total': p.total, 'page': page, 'pages': p.pages
    })


@issues_bp.route('/authority-dashboard', methods=['GET'])
@jwt_required()
def authority_dashboard():
    """Dedicated dashboard for authority — pending issues sorted by priority."""
    user_id = get_jwt_identity()
    user    = User.query.get(user_id)
    if not user or user.role not in ('authority', 'admin'):
        return jsonify({'error': 'Authority access required'}), 403

    page     = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 15, type=int), 50)
    status   = request.args.get('status', '')
    category = request.args.get('category', '')

    q = Issue.query.filter(Issue.status != 'Resolved', Issue.status != 'Rejected')
    if status:   q = q.filter_by(status=status)
    if category: q = q.filter_by(category=category)

    # Sort: Critical first, then High Priority, then by upvotes
    from sqlalchemy import case
    priority_order = case(
        (Issue.priority == 'Critical',     1),
        (Issue.priority == 'High Priority', 2),
        else_=3
    )
    q = q.order_by(priority_order, Issue.upvotes.desc(), Issue.created_at.desc())
    p = q.paginate(page=page, per_page=per_page, error_out=False)

    # Summary counts
    total_pending  = Issue.query.filter(Issue.status.notin_(['Resolved','Rejected'])).count()
    critical_count = Issue.query.filter_by(priority='Critical').filter(Issue.status.notin_(['Resolved','Rejected'])).count()
    high_count     = Issue.query.filter_by(priority='High Priority').filter(Issue.status.notin_(['Resolved','Rejected'])).count()
    resolved_today = Issue.query.filter_by(status='Resolved').filter(
        Issue.resolved_at >= datetime.utcnow().replace(hour=0, minute=0, second=0)
    ).count()

    return jsonify({
        'items': [i.to_dict() for i in p.items],
        'total': p.total, 'page': page, 'pages': p.pages,
        'summary': {
            'total_pending':  total_pending,
            'critical':       critical_count,
            'high_priority':  high_count,
            'resolved_today': resolved_today,
        }
    })
