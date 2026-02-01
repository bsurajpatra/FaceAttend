# FaceAttend – Intelligent Face Recognition Attendance System

FaceAttend is a high-performance, hybrid attendance management solution for educational institutions. It combines a **lightweight operational mobile app** for real-time attendance with a **comprehensive web ERP portal** for management and analytics.

The system uses a **triple-tier architecture** separated into a robust Node.js backend, a high-precision Python FaceNet authentication service, and distinct client interfaces for faculty operations.

---

## 🏗️ Architecture

1.  **Mobile Client (React Native + Expo):** A streamlined, high-speed app dedicated to the "field work"—taking live attendance and viewing schedules.
2.  **Web ERP Portal (React + Vite):** The command center. Handles all administrative tasks: student registration, profile management, timetable configuration, and detailed reporting.
3.  **Core Backend (Express + TypeScript):** The central API orchestration layer managing authentication, data integrity, and real-time Socket.IO synchronization.
4.  **FaceNet Microservice (Python):** A dedicated AI service for generating 512-dimensional face embeddings and performing cosine-similarity matching.

---

## 🚀 Key Features

### 🌐 Web ERP Portal (The Command Center)
*   **Centralized Management:** The only place for adding/editing students and managing faculty profiles.
*   **Remote Capture:** Initiate a photo capture request from the Web Portal that instantly triggers the camera on your logged-in mobile device.
*   **Timetable Manager:** Interactive drag-and-drop style interface to configure weekly schedules.
*   **Security Console:** (My Devices) Monitor active sessions, trust/untrust specific mobile devices, and force-logout suspicious connections.
*   **Audit Logs:** Real-time surveillance tracking every login, data change, and attendance event.
*   **Reports & Analytics:** Export professional PDF/CSV reports and view live attendance metrics.

### 📱 Mobile App (The Operational Tool)
*   **Focused UI:** Clutter-free interface designed purely for speed and efficiency in the classroom.
*   **Live Attendance:** Continuous scanning mode marks students in real-time (0.5s intervals).
*   **Smart Dashboard:** Shows ongoing and upcoming classes with "One-Tap" attendance start.
*   **Kiosk Mode:** (Android) Locks the interface during attendance sessions for security.
*   **Real-Time Sync:** Instantly reflects timetable changes and student updates made on the Web Portal.

### 🤖 Intelligent Sync & AI
*   **Socket.IO Real-time Loop:** Changes on the Web Portal (e.g., untrusting a device) reflect on the mobile app within milliseconds.
*   **FaceNet Embeddings:** State-of-the-art deep learning model for high-accuracy face verification.
*   **MFA Security:** OTP-based verification for critical profile changes and logins.

---

## 🛠️ Project Structure

### Web Portal (`web/`)
```bash
web/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx            # Main layout & widget orchestrator
│   │   ├── StudentManagement.tsx    # Filter/Sort/Edit Students
│   │   ├── StudentRegistration.tsx  # Remote Capture & Form
│   │   ├── TimetableManager.tsx     # Schedule & Clash Detection
│   │   ├── AttendanceReports.tsx    # PDF/CSV Logic
│   │   ├── AuditLog.tsx             # Security visualizer
│   │   └── MyDevices.tsx            # Hardware trust management
│   ├── api/                         # Axios client
│   └── lib/                         # Utilities
```

### Mobile App (`client/`)
```bash
client/
├── app/
│   ├── index.tsx                    # Login & Auth Check
│   ├── dashboard.tsx                # Status & Quick Actions
│   ├── take-attendance.tsx          # Camera & Recognition Loop
│   ├── timetable.tsx                # Read-only Schedule View
│   └── settings.tsx                 # App Preferences
├── components/
│   ├── live-attendance.tsx          # Real-time Face Processing
│   └── GlobalCaptureModal.tsx       # Socket-triggered camera
```

### Backend Services
*   **`server/` (Node.js):** REST API, Socket.IO handlers, Database (MongoDB) connection, and Email services.
*   **`facenet_service/` (Python):** Flask API exposing `/recognize` and `/train` endpoints.

---

## 🧭 Setup & Installation

### 1. Prerequisites
*   Node.js (v18+) & Python (v3.9+)
*   MongoDB (Local or Atlas)
*   Expo Go app (for mobile testing)

### 2. Start Instructions

**Step 1: Start the AI Service**
```bash
cd facenet_service
# Create venv if needed
pip install -r requirements.txt
python face_recognition_service.py
```

**Step 2: Start the Backend API**
```bash
cd server
npm install
# Create .env file with your configs
npm run dev
```

**Step 3: Start the Web Portal**
```bash
cd web
npm install
npm run dev
```

**Step 4: Start the Mobile App**
```bash
cd client
npm install
npx expo start
```

---

## 🔒 Security Highlights

1.  **Device Fingerprinting:** Every mobile login captures device ID, model, and OS version.
2.  **Trust Policy:** Admin/Faculty must explicitly "Trust" a mobile device from the Web Portal before it can be used for taking attendance.
3.  **Audit Trails:** Immutable logs for all critical actions (Login, Logout, Data Modification).
4.  **JWT + Refresh Tokens:** Secure session management with automatic expiration.

---

**FaceAttend** — *Secure, Fast, and Smart Classroom Management.*
