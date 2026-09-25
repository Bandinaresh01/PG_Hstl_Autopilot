# hostel-crm

UrbanNest Hostel Management System - Minimal Starter Setup

## Frontend

### Start Command
```bash
cd frontend
npm install
npm run dev
```

Runs the Vite dev server at `http://localhost:5173`.

## Backend

### Start Command
```bash
cd backend
python -m venv .venv
# Activate environment:
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# Windows (cmd): .venv\Scripts\activate.bat
# Linux/macOS: source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

Runs the Flask API server at `http://localhost:5000`.

### Health Check
- URL: `GET http://localhost:5000/api/health`
- Response: `{"status": "ok"}`
