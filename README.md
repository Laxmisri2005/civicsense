# CivicSense — Community & Disaster Support Platform

Anonymous civic issue reporting, disaster alerts, community help, emergency SOS, and more. Built for India.

---

## How to Run

### Step 1 — Backend (Flask)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate
source venv/bin/activate          # Mac/Linux
venv\Scripts\activate             # Windows

# Install packages
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env — set WEATHER_API_KEY for live weather (optional)

# Start server
python run.py
# Backend runs at: http://localhost:5000
```

### Step 2 — Frontend (React)

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
# Frontend runs at: http://localhost:3000
```

### Step 3 — Open the app

Go to **http://localhost:3000** in your browser.

- Register an account or browse anonymously
- To test authority features: go to Admin panel and change your role to `authority`

---

## Pages

| Page | URL | Notes |
|---|---|---|
| Dashboard | / | Live stats, recent issues, quick actions |
| Civic Issues | /issues | Report, search, filter, AI categorize |
| Issue Map | /map | OpenStreetMap with all geotagged issues |
| Disaster Alerts | /alerts | Live weather + do/don't safety instructions |
| Community Help | /help | Need/Offer board with location |
| Emergency SOS | /emergency | Offline queue, syncs when back online |
| Stories | /stories | Share experiences with dharma lessons |
| Volunteers | /volunteers | Create and join volunteer missions |
| Budget Votes | /budget | Vote on civic budget priorities |
| About | /about | Live stats + emergency contacts |
| Analytics | /analytics | Authority dashboard (login required) |
| Admin Panel | /admin | User management (admin role required) |
| Profile | /profile | Edit profile, verify email, NGO badge |
| Forgot Password | /forgot-password | OTP-based password reset |

---

## Environment Variables (backend/.env)

```
WEATHER_API_KEY=your_openweathermap_key    # free at openweathermap.org
MAIL_USERNAME=your@gmail.com               # for email verification OTP
MAIL_PASSWORD=your_gmail_app_password      # Gmail App Password
TWILIO_ACCOUNT_SID=ACxxx                   # optional SMS alerts
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1234567890
```

All variables are optional. Without them:
- Weather: shows a message to set API key
- Email OTP: prints to terminal (still works for dev)
- SMS: logs to terminal

---

## Database

SQLite by default (no setup needed). For MySQL in production:
```
DATABASE_URL=mysql+pymysql://user:password@localhost/civicsense_db
```

The database is created automatically on first run.

---

## Tech Stack

**Backend:** Python 3.10+, Flask, SQLAlchemy, Flask-JWT-Extended, bcrypt, scikit-learn, Flask-Mail  
**Frontend:** React 18, Vite, React Router 6, Axios, Leaflet.js  
**Database:** SQLite (dev) / MySQL (production)
