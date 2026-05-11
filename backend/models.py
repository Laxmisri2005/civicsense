"""
CivicSense Database Models — Production Grade
Full feature set: users, issues, comments, alerts, help, stories, notifications, audit log
"""

from database import db
from datetime import datetime
import bcrypt


class User(db.Model):
    __tablename__ = 'users'
    id            = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(80),  unique=True, nullable=False, index=True)
    email         = db.Column(db.String(200), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name     = db.Column(db.String(200), nullable=True)
    bio           = db.Column(db.Text, nullable=True)
    phone         = db.Column(db.String(20),  nullable=True)
    city          = db.Column(db.String(100), nullable=True)
    state         = db.Column(db.String(100), nullable=True)
    role          = db.Column(db.String(20),  default='citizen', index=True)
    is_active     = db.Column(db.Boolean, default=True)
    is_verified   = db.Column(db.Boolean, default=False)
    avatar_url    = db.Column(db.String(500), nullable=True)
    issues_reported  = db.Column(db.Integer, default=0)
    helps_given      = db.Column(db.Integer, default=0)
    reputation_score = db.Column(db.Integer, default=0)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    last_login    = db.Column(db.DateTime, nullable=True)
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade='all, delete-orphan')

    def set_password(self, raw):
        self.password_hash = bcrypt.hashpw(raw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, raw):
        return bcrypt.checkpw(raw.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self, public=True):
        d = {
            'id': self.id, 'username': self.username, 'full_name': self.full_name,
            'bio': self.bio, 'city': self.city, 'state': self.state, 'role': self.role,
            'avatar_url': self.avatar_url, 'issues_reported': self.issues_reported,
            'helps_given': self.helps_given, 'reputation_score': self.reputation_score,
            'is_verified': self.is_verified, 'created_at': self.created_at.isoformat(),
        }
        if not public:
            d['email'] = self.email
            d['phone'] = self.phone
            d['last_login'] = self.last_login.isoformat() if self.last_login else None
        return d


class Issue(db.Model):
    __tablename__ = 'issues'
    id            = db.Column(db.Integer, primary_key=True)
    title         = db.Column(db.String(200), nullable=False)
    description   = db.Column(db.Text, nullable=False)
    category      = db.Column(db.String(100), nullable=False, index=True)
    subcategory   = db.Column(db.String(100), nullable=True)
    latitude      = db.Column(db.Float, nullable=True)
    longitude     = db.Column(db.Float, nullable=True)
    location_text = db.Column(db.String(300), nullable=True)
    ward          = db.Column(db.String(100), nullable=True)
    pincode       = db.Column(db.String(10),  nullable=True)
    image_url     = db.Column(db.String(500), nullable=True)
    image_url_2   = db.Column(db.String(500), nullable=True)
    is_anonymous  = db.Column(db.Boolean, default=True)
    reporter_name = db.Column(db.String(100), nullable=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    upvotes       = db.Column(db.Integer, default=0)
    views         = db.Column(db.Integer, default=0)
    status        = db.Column(db.String(50), default='Reported', index=True)
    priority      = db.Column(db.String(20), default='Normal',   index=True)
    assigned_to   = db.Column(db.String(200), nullable=True)
    authority_note= db.Column(db.Text, nullable=True)
    resolved_at   = db.Column(db.DateTime, nullable=True)
    expected_resolution = db.Column(db.DateTime, nullable=True)
    is_duplicate  = db.Column(db.Boolean, default=False)
    tags          = db.Column(db.String(500), nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    comments      = db.relationship('Comment', backref='issue', lazy=True, cascade='all, delete-orphan')
    upvote_records= db.relationship('IssueUpvote', backref='issue', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id, 'title': self.title, 'description': self.description,
            'category': self.category, 'subcategory': self.subcategory,
            'latitude': self.latitude, 'longitude': self.longitude,
            'location_text': self.location_text, 'ward': self.ward, 'pincode': self.pincode,
            'image_url': self.image_url, 'image_url_2': self.image_url_2,
            'is_anonymous': self.is_anonymous,
            'reporter_name': self.reporter_name if not self.is_anonymous else 'Anonymous Citizen',
            'user_id': self.user_id, 'upvotes': self.upvotes, 'views': self.views,
            'status': self.status, 'priority': self.priority,
            'assigned_to': self.assigned_to, 'authority_note': self.authority_note,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'expected_resolution': self.expected_resolution.isoformat() if self.expected_resolution else None,
            'tags': self.tags.split(',') if self.tags else [],
            'comment_count': len(self.comments),
            'created_at': self.created_at.isoformat(), 'updated_at': self.updated_at.isoformat(),
        }


class IssueUpvote(db.Model):
    __tablename__ = 'issue_upvotes'
    id         = db.Column(db.Integer, primary_key=True)
    issue_id   = db.Column(db.Integer, db.ForeignKey('issues.id'), nullable=False, index=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('issue_id', 'user_id', name='uq_issue_user_upvote'),)


class Comment(db.Model):
    __tablename__ = 'comments'
    id           = db.Column(db.Integer, primary_key=True)
    issue_id     = db.Column(db.Integer, db.ForeignKey('issues.id'), nullable=False, index=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    content      = db.Column(db.Text, nullable=False)
    is_anonymous = db.Column(db.Boolean, default=True)
    author_name  = db.Column(db.String(100), nullable=True)
    is_authority = db.Column(db.Boolean, default=False)
    likes        = db.Column(db.Integer, default=0)
    parent_id    = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)
    is_deleted   = db.Column(db.Boolean, default=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]), lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'issue_id': self.issue_id,
            'content': '[deleted]' if self.is_deleted else self.content,
            'author_name': self.author_name if not self.is_anonymous else 'Anonymous',
            'user_id': self.user_id, 'is_authority': self.is_authority,
            'likes': self.likes, 'parent_id': self.parent_id, 'is_deleted': self.is_deleted,
            'reply_count': len([r for r in self.replies if not r.is_deleted]),
            'created_at': self.created_at.isoformat(),
        }


