"""CivicSense v5.0 — Production Flask App"""
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from config import Config
from database import db
from routes.issues        import issues_bp
from routes.alerts        import alerts_bp
from routes.help_requests import help_bp
from routes.stories       import stories_bp
from routes.offline       import offline_bp
from routes.auth          import auth_bp
from routes.notifications import notif_bp
from routes.search        import search_bp
from routes.analytics     import analytics_bp
from routes.volunteers    import volunteers_bp
from routes.budget_votes  import budget_bp
from routes.admin         import admin_bp
from routes.ai_tools      import ai_bp
from routes.map_data      import map_bp
import os
from dotenv import load_dotenv
load_dotenv()

import os
print("DB URL =", os.getenv("DATABASE_URL"))

mail = Mail()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app,
         resources={r"/api/*": {"origins": "*"}},
         supports_credentials=True)

    db.init_app(app)
    jwt = JWTManager(app)
    mail.init_app(app)

    @jwt.unauthorized_loader
    def missing_token(r):   return jsonify({'error': 'Authentication required'}), 401
    @jwt.expired_token_loader
    def expired_token(h, d): return jsonify({'error': 'Token expired. Please log in again.'}), 401
    @jwt.invalid_token_loader
    def invalid_token(r):   return jsonify({'error': 'Invalid token'}), 422

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    app.register_blueprint(auth_bp,        url_prefix='/api/auth')
    app.register_blueprint(issues_bp,      url_prefix='/api/issues')
    app.register_blueprint(alerts_bp,      url_prefix='/api/alerts')
    app.register_blueprint(help_bp,        url_prefix='/api/help')
    app.register_blueprint(stories_bp,     url_prefix='/api/stories')
    app.register_blueprint(offline_bp,     url_prefix='/api/offline')
    app.register_blueprint(notif_bp,       url_prefix='/api/notifications')
    app.register_blueprint(search_bp,      url_prefix='/api/search')
    app.register_blueprint(analytics_bp,   url_prefix='/api/analytics')
    app.register_blueprint(volunteers_bp,  url_prefix='/api/volunteers')
    app.register_blueprint(budget_bp,      url_prefix='/api/budget')
    app.register_blueprint(admin_bp,       url_prefix='/api/admin')
    app.register_blueprint(ai_bp,          url_prefix='/api/ai')
    app.register_blueprint(map_bp,         url_prefix='/api/map')

    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    with app.app_context():
        db.create_all()
        _seed_badges()

    @app.route('/')
    def health():
        return {"status": "CivicSense API running", "version": "5.0.0"}

    return app


def _seed_badges():
    from models import Badge
    defaults = [
        ('First Reporter',   'bronze', 'Reported your first civic issue',      'issue',     1),
        ('Community Pillar', 'silver', 'Reported 10 civic issues',             'issue',    10),
        ('Civic Champion',   'gold',   'Reported 50 civic issues',             'issue',    50),
        ('Helper',           'bronze', 'Fulfilled your first help request',    'help',      1),
        ('Rescuer',          'silver', 'Fulfilled 10 help requests',           'help',     10),
        ('Guardian Angel',   'gold',   'Fulfilled 50 help requests',           'help',     50),
        ('Storyteller',      'bronze', 'Shared your first story',              'story',     1),
        ('Dharma Keeper',    'gold',   'Stories received 100+ likes',          'likes',   100),
        ('Volunteer Hero',   'silver', 'Joined 5 volunteer missions',          'volunteer', 5),
        ('Budget Voter',     'bronze', 'Voted on a community budget proposal', 'vote',      1),
        ('Rising Star',      'silver', 'Earned 100 reputation points',        'rep',     100),
        ('Legend',           'gold',   'Earned 500 reputation points',        'rep',     500),
        ('Verified Citizen', 'silver', 'Verified email address',              'rep',       1),
        ('NGO Partner',      'gold',   'Verified NGO / Organisation account', 'rep',       1),
    ]
    for name, tier, desc, metric, threshold in defaults:
        if not Badge.query.filter_by(name=name).first():
            db.session.add(Badge(name=name, tier=tier, description=desc,
                                 metric=metric, threshold=threshold))
    db.session.commit()


if __name__ == '__main__':
    app = create_app()
    app.run(debug=False, port=5000, host='0.0.0.0')
