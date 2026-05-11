"""
Global Search Route — searches across issues, stories, help requests
"""
from flask import Blueprint, request, jsonify
from models import Issue, Story, HelpRequest

search_bp = Blueprint('search', __name__)

@search_bp.route('/', methods=['GET'])
def global_search():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify({'error': 'Query must be at least 2 characters'}), 400

    lk = f'%{q}%'
    limit = 5

    issues = Issue.query.filter(
        Issue.title.ilike(lk) | Issue.description.ilike(lk) | Issue.location_text.ilike(lk)
    ).limit(limit).all()

    stories = Story.query.filter(
        Story.title.ilike(lk) | Story.content.ilike(lk)
    ).filter_by(is_approved=True).limit(limit).all()

    help_req = HelpRequest.query.filter(
        HelpRequest.description.ilike(lk) | HelpRequest.location_text.ilike(lk)
    ).filter_by(is_fulfilled=False).limit(limit).all()

    return jsonify({
        'query': q,
        'issues':   [{'id': i.id, 'title': i.title, 'category': i.category, 'status': i.status} for i in issues],
        'stories':  [{'id': s.id, 'title': s.title, 'dharma_tag': s.dharma_tag} for s in stories],
        'help':     [{'id': h.id, 'category': h.category, 'type': h.request_type, 'description': h.description[:80]} for h in help_req],
        'total':    len(issues) + len(stories) + len(help_req),
    })