class DisasterAlert(db.Model):
    __tablename__ = 'alerts'
    id            = db.Column(db.Integer, primary_key=True)
    alert_type    = db.Column(db.String(100), nullable=False, index=True)
    severity      = db.Column(db.String(50), default='Moderate', index=True)
    title         = db.Column(db.String(300), nullable=False)
    description   = db.Column(db.Text, nullable=False)
    region        = db.Column(db.String(300), nullable=True)
    district      = db.Column(db.String(200), nullable=True)
    state         = db.Column(db.String(100), nullable=True)
    latitude      = db.Column(db.Float, nullable=True)
    longitude     = db.Column(db.Float, nullable=True)
    radius_km     = db.Column(db.Float, nullable=True)
    instructions  = db.Column(db.Text, nullable=True)
    do_list       = db.Column(db.Text, nullable=True)
    dont_list     = db.Column(db.Text, nullable=True)
    contacts      = db.Column(db.Text, nullable=True)
    shelter_locations = db.Column(db.Text, nullable=True)
    source        = db.Column(db.String(200), nullable=True)
    source_url    = db.Column(db.String(500), nullable=True)
    is_active     = db.Column(db.Boolean, default=True, index=True)
    created_by    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    views         = db.Column(db.Integer, default=0)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    expires_at    = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        import json
        def sj(v):
            try: return json.loads(v) if v else []
            except: return []
        return {
            'id': self.id, 'alert_type': self.alert_type, 'severity': self.severity,
            'title': self.title, 'description': self.description,
            'region': self.region, 'district': self.district, 'state': self.state,
            'latitude': self.latitude, 'longitude': self.longitude, 'radius_km': self.radius_km,
            'instructions': self.instructions, 'do_list': sj(self.do_list),
            'dont_list': sj(self.dont_list), 'contacts': sj(self.contacts),
            'shelter_locations': sj(self.shelter_locations),
            'source': self.source, 'source_url': self.source_url,
            'is_active': self.is_active, 'views': self.views,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }


