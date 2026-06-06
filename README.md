# Smart Attendance Management System (SAMS)

Face-recognition attendance system for Arba Minch University.

- **Backend:** Python, Flask, SQLAlchemy, SQLite
- **Frontend:** React (Vite), React Router

## Features

| Role | Capabilities |
|------|----------------|
| **Admin** | User management, student registration, face capture, database backup |
| **Instructor** | Prepare face recognition, live attendance capture, course reports |
| **Department Head** | Department-wide and section attendance reports |
| **Student** | Presents face at camera (no login) |

## Quick start

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements-core.txt
copy .env.example .env
python seed.py
python run.py
```

API runs at **http://127.0.0.1:5000**

### Frontend (development)

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

Vite proxies `/api` requests to the Flask backend.

### Frontend (production)

```powershell
cd frontend
npm install
npm run build
```

Then start Flask — it serves the built app from `frontend/dist/` at **http://127.0.0.1:5000**

### Face recognition (live attendance)

**Windows (recommended):**

```powershell
cd backend
.\venv\Scripts\activate
.\scripts\install-face-windows.ps1
```

Then **restart Flask** (`python run.py`).

This installs `opencv-python`, `face-recognition`, and a **prebuilt dlib wheel** (needed because `pip install dlib` usually fails on Windows without Visual Studio C++).

**Linux / macOS:**

```powershell
pip install -r requirements-face.txt
pip install dlib
```

**After installing:** re-capture student faces (or run **Prepare Recognition** again) so encodings are generated. Existing photos saved without `face_recognition` may have no encodings until re-captured.

## Demo accounts

| Username   | Password     | Role            |
|------------|--------------|-----------------|
| admin      | password123  | System Admin    |
| instructor | password123  | Instructor      |
| depthead   | password123  | Department Head |

## Typical workflow

1. **Admin** registers students in a section and captures face photos.
2. **Instructor** prepares recognition for a course, then starts an attendance session.
3. Students present their faces; attendance is recorded automatically.
4. **Instructor** and **department head** view attendance reports.
5. **Admin** creates database backups from the Database page.

## Project structure

```
sams/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── instance/          # SQLite database
│   ├── uploads/faces/     # Student face images
│   ├── encodings/         # Prepared recognition indexes
│   ├── seed.py
│   └── run.py
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── config/
    │   ├── context/
    │   ├── pages/
    │   └── styles/
    └── vite.config.js
```

## React routes

| Path | Page | Role |
|------|------|------|
| `/` | Landing page | Public |
| `/login` | Login | Public |
| `/admin` | Admin dashboard | admin |
| `/admin/users` | User management | admin |
| `/admin/students` | Student registration | admin |
| `/admin/database` | Database backup | admin |
| `/instructor` | Instructor dashboard | instructor |
| `/instructor/prepare` | Prepare face recognition | instructor |
| `/instructor/attendance` | Live attendance capture | instructor |
| `/instructor/reports` | Attendance reports | instructor |
| `/dept-head` | Department head dashboard | department_head |
| `/dept-head/reports` | Department-wide reports | department_head |
| `/dept-head/summary` | Section summary report | department_head |

## Implementation phases

- [x] Phase 0: Foundation + React frontend shell
- [x] Phase 1: User management CRUD
- [x] Phase 2: Student registration + face capture
- [x] Phase 3: Face recognition preparation
- [x] Phase 4: Live attendance capture
- [x] Phase 5: Reports
- [x] Phase 6: Admin backup + polish
