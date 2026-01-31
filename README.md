# FaceAttend – Face Recognition Attendance System

FaceAttend is a modern, high-performance attendance management solution designed for educational institutions. Optimized for speed, security, and ease of use, it leverages advanced face recognition technology (FaceNet) to identify students and mark attendance in real-time. 

The system features a **triple-tier architecture** with a **Cross-Platform Mobile App** for attendance operations and a **Premium Web ERP Portal** for comprehensive management and reporting.

---

## 🏗️ Architecture

FaceAttend is built on four core pillars:

1.  **Mobile Client (React Native + Expo):** Focused on classroom operations—taking live attendance in Kiosk Mode and acting as a remote face capture device.
2.  **Web ERP Portal (React + Vite):** A premium management dashboard for faculty to manage schedules, students, and generate analytics/reports.
3.  **Core Backend (Express + TypeScript):** The central API hub managing JWT auth, MongoDB data, and real-time synchronization via **Socket.io**.
4.  **FaceNet Microservice (Python + Flask):** Handles high-accuracy 512-dimensional face embeddings and cosine-similarity matching.

---

## 🚀 Key Features

### 🌐 Premium Web ERP Portal
*   **Intelligent Student Registration:** Multi-step form with real-time **Mobile Sync**. Trigger your mobile camera from your PC to capture student faces.
*   **Advanced Student Management:** Search, filter, and manage thousands of student records with custom integrated modals.
*   **Visual Timetable Manager:** A sleek, interactive interface to configure your weekly teaching schedule with clash detection and real-time dashboard updates.
*   **Faculty Activity Summary:** Live analytics dashboard tracking weekly attendance rates, total sessions, and class-wise performance.
*   **Global Audit Log:** (Security Logs) Real-time surveillance of all system activities. Capture every login, device update, and schedule change with detailed IP/platform tracing.
*   **Hardware Security Console:** (My Devices) Manage and monitor all devices logged into your account. Features **Live Remote Logout** and **Single-Device Trust Policy**.
*   **Professional Exports:** One-tap export of any report or student list to professional **PDF** or **CSV** formats.
*   **Premium UI/UX:** Stunning "Glassmorphism" design with smooth micro-animations, unified brand aesthetics, and a functional **Search Console** for quick navigation.

### 📱 Operational Mobile App
*   **Live Attendance Loop:** High-speed face recognition camera that scans and marks attendance every 0.5s–3s with instant feedback.
*   **Global Sync Modal:** Automatically pops up when a request is sent from the Web ERP to capture a student's face.
*   **Live Remote Control:** Mobile app responds instantly to "Force Logout" or "Trust Update" signals sent from the Web ERP console.
*   **Platform Intelligence**: Automatically identifies as a mobile origin for security logs and audit tracking.
*   **Secure Kiosk Mode:** (Android only) Locks the device to the attendance screen, preventing unauthorized access.

### 🤖 FaceNet Recognition
*   **MTCNN Detection:** Multi-task CNN for robust face detection even in challenging classroom lighting.
*   **Deep Embeddings:** Generates 512-bit biometric signatures that are unique and secure.
*   **Cosine Similarity Matching:** High-precision matching (default 0.6 threshold) ensures accurate identification.

---

## 🔄 The "Magic" Sync: Web + Mobile
One of FaceAttend's most powerful features is the **seamless synchronization** via WebSockets (Socket.io):

1.  **Student Registration:** Click "Initiate Capture" on PC -> Phone camera wakes up -> Preview appears instantly on PC.
2.  **Timetable Updates:** Save schedule on ERP -> All mobile devices sync their local timetable data instantly.
3.  **Security Events:** Revoke a device on Web -> The mobile app is immediately logged out and session tokens are cleared.
4.  **Live Audit:** Perform any action on Mobile -> The Web ERP **Security Logs** refresh in real-time with origin details.
5.  **Attendance metrics:** Mark attendance on Mobile -> Web Dashboard metrics (Faculty Activity Summary) refresh live.

---

## 🛠️ Project Structure

### Web Portal (`web/`)
```bash
web/
├── src/
│   ├── components/
│   │   ├── FacultyActivitySummary.tsx # Live analytics & Metrics
│   │   ├── MyDevices.tsx            # Security Console + Live Logout
│   │   ├── AuditLog.tsx             # Real-time Activity Surveillance
│   │   ├── AttendanceReports.tsx    # PDF/CSV Export + Analytics
│   │   ├── StudentManagement.tsx    # Advanced Filters + Mobile Sync
│   │   ├── StudentRegistration.tsx  # Dynamic Forms + Socket Sync
│   │   └── TimetableManager.tsx     # Schedule Configuration
│   ├── api/                         # Axios interceptors + Typed APIs
│   └── styles/                      # Premium CSS Design System
```

### Mobile App (`client/`)
```bash
client/
├── app/                             # Expo Router Navigation
│   ├── index.tsx                    # Auth state & Force Logout listener
│   ├── take-attendance.tsx          # Main capture operation
├── components/
│   ├── live-attendance.tsx          # Real-time scan logic
│   ├── GlobalCaptureModal.tsx       # Remote sync camera
├── contexts/                        # Kiosk & Socket state (Live Sync)
```

### Backend & AI (`server/` + `facenet_service/`)
*   **Server:** Express API handling MongoDB, JWT, Audit Logging, and Socket Rooms (`faculty_[id]`).
*   **AI Service:** Flask API providing `/api/recognize` and `/api/compare`.

---

## 🧭 Setup & Installation

### 1. Prerequisites
*   Node.js (v18+) & Python (v3.9+)
*   MongoDB running locally or on Atlas
*   Expo Go app on your mobile for testing

### 2. Fast Start (All Services)
```bash
# Clone the repository
git clone https://github.com/your-repo/faceattend.git
cd faceattend

# Run the unified start script (Windows/Linux)
./start-services.sh
```

### 3. Manual Component Start
**Backend:**
```bash
cd server && npm install && npm run dev
```
**AI Service:**
```bash
cd facenet_service && pip install -r requirements.txt && python face_recognition_service.py
```
**Web Portal:**
```bash
cd web && npm install && npm run dev
```
**Mobile App:**
```bash
cd client && npm install && npx expo start
```

---

## 🔒 Security & Performance
*   **Global Activity Surveillance:** Every login, device change, and schedule update is recorded with IP and platform tracing.
*   **JWT Authentication:** All APIs are protected by signed JSON Web Tokens.
*   **Single-Device Policy:** Attendance operations restricted to a single trusted device.
*   **Live Session Kill:** Web-to-Device WebSocket signals allow instant termination of sessions.
*   **Bcrypt Hashing:** Passwords are never stored in plain text.

---

## 📈 Future Roadmap
- [ ] Multiple face detection in a single frame.
- [ ] Offline attendance storage with sync-later capability.
- [ ] Automated push notifications for absent students.
- [ ] Liveness detection to prevent photo-spoofing.

---
**FaceAttend** – *The future of classroom accountability.*