class HelpRequest(db.Model):
    __tablename__ = 'help_requests'
    id            = db.Column(db.Integer, primary_key=True)
    request_type  = db.Column(db.String(20), nullable=False, index=True)
    category      = db.Column(db.String(100), nullable=False, index=True)
    title         = db.Column(db.String(200), nullable=True)
    description   = db.Column(db.Text, nullable=False)
    quantity      = db.Column(db.String(100), nullable=True)
    urgency       = db.Column(db.String(20), default='Normal')
    latitude      = db.Column(db.Float, nullable=True)
    longitude     = db.Column(db.Float, nullable=True)
    location_text = db.Column(db.String(300), nullable=True)
    pincode       = db.Column(db.String(10), nullable=True)
    contact_info  = db.Column(db.String(300), nullable=True)
    contact_method= db.Column(db.String(50), nullable=True)
    is_anonymous  = db.Column(db.Boolean, default=True)
    name          = db.Column(db.String(100), nullable=True)
    user_id       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    is_fulfilled  = db.Column(db.Boolean, default=False, index=True)
    fulfilled_note= db.Column(db.Text, nullable=True)
    views         = db.Column(db.Integer, default=0)
    expires_at    = db.Column(db.DateTime, nullable=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id, 'request_type': self.request_type, 'category': self.category,
            'title': self.title, 'description': self.description, 'quantity': self.quantity,
            'urgency': self.urgency, 'latitude': self.latitude, 'longitude': self.longitude,
            'location_text': self.location_text, 'pincode': self.pincode,
            'contact_info': self.contact_info, 'contact_method': self.contact_method,
            'name': self.name if not self.is_anonymous else 'Anonymous',
            'user_id': self.user_id, 'is_fulfilled': self.is_fulfilled,
            'fulfilled_note': self.fulfilled_note, 'views': self.views,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat(),
        }


class Story(db.Model):
    __tablename__ = 'stories'
    id           = db.Column(db.Integer, primary_key=True)
    title        = db.Column(db.String(300), nullable=False)
    content      = db.Column(db.Text, nullable=False)
    moral        = db.Column(db.Text, nullable=True)
    dharma_tag   = db.Column(db.String(100), nullable=True, index=True)
    related_epic = db.Column(db.String(100), nullable=True)
    quote        = db.Column(db.Text, nullable=True)
    quote_source = db.Column(db.String(200), nullable=True)
    is_anonymous = db.Column(db.Boolean, default=True)
    author_name  = db.Column(db.String(100), nullable=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    likes        = db.Column(db.Integer, default=0)
    views        = db.Column(db.Integer, default=0)
    is_featured  = db.Column(db.Boolean, default=False)
    is_approved  = db.Column(db.Boolean, default=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id, 'title': self.title, 'content': self.content,
            'moral': self.moral, 'dharma_tag': self.dharma_tag,
            'related_epic': self.related_epic, 'quote': self.quote,
            'quote_source': self.quote_source,
            'author_name': self.author_name if not self.is_anonymous else 'Anonymous',
            'user_id': self.user_id, 'likes': self.likes, 'views': self.views,
            'is_featured': self.is_featured, 'created_at': self.created_at.isoformat(),
        }


class OfflineMessage(db.Model):
    __tablename__ = 'offline_messages'
    id           = db.Column(db.Integer, primary_key=True)
    message_type = db.Column(db.String(100), nullable=False, index=True)
    custom_text  = db.Column(db.Text, nullable=True)
    latitude     = db.Column(db.Float, nullable=True)
    longitude    = db.Column(db.Float, nullable=True)
    accuracy_m   = db.Column(db.Float, nullable=True)
    device_id    = db.Column(db.String(200), nullable=True, index=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    is_resolved  = db.Column(db.Boolean, default=False)
    synced_at    = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id, 'message_type': self.message_type, 'custom_text': self.custom_text,
            'latitude': self.latitude, 'longitude': self.longitude, 'accuracy_m': self.accuracy_m,
            'device_id': self.device_id, 'is_resolved': self.is_resolved,
            'synced_at': self.synced_at.isoformat(),
        }


class Notification(db.Model):
    __tablename__ = 'notifications'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    type       = db.Column(db.String(50), nullable=False)
    title      = db.Column(db.String(200), nullable=False)
    message    = db.Column(db.Text, nullable=True)
    link       = db.Column(db.String(300), nullable=True)
    is_read    = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id, 'type': self.type, 'title': self.title,
            'message': self.message, 'link': self.link,
            'is_read': self.is_read, 'created_at': self.created_at.isoformat(),
        }


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action     = db.Column(db.String(100), nullable=False, index=True)
    entity     = db.Column(db.String(50), nullable=True)
    entity_id  = db.Column(db.Integer, nullable=True)
    detail     = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)


# ─── Gamification Models ──────────────────────────────────────────────────────

class Badge(db.Model):
    """Badge definitions — awarded to users for civic contributions."""
    __tablename__ = 'badges'
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(100), unique=True, nullable=False)
    tier        = db.Column(db.String(20), default='bronze')  # bronze | silver | gold
    description = db.Column(db.Text)
    icon        = db.Column(db.String(10), nullable=True)
    metric      = db.Column(db.String(50))   # issue | help | story | volunteer | vote | rep | likes
    threshold   = db.Column(db.Integer, default=1)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'tier': self.tier,
                'description': self.description, 'icon': self.icon,
                'metric': self.metric, 'threshold': self.threshold}


