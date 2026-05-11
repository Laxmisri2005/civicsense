"""
AI Tools Route — issue categorization, duplicate detection, translation.
Uses scikit-learn TF-IDF for real ML, deep-translator for real translation.
"""
from flask import Blueprint, request, jsonify
from database import db
from models import Issue
import re

ai_bp = Blueprint('ai', __name__)

# ─── AI ISSUE CATEGORIZER ─────────────────────────────────────────────────────
# Keyword → category mapping trained on Indian civic vocabulary
CATEGORY_KEYWORDS = {
    'Road & Infrastructure': [
        'pothole', 'road', 'footpath', 'pavement', 'divider', 'speed breaker',
        'bridge', 'flyover', 'median', 'tar', 'crack', 'broken road', 'uneven',
        'railing', 'guard rail', 'drainage road', 'construction road'
    ],
    'Water Supply': [
        'water', 'pipe', 'supply', 'pipeline', 'leakage', 'leak', 'tap',
        'borewell', 'tanker', 'contaminated water', 'dirty water', 'no water',
        'water board', 'meter', 'connection', 'pressure', 'drinking water'
    ],
    'Drainage & Sewage': [
        'drain', 'sewage', 'sewer', 'manhole', 'stagnant', 'waterlogging',
        'flooding', 'blocked drain', 'overflow', 'gutter', 'naala', 'nala',
        'storm drain', 'open drain', 'choked'
    ],
    'Electricity': [
        'light', 'electricity', 'power', 'electric', 'wire', 'transformer',
        'street light', 'pole', 'sparks', 'tripping', 'blackout', 'power cut',
        'voltage', 'meter', 'illegal connection', 'EB', 'DISCOM'
    ],
    'Sanitation & Waste': [
        'garbage', 'waste', 'trash', 'litter', 'dump', 'dustbin', 'sweeping',
        'dirty', 'filth', 'plastic', 'rubbish', 'cleaning', 'kachara', 'bin'
    ],
    'Pollution': [
        'pollution', 'smoke', 'smell', 'odour', 'noise', 'factory', 'emission',
        'chemical', 'burning', 'stench', 'toxic', 'river pollution', 'lake'
    ],
    'Public Safety': [
        'unsafe', 'danger', 'accident', 'hazard', 'dark', 'unlit', 'theft',
        'abandoned', 'suspicious', 'fire risk', 'wall collapsed', 'falling'
    ],
    'Parks & Public Spaces': [
        'park', 'garden', 'playground', 'bench', 'tree', 'grass', 'public space',
        'open area', 'ground', 'recreation', 'children park'
    ],
    'Encroachment': [
        'encroach', 'illegal', 'occupy', 'hawker', 'vendor', 'blocking',
        'footpath encroach', 'shop', 'construction illegal', 'land grab'
    ],
    'Government Services': [
        'certificate', 'ration', 'pension', 'aadhaar', 'bribery', 'corruption',
        'office', 'delay', 'government', 'welfare', 'scheme', 'subsidy'
    ],
    'Transport & Traffic': [
        'bus', 'traffic', 'signal', 'zebra', 'crossing', 'transport',
        'auto', 'parking', 'route', 'stop', 'speed', 'vehicle'
    ],
    'Healthcare': [
        'hospital', 'doctor', 'medicine', 'ambulance', 'clinic', 'health',
        'nurse', 'treatment', 'medical', 'PHC', 'dispensary'
    ],
    'Education': [
        'school', 'teacher', 'student', 'midday meal', 'classroom', 'education',
        'anganwadi', 'toilet school', 'dropout', 'child labour'
    ],
    'Animal & Wildlife': [
        'dog', 'stray', 'cattle', 'animal', 'cow', 'snake', 'bird',
        'cruelty', 'slaughter', 'dead animal', 'bite', 'menace'
    ],
    'Disaster & Emergency': [
        'flood', 'fire', 'collapse', 'cyclone', 'earthquake', 'landslide',
        'gas leak', 'explosion', 'emergency', 'disaster', 'rescue'
    ],
}


def _categorize(text):
    """Score text against category keywords and return best match + confidence."""
    text_lower = text.lower()
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score: scores[cat] = score
    if not scores:
        return 'Other', 0.0
    best_cat   = max(scores, key=scores.get)
    total_hits = sum(scores.values())
    confidence = round(scores[best_cat] / total_hits, 2)
    return best_cat, confidence


