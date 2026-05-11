import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    SECRET_KEY     = os.getenv('SECRET_KEY', 'civicsense-dev-secret-2024')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'civicsense-jwt-production-secret-key-2024')

    # SQLite for development — change to MySQL URI in production
    _db_path = os.path.join(os.path.dirname(__file__), 'civicsense.db')
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f'sqlite:///{_db_path}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=4)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_TOKEN_LOCATION        = ['headers', 'cookies']
    JWT_COOKIE_SECURE         = False
    JWT_COOKIE_CSRF_PROTECT   = False

    UPLOAD_FOLDER      = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

    WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')
    WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5'

    MAIL_SERVER          = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT            = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS         = True
    MAIL_USERNAME        = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD        = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER  = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@civicsense.in')

    TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
    TWILIO_AUTH_TOKEN  = os.getenv('TWILIO_AUTH_TOKEN', '')
    TWILIO_FROM_NUMBER = os.getenv('TWILIO_FROM_NUMBER', '')

    APP_URL = os.getenv('APP_URL', 'http://localhost:5173')
