"""
Module 5: Story & Inspiration Section Routes
Users share experiences with dharma-inspired moral lessons.
"""

from flask import Blueprint, request, jsonify
from database import db
from models import Story

stories_bp = Blueprint('stories', __name__)

DHARMA_TAGS = ['Dharma', 'Patience', 'Justice', 'Courage', 'Compassion', 'Truth', 'Sacrifice']


# ─── GET all stories ───────────────────────────────────────────────────────────
@stories_bp.route('/', methods=['GET'])
def get_stories():
    tag = request.args.get('tag')
    query = Story.query
    if tag:
        query = query.filter_by(dharma_tag=tag)
    stories = query.order_by(Story.created_at.desc()).all()
    return jsonify([s.to_dict() for s in stories])


# ─── GET single story ──────────────────────────────────────────────────────────
@stories_bp.route('/<int:story_id>', methods=['GET'])
def get_story(story_id):
    story = Story.query.get_or_404(story_id)
    return jsonify(story.to_dict())


# ─── POST create story ─────────────────────────────────────────────────────────
@stories_bp.route('/', methods=['POST'])
def create_story():
    data = request.json or {}
    if not data.get('title') or not data.get('content'):
        return jsonify({'error': 'title and content are required'}), 400

    story = Story(
        title       = data['title'],
        content     = data['content'],
        moral       = data.get('moral'),
        dharma_tag  = data.get('dharma_tag'),
        is_anonymous = data.get('is_anonymous', True),
        author_name = data.get('author_name'),
    )
    db.session.add(story)
    db.session.commit()
    return jsonify(story.to_dict()), 201


# ─── POST like a story ─────────────────────────────────────────────────────────
@stories_bp.route('/<int:story_id>/like', methods=['POST'])
def like_story(story_id):
    story = Story.query.get_or_404(story_id)
    story.likes += 1
    db.session.commit()
    return jsonify({'likes': story.likes})


# ─── GET dharma tags list ──────────────────────────────────────────────────────
@stories_bp.route('/meta/tags', methods=['GET'])
def get_tags():
    return jsonify(DHARMA_TAGS)
