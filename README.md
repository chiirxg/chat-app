# 💬 SOC Real-Time Chat App (Weeks 1 - 8)

A modern, full-stack real-time chat application built with **React**, **Vite**, **Firebase Authentication**, **Cloud Firestore**, **Firebase Realtime Database**, **Firebase Storage**, and custom CSS.

![Tech Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-v10-FFCA28?logo=firebase&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Feature Breakdown by Week

### 🔹 Week 1 & 2: Web Foundations & JavaScript Essentials
- **Two-Column Layout**: Left sidebar with search & room list + right real-time chat window.
- **Dynamic DOM & State**: Real-time input handling, auto-scrolling (`scrollIntoView`), timestamps, and responsive mobile flex layout.

### 🔹 Week 3: React Fundamentals
- Componentized architecture (`Sidebar.jsx`, `ChatWindow.jsx`, `MessageBubble.jsx`, `MessageInput.jsx`, `NewRoomModal.jsx`).
- Props & state flow with React Hooks (`useState`, `useEffect`, `useRef`, `useContext`).

### 🔹 Week 4: Firebase Authentication
- **Google & Email Auth**: Google Popup sign-in & Email/Password sign-up/login.
- **Context API (`AuthContext`)**: Global state tracking user authentication state (`onAuthStateChanged`).
- **Protected Routes (`ProtectedRoute.jsx`)**: Guards private chat routes with loading spinner fallback.
- **User Profile**: Display photo, name, and email in sidebar header.

### 🔹 Week 5: Real-Time Messaging (Cloud Firestore)
- **Real-time Listener (`onSnapshot`)**: Instant updates for incoming/outgoing messages.
- **Collections Structure**:
  - `users/{uid}`: Stores user metadata & last seen timestamp.
  - `rooms/{roomId}`: Stores chat room metadata.
  - `rooms/{roomId}/messages/{messageId}`: Message documents ordered by timestamp ascending.
- Auto-scroll to latest message & loading spinners.

### 🔹 Week 6: Chat Rooms, RTDB Presence & Typing Indicators
- **Multi-Room Navigation**: Create public/custom chat rooms in Firestore and switch dynamically.
- **Online/Offline Presence (Firebase Realtime Database)**:
  - Tracks user connection status (`/status/{uid}`).
  - Automatically marks status as `"offline"` on tab close/disconnect using `onDisconnect()`.
  - Displays green/gray status dots next to user profiles.
- **Real-Time Typing Indicators**: Shows "... is typing" indicator in RTDB (`/typing/{roomId}`) while typing with auto-clear timeout.

### 🔹 Week 7: Media, Emoji Picker & Dark Mode
- **Image Attachments (Firebase Storage)**: Upload images to `chat-images/{roomId}/...` with progress indicator, thumbnail preview, and full-screen lightbox viewer.
- **Emoji Picker**: Popover emoji selector powered by `emoji-picker-react`.
- **Dark / Light Theme Toggle**: Dynamic CSS variables persisted in `localStorage`.

### 🔹 Week 8: Security & Environment Hardening
- **Environment Variables**: `.env` and `.env.example` using `VITE_FIREBASE_` prefixes.
- **Firestore Security Rules**: Authenticated access control with ownership validation (`firestore.rules`).

---

## 🏗️ Architecture & Data Model

```mermaid
graph TD
    User([User Device]) -->|Auth| FirebaseAuth[Firebase Authentication]
    User -->|Real-time Messages| Firestore[(Cloud Firestore)]
    User -->|Presence & Typing| RTDB[(Realtime Database)]
    User -->|Image Uploads| Storage[(Firebase Storage)]

    subgraph Firestore Data Schema
        Firestore --> UsersCol[users/{uid}]
        Firestore --> RoomsCol[rooms/{roomId}]
        RoomsCol --> MessagesSub[messages/{messageId}]
    end
```

---

## 🚀 How to Run Locally

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/chiirxg/chat-app.git
cd chat-app
npm install
```

### 2. Configure Firebase Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📋 What You Need To Do Yourself (Manual Steps Checklist)

To complete your assignment submission, perform the following setup steps in your Google/Firebase account:

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com).
   - Create a project named `chat-app` (disable Google Analytics).
   - Register a Web App (`</>`) and copy your Firebase Config into your `.env` file.

2. **Enable Firebase Features**:
   - **Authentication**: Enable **Google Sign-in** & **Email/Password**.
   - **Firestore Database**: Click "Create Database" -> start in **Test mode**.
   - **Realtime Database**: Click "Create Database" -> start in **Test mode**.
   - **Firebase Storage**: Click "Get Started" -> enable storage bucket.

3. **Deploy Web App (Vercel or Firebase Hosting)**:
   - **Vercel**: Push to GitHub, import project on Vercel, and add your `VITE_FIREBASE_...` environment variables in Vercel settings.
   - **Firebase Hosting**: Run `npm install -g firebase-tools`, `firebase login`, `firebase init hosting`, `npm run build`, and `firebase deploy`.

4. **Media & Showcase**:
   - Take screenshots of: Login screen, Chat room view, Image attachment view, Mobile view, and Dark mode.
   - Record a short 60-second screen recording showing real-time messaging between two browser tabs.
   - Add your live URL and GitHub repo link ([`https://github.com/chiirxg/chat-app`](https://github.com/chiirxg/chat-app)) to your LinkedIn & resume.
