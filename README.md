# ⚡ SyncSpace

### Real-Time Collaborative Workspace for Student Teams

*Stop juggling WhatsApp, Google Docs, and Excel. Work together, live, in one place.*

![MERN Stack](https://img.shields.io/badge/Stack-MERN-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Socket.io](https://img.shields.io/badge/Realtime-Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge)

[Live Demo](#) · [Report Bug](#) · [Request Feature](#)

---

## 📖 About The Project

Student teams working on hackathons, mini-projects, and group assignments juggle **4–5 disconnected tools** — WhatsApp for chat (messages buried in minutes), Google Docs (no task tracking), Excel or Trello (no live sync with docs), and email for faculty updates.

The result? Missed deadlines, duplicated work, and zero visibility for mentors into what's actually happening.

**SyncSpace** unifies live collaborative editing, task boards, and deadline tracking into **one real-time workspace** — built for how student teams actually work, with role-based access so mentors can observe progress without micromanaging.

> 💡 Built as a portfolio project to demonstrate distributed, real-time systems engineering — the kind of concurrency and conflict-resolution work that separates a "student project" from production-grade thinking.

---

## ✨ Features

### Core

| Feature | Description |
|---|---|
| 📝 **Live Collaborative Editor** | Multiple users edit the same doc simultaneously — no overwrites, no lost changes |
| 🗂️ **Kanban Task Board** | Drag-and-drop task management, synced instantly across every teammate's screen |
| 🔐 **Role-Based Workspaces** | Student (editor), Team Lead (admin), Mentor/Faculty (viewer + comment access) |
| 📅 **Deadline & Milestone Tracker** | Visual timeline with automated reminders so nothing slips through the cracks |
| 📊 **Activity Feed** | Real-time log of who changed what, and when |

### 🚀 What Makes SyncSpace Different

- **🔄 Conflict-Free Live Editing** — Powered by CRDT/OT sync (Yjs), so simultaneous edits *never* overwrite each other — the hardest part of real-time apps, done right.
- **👥 Presence-Aware Cursors** — See teammates' live cursor position and typing indicators, Google Docs/Figma-style.
- **🧠 Smart Standup Digest** — Auto-generates a daily summary of task and document changes per teammate — raw activity, turned into something actually readable.
- **📈 Mentor Insight Dashboard** — Faculty/mentors see team velocity, bottleneck detection (tasks stuck too long), and contribution balance across teammates.
- **📡 Offline-Resilient Sync** — Changes made offline are queued locally and auto-merged on reconnect — built for real network conditions, not just the happy path.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React · Redux Toolkit / Zustand · Tailwind CSS · Framer Motion |
| **Backend** | Node.js · Express · Socket.io |
| **Real-Time Sync Engine** | Yjs (CRDT) |
| **Database** | MongoDB Atlas · Redis (presence & session state) |
| **Auth** | JWT · Role-Based Access Control (RBAC) |
| **DevOps** | Docker · GitHub Actions CI/CD · Render / Vercel |

---

## 🏗️ Architecture Overview

```
React Client  <--- WebSocket (Socket.io) --->  Node/Express Server
     |                                                |
     |  CRDT Sync (Yjs)                               |  REST API
     v                                                v
Redis (Live Presence State)              MongoDB Atlas (Persistent Data)
```

**Flow:** The client connects to the server over both REST (for standard CRUD) and WebSocket (for real-time sync). Document edits flow through Yjs's CRDT engine so concurrent changes merge automatically. Redis holds live presence/session state (who's online, cursor positions) while MongoDB persists documents, tasks, and activity logs.

---

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.x
npm >= 9.x
MongoDB Atlas account
Redis instance
```

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/syncspace.git
cd syncspace

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Environment Setup

Create a `.env` file in `/server`:

```env
MONGO_URI=your_mongodb_atlas_uri
REDIS_URL=your_redis_url
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
PORT=5000
CLIENT_URL=http://localhost:5173
```

### Run Locally

```bash
# Start the backend
cd server
npm run dev

# Start the frontend (in a new terminal)
cd client
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## 📸 Screenshots

> *Add screenshots or a demo GIF here once the UI is built — a 10-second clip of live cursors syncing across two browser windows sells this project instantly.*

| Live Editor | Kanban Board | Mentor Dashboard |
|---|---|---|
| *coming soon* | *coming soon* | *coming soon* |

---

## 🗺️ Roadmap

- [x] Project scoping & architecture design
- [ ] Auth + role-based workspace foundation
- [ ] Kanban board with real-time sync
- [ ] CRDT-based live document editor
- [ ] Presence-aware cursors
- [ ] Mentor insight dashboard
- [ ] Offline-resilient sync
- [ ] Deployment + CI/CD pipeline

See [open issues](#) for the full list of proposed features.

---
