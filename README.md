# CivicSense — Community & Disaster Support Platform

<div align="center">

### 🎬 Click the image to watch the demo

[![CivicSense](YOUR_IMAGE_URL_HERE)](https://youtu.be/k1xlRCVUKa8?si=nvaFi0ly4y7rlQDV)

</div>

Anonymous civic issue reporting, disaster alerts, community help, emergency SOS, and more. Built for India.

## Tech Stack

**Backend:** Python 3.10+, Flask, SQLAlchemy, Flask-JWT-Extended, bcrypt, scikit-learn, Flask-Mail  
**Frontend:** React 18, Vite, React Router 6, Axios, Leaflet.js  
**Database:** SQLite (dev) / MySQL (production)

## How to Run

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python run.py               # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev                 # http://localhost:3000
```
## Environment Variables
WEATHER_API_KEY=your_openweathermap_key
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your_gmail_app_password
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1234567890

> All variables are optional — features degrade gracefully without them.

## Pages

| Page | URL |
|------|-----|
| Dashboard | / |
| Civic Issues | /issues |
| Issue Map | /map |
| Disaster Alerts | /alerts |
| Community Help | /help |
| Emergency SOS | /emergency |
| Volunteers | /volunteers |
| Budget Votes | /budget |
| Analytics | /analytics |
| Admin Panel | /admin |

## Database

SQLite by default — no setup needed. For MySQL in production:
DATABASE_URL=mysql+pymysql://user:password@localhost/civicsense_db

## License

MIT
