"""
Map Data Route — GeoJSON for OpenStreetMap, ward heatmap, issue pins.
Simulates Government GIS API integration with real DB data.
"""
from flask import Blueprint, request, jsonify
from models import Issue, HelpRequest, VolunteerMission
from database import db
from sqlalchemy import func

map_bp = Blueprint('map', __name__)


@map_bp.route('/issues/geojson', methods=['GET'])
def issues_geojson():
    """Return all geotagged issues as GeoJSON FeatureCollection for Leaflet."""
    status   = request.args.get('status')
    category = request.args.get('category')
    priority = request.args.get('priority')

    q = Issue.query.filter(Issue.latitude.isnot(None), Issue.longitude.isnot(None))
    if status:   q = q.filter_by(status=status)
    if category: q = q.filter_by(category=category)
    if priority: q = q.filter_by(priority=priority)
    issues = q.order_by(Issue.created_at.desc()).limit(500).all()

    features = []
    for i in issues:
        features.append({
            'type': 'Feature',
            'geometry': {'type': 'Point', 'coordinates': [i.longitude, i.latitude]},
            'properties': {
                'id':       i.id,
                'title':    i.title,
                'category': i.category,
                'status':   i.status,
                'priority': i.priority,
                'upvotes':  i.upvotes,
                'color':    _priority_color(i.priority),
            }
        })

    return jsonify({'type': 'FeatureCollection', 'features': features, 'count': len(features)})


@map_bp.route('/help/geojson', methods=['GET'])
def help_geojson():
    """Help requests as GeoJSON."""
    items = HelpRequest.query.filter(
        HelpRequest.latitude.isnot(None),
        HelpRequest.longitude.isnot(None),
        HelpRequest.is_fulfilled == False
    ).limit(200).all()

    features = [{'type': 'Feature',
                 'geometry': {'type': 'Point', 'coordinates': [h.longitude, h.latitude]},
                 'properties': {'id': h.id, 'category': h.category, 'type': h.request_type,
                                'urgency': h.urgency, 'description': h.description[:80]}}
                for h in items]
    return jsonify({'type': 'FeatureCollection', 'features': features})


@map_bp.route('/ward-heatmap', methods=['GET'])
def ward_heatmap():
    """Issue counts by ward — for choropleth map overlay."""
    rows = db.session.query(Issue.ward, func.count(Issue.id).label('count'))\
        .filter(Issue.ward.isnot(None))\
        .group_by(Issue.ward)\
        .order_by(func.count(Issue.id).desc()).all()
    return jsonify([{'ward': w, 'count': c} for w, c in rows])


@map_bp.route('/gis/nearby', methods=['GET'])
def gis_nearby():
    """
    Simulates Government GIS API — returns nearby civic infrastructure.
    In production: integrate with Smart Cities Mission GIS or state GIS portals.
    """
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    if not lat or not lon:
        return jsonify({'error': 'lat and lon required'}), 400

    # Simulated GIS data (in production: call state GIS API)
    return jsonify({
        'note': 'Simulated GIS data. Integrate with state GIS portal for real data.',
        'location': {'lat': lat, 'lon': lon},
        'infrastructure': [
            {'type': 'Hospital',     'name': 'Government General Hospital',  'distance_m': 850,  'lat': lat+0.005, 'lon': lon+0.003},
            {'type': 'Police',       'name': 'Town Police Station',          'distance_m': 1200, 'lat': lat-0.007, 'lon': lon+0.005},
            {'type': 'Fire Station', 'name': 'Municipal Fire Station',       'distance_m': 2100, 'lat': lat+0.012, 'lon': lon-0.008},
            {'type': 'Ward Office',  'name': 'Ward 12 Municipal Office',     'distance_m': 450,  'lat': lat-0.003, 'lon': lon-0.002},
            {'type': 'Water Plant',  'name': 'Water Treatment Plant',        'distance_m': 3500, 'lat': lat+0.02,  'lon': lon+0.015},
        ]
    })


def _priority_color(priority):
    return {'Critical': '#dc2626', 'High Priority': '#f59e0b', 'Normal': '#3b82f6'}.get(priority, '#6b7280')
