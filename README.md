# CivicSense — Community & Disaster Support Platform

<div align="center">

### 🎬 Click the image to watch the demo

[![CivicSense](https://github.com/Laxmisri2005/civicsense/blob/02d5d8f90ccfed94897adb326c27aea07c87ee85/civicsense.png)](https://youtu.be/k1xlRCVUKa8?si=nvaFi0ly4y7rlQDV)

[GitHub Repository](https://github.com/Laxmisri2005/civicsense)

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=flat-square&logo=flask&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=flat-square&logo=sqlite&logoColor=white)

</div>

---

Anonymous civic issue reporting, disaster alerts, community help, emergency SOS, and more. Built for India.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router 6, Axios, Leaflet.js |
| Backend | Python 3.10+, Flask, SQLAlchemy, Flask-JWT-Extended, bcrypt, scikit-learn, Flask-Mail |
| Database | SQLite (dev) / MySQL (production) |

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Dashboard | / | Live stats, recent issues, quick actions |
| Civic Issues | /issues | Report, search, filter, AI categorize |
| Issue Map | /map | OpenStreetMap with geotagged issues |
| Disaster Alerts | /alerts | Live weather + safety instructions |
| Community Help | /help | Need/Offer board with location |
| Emergency SOS | /emergency | Offline queue, syncs when back online |
| Volunteers | /volunteers | Create and join volunteer missions |
| Budget Votes | /budget | Vote on civic budget priorities |
| Analytics | /analytics | Authority dashboard (login required) |
| Admin Panel | /admin | User management (admin role required) |

---

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

---

## Environment Variables

```env
WEATHER_API_KEY=your_openweathermap_key
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=your_gmail_app_password
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1234567890
```

> All variables are optional — features degrade gracefully without them.

---

## Database

SQLite by default — no setup needed. For MySQL in production:

```env
DATABASE_URL=mysql+pymysql://user:password@localhost/civicsense_db
```

---

## License

MIT
