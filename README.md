# EduNexus: AI-Powered Unified Educational Ecosystem

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/Google_Gemini_AI-1.5_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase_Firestore-Cloud_DB-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Atharva College of Engineering](https://img.shields.io/badge/ACE-IT_Department-E23B2F?style=for-the-badge)](https://atharvacoe.ac.in/)

**EduNexus** is an AI-powered unified educational management and adaptive learning platform that connects **Students, Teachers, and Parents** into a single cohesive ecosystem. Designed for modern higher education institutions, EduNexus eliminates the fragmentation of disconnected educational tools by integrating dynamic AI study scheduling, virtual classroom management, continuous assessment tracking, and real-time parent-teacher transparency.

---

## 📌 Problem Definition & Research Motivation

Current educational institutions rely on fragmented, disconnected platforms for learning, academic management, and communication:
- **Fragmented Learning Tools**: Students juggle different platforms for lectures, notes, quizzes, and doubt resolution.
- **Static Time Management**: Existing study planners output rigid, static timetables that fail to dynamically reschedule missed topics.
- **Manual Administrative Burden**: Teachers spend excessive time manually managing attendance, grading assignments, and tracking student risk.
- **The Missing Parent-Teacher Loop**: Traditional learning management systems (LMS) overlook parents, leaving them isolated from their child's daily consistency and attendance.

### 💡 The EduNexus Solution
EduNexus bridges these gaps by unifying all academic stakeholders around shared, real-time data:
1. **Dynamic Adaptive AI Study Plans**: Reorganizes study roadmaps automatically based on student progress and deadlines using Google Gemini AI.
2. **Dedicated Parent Portal**: Grants guardians real-time visibility into attendance percentages, IA marks, consistency metrics, and direct faculty communication.
3. **Streamlined Faculty Management**: One-click smart attendance, AI-assisted quiz generation, and continuous internal evaluation rosters.
4. **Gamified Student Engagement**: Habit-driven consistency streaks, badges, distraction-free video focus mode, and a 24/7 AI Q&A doubt resolution desk.

---

## 🏛️ System Architecture & Portals

EduNexus is organized into three specialized, role-based portals connected through a central cloud synchronization engine:

```
                          ┌─────────────────────────────────────────┐
                          │         EduNexus Unified Platform       │
                          └────────────────────┬────────────────────┘
                                               │
         ┌─────────────────────────────────────┼─────────────────────────────────────┐
         │                                     │                                     │
         ▼                                     ▼                                     ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│  Student Portal  │                 │  Teacher Portal  │                 │  Parents Portal  │
├──────────────────┤                 ├──────────────────┤                 ├──────────────────┤
│• Adaptive Plans  │                 │• Class Roster    │                 │• Attendance Rate │
│• AI Q&A Chatbot  │                 │• 1-Click Attend. │                 │• IA Exam Scores  │
│• Video Focus Hub │                 │• Quiz Generator  │                 │• Consistency Map │
│• Smart Notes     │                 │• Notice Dispatch │                 │• Teacher Direct  │
│• Gamification    │                 │• Risk Analytics  │                 │• Class Observer  │
└────────┬─────────┘                 └────────┬─────────┘                 └────────┬─────────┘
         │                                    │                                    │
         └────────────────────────────────────┼────────────────────────────────────┘
                                              │
                                              ▼
                         ┌─────────────────────────────────────────┐
                         │   Backend & AI Cloud Integration Layer  │
                         ├─────────────────────────────────────────┤
                         │• Node.js & Express API Gateway          │
                         │• Google Gemini 1.5 Flash AI Engine      │
                         │• Firebase Auth & Firestore Real-Time DB │
                         │• YouTube Educational API Integration    │
                         └─────────────────────────────────────────┘
```

---

## 🌟 Key Features

### 👨‍🎓 1. Student Portal
* **AI Academic Scheduler**: Generates syllabus-aligned study roadmaps with built-in Pomodoro cycles and dynamic rescheduling for missed milestones.
* **AI Doubt Solver Desk**: 24/7 contextual Q&A assistance with step-by-step mathematical and conceptual breakdowns.
* **Distraction-Free Video Focus Player**: Curated video lectures with search filtering to eliminate recommended algorithm distractions.
* **Interactive Quiz Zone**: AI-synthesized scenario-based diagnostic assessments with instant scoring and remediation.
* **Curriculum & Smart Notes Explorer**: Department-specific syllabus tracking, unit checklists, and Markdown study notes repository.
* **Gamified Consistency Radar**: Visualizes daily study consistency, reward badges, and learning streaks.

### 👩‍🏫 2. Faculty / Teacher Portal
* **Official Student Cohort Ledger**: Real-time roster tracking Roll Numbers, Names, Continuous Internal Assessment (IA-1, IA-2), Attendance, and SGPI.
* **One-Click Smart Attendance**: Instant class attendance recording with batch calculations.
* **AI Quiz Synthesizer**: Create subject-wise diagnostic assessments in seconds from syllabus topics.
* **Departmental Circular Dispatch**: Broadcast official notices, announcements, and exam timetables.
* **Academic Risk Analytics**: Automated alerts identifying students with low attendance or performance deficits for early intervention.

### 👨‍👩‍👧 3. Parent / Guardian Portal
* **Live Student Performance Docket**: Real-time visibility into internal assessment scores and SGPI trends.
* **Attendance Radar**: Live tracking of class attendance percentages with status alerts.
* **Consistency Score Tracker**: Monitor daily study habit consistency and platform engagement.
* **Direct Faculty Communication**: Transparent bridge to contact class advisors and subject teachers.
* **Institutional Circulars Access**: Read official college notifications and schedule updates without relying on forwarded messages.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend UI** | React 19, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend & Routing** | Node.js, Express.js, TypeScript runtime |
| **Artificial Intelligence** | Google Gemini 1.5 Flash (`@google/genai` SDK) |
| **Database & Security** | Firebase Firestore (Real-Time Cloud DB), Granular Security Rules |
| **Authentication** | Firebase Auth (Google OAuth 2.0 & Role-Based Session Profiles) |
| **Data Visualization** | Recharts, Custom SVG Analytics, D3-inspired consistency graphs |
| **Integrations** | YouTube Data API, PDF.js, SheetJS (XLSX Export), jsPDF |

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- Modern web browser (Chrome, Edge, Firefox, or Safari)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/edunexus.git
cd edunexus
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory by copying `.env.example`:
```bash
cp .env.example .env
```

Add your credentials inside `.env`:
```env
# Google Gemini API Key (Get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# YouTube Data API Key (Optional, for curated video lectures)
YOUTUBE_API_KEY=your_youtube_api_key_here

# Server Port
PORT=3000
NODE_ENV=development
```

### 4. Run the Development Server
```bash
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

> 💡 **Quick Demo Mode**: For rapid testing or grading evaluations, use the **"Quick Demo Login"** on the landing page to instantly explore Student, Faculty, and Parent portals with preloaded institutional test data.

---

## 📦 Production Build

To test or deploy the production-ready build:

```bash
# Compile TypeScript, bundle frontend with Vite, and compile backend server
npm run build

# Start the compiled production server
npm start
```

---

## 📂 Project Structure

```
edunexus/
├── src/
│   ├── components/               # Modular UI components & portal views
│   │   ├── AboutDevelopers.tsx   # Project team attribution view
│   │   ├── Auth.tsx              # Multi-role authentication & demo login
│   │   ├── Curriculum.tsx        # Semester syllabus & unit tracker
│   │   ├── Dashboards.tsx        # Teacher & Parent portal implementations
│   │   ├── DoubtSolver.tsx       # AI & collaborative doubt resolution desk
│   │   ├── ErrorBoundary.tsx     # Graceful error catching wrapper
│   │   ├── Layout.tsx            # Responsive app shell, sidebar & navbar
│   │   ├── NoticeBoard.tsx       # Institutional notice & circular dispatcher
│   │   ├── ProfileSettings.tsx   # User profile & role-switching manager
│   │   ├── QuizZone.tsx          # AI-generated scenario quiz engine
│   │   ├── SmartNotes.tsx        # Markdown study notes & revision workspace
│   │   ├── SmartScheduler.tsx    # Habit-based adaptive study roadmap engine
│   │   ├── StudentDashboard.tsx  # Dynamic student dashboard & metric cards
│   │   ├── VideoFocusPlayer.tsx  # Distraction-free educational video player
│   │   └── VisionBoard.tsx       # Student goal & vision setting board
│   ├── constants.ts              # Preloaded academic cohort & syllabus constants
│   ├── firebase.ts               # Firebase client initialization & config
│   ├── types.ts                  # Shared TypeScript interfaces & types
│   ├── App.tsx                   # Main state machine, role routing & sync
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Global styling & Tailwind CSS imports
├── server.ts                     # Express backend API & Vite middleware server
├── firestore.rules               # Firestore RBAC security and access control rules
├── package.json                  # Project dependencies & npm scripts
├── vite.config.ts                # Vite build configuration
├── .gitignore                    # Git ignore file for secrets and node_modules
├── .env.example                  # Environment variable blueprint
└── README.md                     # Comprehensive project documentation
```

---

## 👥 Project Team & Contributors

**Department of Information Technology (INFT)**  
**Atharva College of Engineering, Malad (W), Mumbai**  
*(Affiliated to the University of Mumbai, Approved by AICTE, NAAC A+ Accredited)*

| Team Member | Role | Specialization |
|---|---|---|
| **Amit Jadhav** | Project Lead & Full Stack Architect | React, Firebase Architecture, AI Integration |
| **Kunal Gupta** | Frontend Engineer & UI/UX Designer | Tailwind CSS, Responsive UI, Component Architecture |
| **Krishna Gosavi** | Backend & Cloud Specialist | Firestore Security, Real-Time Sync, Data Pipelines |
| **Rushabh Hirave** | AI & Educational Systems Developer | Google Gemini API, Curriculum Analytics, Prompt Engineering |

---

## 📄 License & Academic Attribution

This project is developed as an Academic Engineering Capstone / Project under the Department of Information Technology at Atharva College of Engineering (Academic Year 2025–2026). All rights reserved.
