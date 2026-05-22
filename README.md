# DevTrackr - AI Developer Productivity Dashboard

A platform where developers connect GitHub and AI generates productivity insights, sprint summaries, and coding analytics.

## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Recharts

### Backend
- Express.js
- MongoDB
- JWT + bcrypt
- GitHub API
- OpenAI API

## Features
- User Authentication (Signup/Login)
- GitHub Integration (Connect repositories)
- AI Productivity Analysis (Commit summaries, inactive contributors, sprint progress)
- Dashboard Visualization (Commit charts, PR analytics, Issue tracking)
- AI Recommendations (Task prioritization, bottleneck detection)
- Export Reports (PDF summaries)

## Getting Started

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in your environment variables
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment

### Backend (Render)
1. Create a Web Service on Render pointing to the `backend` folder
2. Set Root Directory to `backend`
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Add environment variables: `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `FRONTEND_URL`

### Frontend (Vercel)
1. Import your repo on Vercel
2. Set Root Directory to `frontend`
3. Framework Preset: Vite
4. Add environment variable: `VITE_API_URL=https://your-render-backend.onrender.com/api`

## Flow
1. User connects GitHub
2. System fetches repo activity
3. AI generates insights
4. User views analytics dashboard