class UserBadge(db.Model):
    """Junction: which user earned which badge."""
    __tablename__ = 'user_badges'
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    badge_id   = db.Column(db.Integer, db.ForeignKey('badges.id'), nullable=False)
    earned_at  = db.Column(db.DateTime, default=datetime.utcnow)
    badge      = db.relationship('Badge', lazy=True)
    __table_args__ = (db.UniqueConstraint('user_id', 'badge_id'),)

    def to_dict(self):
        return {'badge': self.badge.to_dict(), 'earned_at': self.earned_at.isoformat()}


# ─── Volunteer Coordination ───────────────────────────────────────────────────

class VolunteerMission(db.Model):
    """A disaster-relief or civic volunteer mission."""
    __tablename__ = 'volunteer_missions'
    id            = db.Column(db.Integer, primary_key=True)
    title         = db.Column(db.String(200), nullable=False)
    description   = db.Column(db.Text, nullable=False)
    mission_type  = db.Column(db.String(100))  # flood_relief | cleanup | medical | food_drive
    status        = db.Column(db.String(50), default='Open')  # Open | Active | Completed
    location_text = db.Column(db.String(300))
    latitude      = db.Column(db.Float)
    longitude     = db.Column(db.Float)
    max_volunteers= db.Column(db.Integer, default=20)
    start_date    = db.Column(db.DateTime)
    end_date      = db.Column(db.DateTime)
    organizer_id  = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    enrollments   = db.relationship('VolunteerEnrollment', backref='mission', lazy=True,
                                     cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id, 'title': self.title, 'description': self.description,
            'mission_type': self.mission_type, 'status': self.status,
            'location_text': self.location_text, 'latitude': self.latitude,
            'longitude': self.longitude, 'max_volunteers': self.max_volunteers,
            'enrolled_count': len(self.enrollments),
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_at': self.created_at.isoformat(),
        }


class VolunteerEnrollment(db.Model):
    """User joined a volunteer mission."""
    __tablename__ = 'volunteer_enrollments'
    id         = db.Column(db.Integer, primary_key=True)
    mission_id = db.Column(db.Integer, db.ForeignKey('volunteer_missions.id'), nullable=False)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    skills     = db.Column(db.String(300))
    status     = db.Column(db.String(30), default='enrolled')
    joined_at  = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('mission_id', 'user_id'),)

    def to_dict(self):
        return {'id': self.id, 'mission_id': self.mission_id,
                'user_id': self.user_id, 'skills': self.skills,
                'status': self.status, 'joined_at': self.joined_at.isoformat()}


# ─── Community Budget Voting ──────────────────────────────────────────────────

class BudgetProposal(db.Model):
    """A civic budget priority proposal for community voting."""
    __tablename__ = 'budget_proposals'
    id          = db.Column(db.Integer, primary_key=True)
    title       = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category    = db.Column(db.String(100))
    estimated_cost = db.Column(db.String(100))  # e.g. "₹5 Crore"
    ward        = db.Column(db.String(100))
    votes_for   = db.Column(db.Integer, default=0)
    votes_against = db.Column(db.Integer, default=0)
    submitted_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    is_active   = db.Column(db.Boolean, default=True)
    deadline    = db.Column(db.DateTime)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    vote_records = db.relationship('BudgetVote', backref='proposal', lazy=True,
                                    cascade='all, delete-orphan')

    def to_dict(self):
        total = self.votes_for + self.votes_against
        return {
            'id': self.id, 'title': self.title, 'description': self.description,
            'category': self.category, 'estimated_cost': self.estimated_cost,
            'ward': self.ward, 'votes_for': self.votes_for,
            'votes_against': self.votes_against, 'total_votes': total,
            'approval_pct': round(self.votes_for / total * 100, 1) if total else 0,
            'is_active': self.is_active,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'created_at': self.created_at.isoformat(),
        }


class BudgetVote(db.Model):
    """User vote on a budget proposal."""
    __tablename__ = 'budget_votes'
    id          = db.Column(db.Integer, primary_key=True)
    proposal_id = db.Column(db.Integer, db.ForeignKey('budget_proposals.id'), nullable=False)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    vote        = db.Column(db.Boolean)  # True=for, False=against
    voted_at    = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('proposal_id', 'user_id'),)
