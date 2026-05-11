"""
Community Budget Voting Module
Citizens vote on municipal priorities
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import BudgetProposal, BudgetVote, User

budget_bp = Blueprint('budget', __name__)


@budget_bp.route('/', methods=['GET'])
def get_proposals():
    ward = request.args.get('ward', '')
    q = BudgetProposal.query.filter_by(is_active=True)
    if ward: q = q.filter_by(ward=ward)
    proposals = q.order_by(BudgetProposal.votes_for.desc()).all()
    return jsonify([p.to_dict() for p in proposals])


@budget_bp.route('/', methods=['POST'])
@jwt_required()
def create_proposal():
    user_id = get_jwt_identity()
    data = request.json or {}
    if not data.get('title'):
        return jsonify({'error': 'title required'}), 400
    p = BudgetProposal(
        title          = data['title'],
        description    = data.get('description', ''),
        category       = data.get('category'),
        estimated_cost = data.get('estimated_cost'),
        ward           = data.get('ward'),
        submitted_by   = user_id,
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@budget_bp.route('/<int:pid>/vote', methods=['POST'])
@jwt_required()
def vote(pid):
    user_id = get_jwt_identity()
    p = BudgetProposal.query.get_or_404(pid)
    if not p.is_active:
        return jsonify({'error': 'Proposal is closed'}), 400
    if BudgetVote.query.filter_by(proposal_id=pid, user_id=user_id).first():
        return jsonify({'error': 'Already voted'}), 409

    data = request.json or {}
    vote_for = data.get('vote', True)

    db.session.add(BudgetVote(proposal_id=pid, user_id=user_id, vote=vote_for))
    if vote_for: p.votes_for     += 1
    else:        p.votes_against += 1

    # Reputation for civic participation
    u = User.query.get(user_id)
    if u: u.reputation_score += 3

    db.session.commit()
    return jsonify(p.to_dict())


@budget_bp.route('/my-votes', methods=['GET'])
@jwt_required()
def my_votes():
    user_id = get_jwt_identity()
    votes = BudgetVote.query.filter_by(user_id=user_id).all()
    return jsonify([{'proposal_id': v.proposal_id, 'vote': v.vote} for v in votes])
