"""
Disaster Alert System — live weather, manual alerts, SMS notifications.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from database import db
from models import DisasterAlert, User
import requests, json
from datetime import datetime

alerts_bp = Blueprint('alerts', __name__)

EMERGENCY_CONTACTS = [
    {"name": "National Emergency",        "number": "112"},
    {"name": "National Disaster Helpline","number": "1078"},
    {"name": "Police",                    "number": "100"},
    {"name": "Fire",                      "number": "101"},
    {"name": "Ambulance",                 "number": "108"},
    {"name": "NDRF Control Room",         "number": "011-24363260"},
    {"name": "Coast Guard",               "number": "1554"},
    {"name": "Women Helpline",            "number": "1091"},
]

SAFETY = {
    "flood":      {
        "do":   ["Move to higher ground immediately", "Disconnect electrical appliances", "Follow official evacuation routes", "Carry identity documents and medicines", "Alert neighbours, especially elderly"],
        "dont": ["Walk through fast-moving water", "Drive through flooded roads", "Touch electrical equipment in water", "Ignore official warnings"],
        "instructions": "Evacuate to higher ground. Do not attempt to cross flooded areas. Follow local authority announcements.",
    },
    "cyclone":    {
        "do":   ["Go to a strong building or cyclone shelter", "Close and bolt all windows and doors", "Store drinking water and food", "Keep battery-powered radio for updates", "Stay away from the coast"],
        "dont": ["Stand near windows", "Leave shelter during the eye of the cyclone", "Use candles (fire risk)", "Go near unstable structures"],
        "instructions": "Stay indoors. Secure loose objects. Follow evacuation orders from authorities.",
    },
    "earthquake": {
        "do":   ["Drop, Cover, Hold On", "Stay away from windows and heavy furniture", "If outdoors, move away from buildings", "Check for gas leaks after shaking stops", "Use stairs, not elevators"],
        "dont": ["Run outside during shaking", "Stand in doorways", "Use elevators", "Light matches immediately after"],
        "instructions": "Drop to the ground, take cover under a sturdy table, hold on until shaking stops.",
    },
    "heatwave":   {
        "do":   ["Drink water every 30 minutes even if not thirsty", "Wear light, loose, light-coloured clothing", "Stay indoors between 11am–4pm", "Check on elderly, children, and animals", "Use ORS if feeling dehydrated"],
        "dont": ["Exercise outdoors during peak hours", "Drink alcohol or caffeine", "Leave children or pets in parked vehicles", "Wear dark, tight clothing"],
        "instructions": "Stay hydrated. Avoid outdoor activity during peak heat hours. Use cooling centres if available.",
    },
    "tsunami":    {
        "do":   ["Move immediately to high ground", "Follow official evacuation signs", "Stay at least 2km inland or 30m above sea level", "Listen to radio/TV for all-clear signal", "Help others evacuate"],
        "dont": ["Go to the beach to watch waves", "Return until official all-clear is given", "Cross flooded or damaged bridges", "Assume danger is over after first wave"],
        "instructions": "If you feel an earthquake near the coast, go immediately to high ground without waiting for warnings.",
    },
    "default":    {
        "do":   ["Stay calm", "Follow official instructions", "Keep emergency kit ready", "Stay informed via radio and TV", "Help neighbours"],
        "dont": ["Spread rumours or unverified information", "Ignore official warnings", "Venture out unnecessarily"],
        "instructions": "Follow all local authority instructions. Keep emergency contacts handy.",
    }
}


def get_user_id():
    try:
        verify_jwt_in_request(optional=True)
        return get_jwt_identity()
    except Exception:
        return None


@alerts_bp.route('/', methods=['GET'])
def get_alerts():
    alerts = DisasterAlert.query.filter_by(is_active=True).order_by(DisasterAlert.created_at.desc()).all()
    return jsonify([a.to_dict() for a in alerts])


@alerts_bp.route('/weather', methods=['GET'])
def get_weather_alert():
    lat     = request.args.get('lat')
    lon     = request.args.get('lon')
    city    = request.args.get('city', 'Chennai')
    api_key = current_app.config.get('WEATHER_API_KEY', '')

    if not api_key or api_key == 'your_openweathermap_api_key':
        return jsonify({'error': 'no_api_key',
                        'message': 'Add WEATHER_API_KEY to backend/.env to enable live weather.',
                        'note': 'Get a free key at openweathermap.org/api'}), 200

    try:
        if lat and lon:
            url = f"{current_app.config['WEATHER_API_URL']}/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
        else:
            url = f"{current_app.config['WEATHER_API_URL']}/weather?q={city}&appid={api_key}&units=metric"

        resp = requests.get(url, timeout=8)
        if resp.status_code == 401:
            return jsonify({'error': 'invalid_api_key', 'message': 'Invalid OpenWeatherMap API key.'}), 200
        if resp.status_code == 404:
            return jsonify({'error': 'city_not_found', 'message': f'City "{city}" not found.'}), 200
        resp.raise_for_status()
        return jsonify(_parse_weather(resp.json()))
    except requests.exceptions.Timeout:
        return jsonify({'error': 'timeout', 'message': 'Weather API timed out. Try again.'}), 200
    except Exception as e:
        return jsonify({'error': 'fetch_failed', 'message': str(e)}), 200


def _parse_weather(w):
    cond      = w.get('weather', [{}])[0].get('main', '').lower()
    desc      = w.get('weather', [{}])[0].get('description', '').capitalize()
    temp      = round(w.get('main', {}).get('temp', 0), 1)
    feels     = round(w.get('main', {}).get('feels_like', 0), 1)
    humidity  = w.get('main', {}).get('humidity', 0)
    wind      = round(w.get('wind', {}).get('speed', 0), 1)
    city_name = w.get('name', 'Unknown')
    country   = w.get('sys', {}).get('country', '')

    alert_type = 'default'; severity = 'Low'
    if 'thunderstorm' in cond:    alert_type, severity = 'cyclone',  'High'
    elif 'rain' in cond:          alert_type, severity = 'flood',    'Moderate'
    elif 'drizzle' in cond:       alert_type, severity = 'flood',    'Low'
    elif temp >= 45:               alert_type, severity = 'heatwave', 'Critical'
    elif temp >= 42:               alert_type, severity = 'heatwave', 'High'
    elif temp >= 40:               alert_type, severity = 'heatwave', 'Moderate'
    elif wind >= 25:               alert_type, severity = 'cyclone',  'High'
    elif wind >= 15:               alert_type, severity = 'cyclone',  'Moderate'

    safety = SAFETY.get(alert_type, SAFETY['default'])
    return {
        'alert_type':   alert_type,
        'severity':     severity,
        'city':         city_name,
        'country':      country,
        'title':        f'{desc} — {city_name}',
        'temperature':  temp,
        'feels_like':   feels,
        'humidity':     humidity,
        'wind_speed':   wind,
        'description':  f'{desc}. {temp}°C (feels {feels}°C), humidity {humidity}%, wind {wind} m/s.',
        'instructions': safety['instructions'],
        'do_list':      safety['do'],
        'dont_list':    safety['dont'],
        'contacts':     EMERGENCY_CONTACTS,
        'live':         True,
        'fetched_at':   datetime.utcnow().isoformat(),
    }


@alerts_bp.route('/', methods=['POST'])
def create_alert():
    data = request.json or {}
    if not data.get('title') or not data.get('alert_type'):
        return jsonify({'error': 'title and alert_type are required'}), 400

    safety = SAFETY.get(data['alert_type'], SAFETY['default'])
    alert = DisasterAlert(
        alert_type   = data['alert_type'],
        severity     = data.get('severity', 'Moderate'),
        title        = data['title'],
        description  = data.get('description', ''),
        region       = data.get('region'),
        district     = data.get('district'),
        state        = data.get('state'),
        latitude     = data.get('latitude'),
        longitude    = data.get('longitude'),
        radius_km    = data.get('radius_km'),
        instructions = data.get('instructions') or safety['instructions'],
        do_list      = json.dumps(data.get('do_list', safety['do'])),
        dont_list    = json.dumps(data.get('dont_list', safety['dont'])),
        contacts     = json.dumps(data.get('contacts', EMERGENCY_CONTACTS)),
        source       = data.get('source', 'CivicSense Admin'),
        created_by   = get_user_id(),
    )
    db.session.add(alert)
    db.session.commit()
    return jsonify(alert.to_dict()), 201


@alerts_bp.route('/<int:alert_id>', methods=['DELETE'])
def deactivate_alert(alert_id):
    alert = DisasterAlert.query.get_or_404(alert_id)
    alert.is_active = False
    db.session.commit()
    return jsonify({'message': 'Alert deactivated'})


@alerts_bp.route('/sms-broadcast', methods=['POST'])
def sms_broadcast():
    """Broadcast SMS disaster alert to all users with phone numbers."""
    data    = request.json or {}
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': 'message required'}), 400

    from routes.auth import _send_sms
    users = User.query.filter(User.phone.isnot(None), User.is_active == True).all()
    sent = 0
    for u in users:
        if u.phone:
            if _send_sms(u.phone, message):
                sent += 1

    return jsonify({'message': f'SMS broadcast sent to {sent} users with registered phones.',
                    'total_with_phone': len(users), 'sent': sent})


@alerts_bp.route('/safety-info/<alert_type>', methods=['GET'])
def safety_info(alert_type):
    """Return detailed safety info for a given alert type."""
    info = SAFETY.get(alert_type, SAFETY['default'])
    return jsonify({**info, 'contacts': EMERGENCY_CONTACTS, 'alert_type': alert_type})
