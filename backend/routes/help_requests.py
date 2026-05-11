"""
Module 4: Community Help System Routes
Handles help needs and offers from community members.
"""

from flask import Blueprint, request, jsonify
from database import db
from models import HelpRequest
import math

help_bp = Blueprint('help', __name__)

HELP_CATEGORIES = ['Food', 'Water', 'Medical', 'Shelter', 'Transport', 'Mental Support', 'Other']


def _haversine_km(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two coordinates."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


# ─── GET all help requests ─────────────────────────────────────────────────────
@help_bp.route('/', methods=['GET'])
def get_help_requests():
    """List help requests. Optional: filter by type, category, or nearby location."""
    req_type = request.args.get('type')       # 'need' or 'offer'
    category = request.args.get('category')
    lat      = request.args.get('lat', type=float)
    lon      = request.args.get('lon', type=float)
    radius   = request.args.get('radius', 50, type=float)  # km

    query = HelpRequest.query.filter_by(is_fulfilled=False)
    if req_type:
        query = query.filter_by(request_type=req_type)
    if category:
        query = query.filter_by(category=category)

    requests_list = query.order_by(HelpRequest.created_at.desc()).all()

    # Filter by distance if coordinates provided
    if lat is not None and lon is not None:
        requests_list = [
            r for r in requests_list
            if r.latitude and r.longitude and
               _haversine_km(lat, lon, r.latitude, r.longitude) <= radius
        ]

    result = []
    for r in requests_list:
        d = r.to_dict()
        if lat and lon and r.latitude and r.longitude:
            d['distance_km'] = round(_haversine_km(lat, lon, r.latitude, r.longitude), 1)
        result.append(d)

    return jsonify(result)


# ─── POST create help request/offer ───────────────────────────────────────────
@help_bp.route('/', methods=['POST'])
def create_help_request():
    data = request.json or {}
    if not data.get('request_type') or data['request_type'] not in ('need', 'offer'):
        return jsonify({'error': 'request_type must be "need" or "offer"'}), 400
    if not data.get('category') or not data.get('description'):
        return jsonify({'error': 'category and description are required'}), 400

    hr = HelpRequest(
        request_type  = data['request_type'],
        category      = data['category'],
        title         = data.get('title'),
        description   = data['description'],
        quantity      = data.get('quantity'),
        urgency       = data.get('urgency', 'Normal'),
        latitude      = data.get('latitude'),
        longitude     = data.get('longitude'),
        location_text = data.get('location_text'),
        contact_info  = data.get('contact_info'),
        contact_method= data.get('contact_method', 'phone'),
        is_anonymous  = data.get('is_anonymous', True),
        name          = data.get('name'),
    )
    db.session.add(hr)
    db.session.commit()
    return jsonify(hr.to_dict()), 201


# ─── PATCH mark as fulfilled ───────────────────────────────────────────────────
@help_bp.route('/<int:req_id>/fulfill', methods=['PATCH'])
def fulfill_request(req_id):
    hr = HelpRequest.query.get_or_404(req_id)
    hr.is_fulfilled = True
    db.session.commit()
    return jsonify({'message': 'Marked as fulfilled', 'id': req_id})


# ─── GET categories ────────────────────────────────────────────────────────────
@help_bp.route('/meta/categories', methods=['GET'])
def get_categories():
    return jsonify(HELP_CATEGORIES)
