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
*   **Advanced Student Management:** Search, filter, and manage thousands of student records. Edit profiles or recapture face data with one click.
*   **Visual Timetable Manager:** A sleek, interactive interface to configure your weekly teaching schedule with clash detection.
*   **Comprehensive Analytics:** Detailed attendance reports with percentages, last-present tracking, and location data.
*   **Professional Exports:** One-tap export of any report or student list to professional **PDF** or **CSV** formats.
*   **Premium UI/UX:** Stunning "Glassmorphism" design with smooth micro-animations and a unified dark/light theme.

### 📱 Operational Mobile App
*   **Live Attendance Loop:** High-speed face recognition camera that scans and marks attendance every 0.5s–3s with instant feedback.
*   **Secure Kiosk Mode:** (Android only) Locks the device to the attendance screen, preventing unauthorized access while the phone is with a student representative.
*   **Global Sync Modal:** Automatically pops up when a request is sent from the Web ERP to capture a student's face.
*   **Location Intelligence:** Automatically captures GPS coordinates and reverse-geocoded addresses for every attendance session.
*   **Real-time Feedback:** Visual/Haptic cues for "Marked", "Already Marked", or "Not Found" status.

### 🤖 FaceNet Recognition
*   **MTCNN Detection:** Multi-task CNN for robust face detection even in challenging classroom lighting.
*   **Deep Embeddings:** Generates 512-bit biometric signatures that are unique and secure.
*   **Cosine Similarity Matching:** High-precision matching (default 0.6 threshold) ensures accurate identification without false positives.

---

## 🔄 The "Magic" Sync: Web + Mobile
One of FaceAttend's most powerful features is the **seamless synchronization** between the Web Portal and the Mobile App via WebSockets (Socket.io):

1.  **Faculty** opens the **Web ERP** and clicks "Register Student".
2.  After entering details, they click "Initiate Capture".
3.  The **Mobile App** (in the faculty's pocket or hand) instantly wakes up and opens the camera.
4.  The photo is captured on the phone, processed, and the **Web ERP** automatically updates with the preview.
5.  This avoids the need to transfer files or use low-quality webcams.

---

## 🛠️ Project Structure

### Web Portal (`web/`)
```bash
web/
├── src/
│   ├── components/
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
│   ├── take-attendance.tsx          # Main capture operation
│   └── manage-students.tsx          # On-the-go student list
├── components/
│   ├── live-attendance.tsx          # Real-time scan logic
│   ├── GlobalCaptureModal.tsx       # Remote sync camera
│   └── PasswordModal.tsx            # Kiosk security
├── contexts/                        # Kiosk & Socket state
```

### Backend & AI (`server/` + `facenet_service/`)
*   **Server:** Express API handling MongoDB, JWT, and Socket Rooms (`faculty_[id]`).
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
*   **JWT Authentication:** All APIs are protected by signed JSON Web Tokens.
*   **Bcrypt Hashing:** Passwords are never stored in plain text.
*   **Rate Limiting:** Session creation is throttled to prevent spam.
*   **Kiosk Security:** Prevents navigation while students are marking attendance via physical hardware button blocking (Android).

---

## 📈 Future Roadmap
- [ ] Multiple face detection in a single frame.
- [ ] Offline attendance storage with sync-later capability.
- [ ] Automated push notifications for absent students.
- [ ] Liveness detection to prevent photo-spoofing.

---
**FaceAttend** – *The future of classroom accountability.*