def _detect_duplicates(title, description, category, threshold=0.6):
    """TF-IDF cosine similarity to find similar existing issues."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        import numpy as np

        existing = Issue.query.filter_by(category=category)\
            .filter(Issue.status != 'Resolved')\
            .order_by(Issue.created_at.desc()).limit(200).all()

        if not existing:
            return []

        new_text      = f"{title} {description}"
        existing_texts = [f"{i.title} {i.description}" for i in existing]
        all_texts      = existing_texts + [new_text]

        vectorizer = TfidfVectorizer(stop_words='english', max_features=500)
        tfidf      = vectorizer.fit_transform(all_texts)
        sims       = cosine_similarity(tfidf[-1:], tfidf[:-1])[0]

        results = []
        for idx, sim in enumerate(sims):
            if sim >= threshold:
                issue = existing[idx]
                results.append({
                    'id':         issue.id,
                    'title':      issue.title,
                    'status':     issue.status,
                    'upvotes':    issue.upvotes,
                    'created_at': issue.created_at.isoformat(),
                    'similarity': round(float(sim), 2),
                })
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:5]
    except Exception as e:
        print(f"[AI] Duplicate detection error: {e}")
        return []


# ─── POST auto-categorize ─────────────────────────────────────────────────────
@ai_bp.route('/categorize', methods=['POST'])
def categorize():
    data        = request.json or {}
    title       = data.get('title', '')
    description = data.get('description', '')
    text        = f"{title} {description}"
    if len(text.strip()) < 3:
        return jsonify({'error': 'Provide title or description'}), 400

    category, confidence = _categorize(text)

    # Also return top subcategories
    from routes.issues import CATEGORIES
    subcategories = CATEGORIES.get(category, [])

    return jsonify({
        'suggested_category': category,
        'confidence':         confidence,
        'subcategories':      subcategories,
        'all_scores':         {
            cat: sum(1 for kw in kws if kw in text.lower())
            for cat, kws in CATEGORY_KEYWORDS.items()
            if sum(1 for kw in kws if kw in text.lower()) > 0
        }
    })


# ─── POST duplicate detection ─────────────────────────────────────────────────
@ai_bp.route('/duplicates', methods=['POST'])
def find_duplicates():
    data        = request.json or {}
    title       = data.get('title', '')
    description = data.get('description', '')
    category    = data.get('category', '')
    if not title:
        return jsonify({'error': 'title required'}), 400

    duplicates = _detect_duplicates(title, description, category)
    return jsonify({'duplicates': duplicates, 'count': len(duplicates)})


# ─── POST translate text ──────────────────────────────────────────────────────
@ai_bp.route('/translate', methods=['POST'])
def translate():
    """
    Translate text to target language.
    Supported: en (English), hi (Hindi), te (Telugu), ta (Tamil)
    """
    data   = request.json or {}
    text   = data.get('text', '').strip()
    target = data.get('target', 'en')
    source = data.get('source', 'auto')

    if not text:
        return jsonify({'error': 'text is required'}), 400
    if target not in ('en', 'hi', 'te', 'ta'):
        return jsonify({'error': 'target must be en, hi, te, or ta'}), 400
    if len(text) > 5000:
        return jsonify({'error': 'Text too long (max 5000 chars)'}), 400

    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source=source, target=target).translate(text)
        return jsonify({'translated': translated, 'source': source, 'target': target, 'original': text, 'success': True})
    except Exception as e:
        # Translation service may be unavailable in some environments
        lang_names = {'hi': 'Hindi', 'te': 'Telugu', 'ta': 'Tamil', 'en': 'English'}
        return jsonify({
            'error': 'translation_unavailable',
            'message': f'Translation to {lang_names.get(target, target)} is unavailable in this environment. Configure internet access to enable it.',
            'original': text,
            'target': target,
            'success': False
        }), 200


# ─── POST detect language ─────────────────────────────────────────────────────
@ai_bp.route('/detect-language', methods=['POST'])
def detect_language():
    data = request.json or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'text required'}), 400
    try:
        from langdetect import detect, detect_langs
        lang     = detect(text)
        all_langs = [{'lang': l.lang, 'prob': round(l.prob, 3)} for l in detect_langs(text)]
        LANG_NAMES = {'en': 'English', 'hi': 'Hindi', 'te': 'Telugu', 'ta': 'Tamil',
                      'mr': 'Marathi', 'bn': 'Bengali', 'gu': 'Gujarati', 'kn': 'Kannada'}
        return jsonify({'detected': lang, 'name': LANG_NAMES.get(lang, lang), 'all': all_langs})
    except Exception as e:
        return jsonify({'detected': 'en', 'name': 'English', 'error': str(e)})


# ─── POST send SMS disaster alert ────────────────────────────────────────────
@ai_bp.route('/sms-alert', methods=['POST'])
def send_sms_alert():
    """Send SMS disaster alert — uses Twilio if configured, logs to console otherwise."""
    data    = request.json or {}
    phone   = data.get('phone', '').strip()
    message = data.get('message', '').strip()
    if not phone or not message:
        return jsonify({'error': 'phone and message required'}), 400
    if len(message) > 160:
        message = message[:157] + '...'

    from routes.auth import _send_sms
    sent = _send_sms(phone, f"[CivicSense Alert] {message}")
    return jsonify({'sent': sent, 'message': message,
                    'note': 'Set TWILIO_* env vars for real SMS delivery'})
