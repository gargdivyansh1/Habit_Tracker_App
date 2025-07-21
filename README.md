# 🧠 Habit Tracker App

A modern, single-page habit tracking application built with **Next.js 14**, **TypeScript**, **TailwindCSS**, and **Prisma**. Easily track your daily habits, visualize progress, and build consistency—all in a minimal and responsive UI.

<p align="center">
  <img src="public\first.png" width="1000"/>
  <img src="public\second.png" width="1000"/>
  <img src="public\third.png" width="1000"/>
  <img src="public\four.png" width="1000"/>
</p>

---

## 🚀 Features

- ✅ **Single-page UI** with smooth transitions
- 🗓️ **Daily Habit Tracking** with clickable toggles
- 📊 **Progress Visualization** (per habit + total)
- 🔁 **Recurring Habits Support**
- 🎨 Beautiful **TailwindCSS-based UI**
- 🧠 Built using **Next.js App Router** and **TypeScript**
- 📦 Persistent Data with **Prisma + SQLite/PostgreSQL**
- 🧪 Easy to test and extend
- 🔐 Authentication-ready structure (can integrate Clerk/AuthJS)
- Mandatory daily to fill the entry
- Notifiaction support for reminding each habit

---

## 🧩 Tech Stack

| Layer         | Stack                    |
|---------------|--------------------------|
| Frontend      | Next.js 14 (App Router), React 18 |
| Styling       | Tailwind CSS             |
| Language      | TypeScript               |
| ORM / DB      | Prisma + SQLite/PostgreSQL |
| Build Tools   | Vite + Next.js Compiler |
| Icons         | Lucide Icons             |
| Deployment    | Vercel / Railway (soon)        |

---

## 📁 Folder Structure
```
habit-tracker-app/
├── app/ # App router layout and pages
│ ├── layout.tsx
│ └── page.tsx # Main single-page interface
├── components/ # UI Components (HabitCard, HabitList, ToggleBtn, etc.)
├── lib/ # Utility functions
├── prisma/ # Prisma schema + seed
├── public/ # Static assets (icons, screenshot)
├── styles/ # Tailwind + global styles
├── .env # Environment variables
├── next.config.ts
└── README.md
```


---

## 📦 Installation

```bash
git clone https://github.com/gargdivyansh1/habit_tracker_app.git
cd habit-tracker-app

# Install dependencies
npm install

# Setup database (SQLite/PostgreSQL)
npx prisma generate
npx prisma db push

# Run the app
npm run dev


