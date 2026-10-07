<div align="center">

# 📅 Timetable

**A sleek, responsive, single-screen weekly timetable and scheduling web application with real-time cloud sync, drag-and-drop planning, and high-resolution PDF export.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub_Pages-2088FF?logo=github-actions&logoColor=white)](https://github.com/ParvShah2001/timetable/actions)

[Live Demo](https://parvshah2001.github.io/timetable/) • [Report Bug](https://github.com/ParvShah2001/timetable/issues) • [Request Feature](https://github.com/ParvShah2001/timetable/issues)

</div>

---

## 📖 Overview

Traditional calendar applications are often bloated with complex meeting menus, notification fatigue, and endless vertical scrolling. **Timetable** solves this by providing a dedicated, distraction-free visual weekly map that fits **100% within your screen on desktop, tablet, and mobile portrait** with zero scrollbars required.

Designed with an offline-first architecture and seamless **Supabase Realtime** synchronization, your timetable stays synchronized across your laptop, phone, and tablet instantly, complete with Row-Level Security, fluid drag-and-drop interactions, and crisp A4 PDF exporting.

---

## 📸 Preview & Interface

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Timetable   [ Today ]  [ Cloud Synced ● ]                 [ 🔍 ] [ ↩ Undo ] [ + Add ]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  <  Week 41 (Oct 5 – Oct 11, 2026)  >                                          [ ⋮ ]   │
├─────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────────┤
│  TIME   │   MON  05    │   TUE  06    │   WED  07    │   THU  08    │     FRI  09      │
├─────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────────┤
│ 08:00 AM│              │ ┌──────────┐ │              │ ┌──────────┐ │                  │
│ 09:00 AM│ ┌──────────┐ │ │ Algorithms│ │              │ │ Team Sync│ │                  │
│ 10:00 AM│ │ Database │ │ └──────────┘ │ ┌──────────┐ │ └──────────┘ │ ┌──────────────┐ │
│ 11:00 AM│ │ Lecture  │ │              │ │ Deep Work│ │              │ │ Sprint Review│ │
│ 12:00 PM│ └──────────┘ │              │ └──────────┘ │              │ └──────────────┘ │
│ 01:00 PM│              │              │              │              │                  │
└─────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────────┘
```

> **UI Mockup & Demo Asset**:
> *Add your live demo recording or GIF to `docs/images/demo.gif` and link it here:*
> ```markdown
> ![Timetable Walkthrough](docs/images/demo.gif)
> ```

---

## ✨ Key Features

- 🖥️ **Single-Screen Adaptive Viewport**: Automatically calculates optimal row heights so the entire week fits into view without vertical or horizontal scrollbars on desktop, tablet, and mobile portrait.
- 📱 **Intelligent Mobile Landscape Mode**: Gracefully transitions to comfortable vertical touch scrolling with **permanently pinned day headers** that never vanish when scrolling through hours.
- ⚡ **Real-Time Cross-Device Synchronization**: Built on Supabase PostgreSQL and WebSocket Realtime channels (`postgres_changes`), propagating edits made on your mobile phone to your desktop in milliseconds.
- 🔒 **Row-Level Security (RLS)**: Enforces database-level isolation so authenticated users can only view and mutate their own tasks.
- 📴 **Offline-First & Guest Mode**: Fully operational offline via browser `localStorage`. No mandatory account or cloud connection is required for basic local use.
- 🖱️ **Fluid Drag-and-Drop & Resizing**:
  - Drag events across days and time slots with smooth **boundary auto-scrolling**.
  - Drag top and bottom edge handles to resize event durations.
  - Magnetic snapping to 15, 30, or 60-minute grid increments.
- 🔀 **Side-by-Side Overlap Resolution**: Smart collision clustering algorithm partitions simultaneous events into parallel sub-columns without visual occlusion.
- 📄 **High-Resolution A4 Landscape PDF Export**: Generates crisp, printable schedules with full event details, colors, and locations using `html2canvas` and `jsPDF`.
- ↩️ **Full Undo Stack**: Comprehensive `Ctrl+Z` / `Cmd+Z` history allowing instant rollback of accidental deletions, moves, and cleared weeks.
- 💾 **Data Portability**: Complete JSON backup export and import for local data ownership.
- 🔍 **Instant Schedule Search**: Search modal to quickly locate events by title, description, or location.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) | Component architecture & hooks |
| **Language** | [TypeScript 5.6](https://www.typescriptlang.org/) | Strict type safety across components and state |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) | Responsive utility-first styling and animations |
| **Build Tooling** | [Vite 6.0](https://vitejs.dev/) | Sub-second HMR and optimized production bundles |
| **Database & Auth** | [Supabase](https://supabase.com/) | Hosted PostgreSQL, Row-Level Security & Realtime |
| **PDF Generation** | [jsPDF](https://github.com/parallax/jsPDF) + [html2canvas](https://html2canvas.hertzen.com/) | Client-side high-DPI document rendering |
| **Deployment** | [GitHub Pages](https://pages.github.com/) | Continuous deployment via GitHub Actions |

---

## 📂 Project Structure

```
timetable/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Pages CI/CD workflow
├── docs/
│   ├── ARCHITECTURE.md        # Technical architecture & layout algorithms
│   ├── DATABASE_SETUP.md      # Supabase SQL schema, RLS policies, & setup
│   └── DEPLOYMENT.md          # Deployment guides for GitHub Pages, Vercel, Docker
├── public/
│   └── favicon.svg            # Application vector icon
├── src/
│   ├── components/            # UI Components
│   │   ├── ConfirmDialog.tsx  # Confirmation modal (e.g. week clearing)
│   │   ├── CurrentTimeLine.tsx# Live red line indicator for the current time
│   │   ├── DayColumn.tsx      # Day grid column container with hour slots
│   │   ├── EventCard.tsx      # Interactive event card (drag, resize, tap-edit)
│   │   ├── EventModal.tsx     # Add/edit event modal with colors & categories
│   │   ├── Header.tsx         # Top bar with sync indicator, undo, search, user menu
│   │   ├── LoginPage.tsx      # Auth screen (sign in, sign up, Supabase wizard)
│   │   ├── SearchModal.tsx    # Live event filter modal
│   │   ├── SettingsPanel.tsx  # Grid intervals, presets, overlap, PDF/JSON export
│   │   ├── TimeColumn.tsx     # Left-hand 12-hour tick labels column
│   │   ├── Timetable.tsx      # Main schedule grid & drag auto-scroll controller
│   │   └── WeekNavigator.tsx  # ISO week navigation & week actions dropdown
│   ├── context/
│   │   └── AuthContext.tsx    # Supabase authentication provider & session state
│   ├── lib/
│   │   └── supabase.ts        # Supabase client, queries, real-time channels & SQL
│   ├── utils/
│   │   └── pdfExport.ts       # A4 landscape high-resolution PDF rendering engine
│   ├── App.tsx                # App shell, routing, global modals, & keyboard events
│   ├── config.ts              # Supabase environment variables & fallback config
│   ├── index.css              # Global styles, Tailwind directives, & safe area insets
│   ├── main.tsx               # DOM entry point
│   ├── store.tsx              # Global state reducer (events, settings, undo stack)
│   ├── types.ts               # Core TypeScript models, interfaces, & presets
│   └── utils.ts               # Date math, ISO week helpers, overlap clustering
├── .env.example               # Template for environment variables
├── .gitignore                 # Standard repository ignore rules
├── index.html                 # HTML entry point with mobile viewport meta tags
├── LICENSE                    # MIT License
├── package.json               # Dependencies, scripts, and package metadata
├── postcss.config.js          # PostCSS configuration for Tailwind
├── tailwind.config.js         # Tailwind theme & plugin configuration
├── tsconfig.json              # TypeScript compiler configuration
└── vite.config.ts             # Vite configuration with relative base path
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version `18.0.0` or higher recommended)
- `npm` (version `9.0.0` or higher) or `pnpm` / `yarn`

### 1. Clone the Repository

```bash
git clone https://github.com/ParvShah2001/timetable.git
cd timetable
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables (Optional for Cloud Sync)

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Populate with your Supabase project credentials (obtainable from [supabase.com](https://supabase.com)):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Note**: If you skip configuring `.env`, the app runs in **Offline / Guest Mode**, saving all data directly in your browser's `localStorage`. You can also configure Supabase keys directly within the app UI at any time.

### 4. Database Setup (If using Supabase)

To enable real-time synchronization and database tables, run the SQL script in your Supabase SQL Editor.
Refer to [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for the complete schema and Row-Level Security rules.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 6. Build for Production

```bash
npm run build
```

The compiled output will be generated in the `dist/` directory.

### 7. Preview Production Build

```bash
npm run preview
```

---

## 💡 Usage Examples

### 1. Creating and Managing Events
- **Click or Tap**: Tap any day or the **"+ Add Task"** button in the header to open the event creator.
- **Set Durations**: Choose start and end times in 12-hour format, pick from category colors (Blue, Emerald, Amber, Rose, Violet, Teal, Orange), and add optional location and description.
- **Drag to Move**: Click and drag any card to move it across days or earlier/later hours. Near screen edges, the view auto-scrolls smoothly.
- **Resize**: Hover over any card to reveal the top and bottom handles, then drag to adjust start or end times.

### 2. Side-by-Side Overlaps
- Open **Settings** (⚙️ icon).
- Enable **Side-by-side Overlaps**.
- When multiple tasks occur simultaneously (e.g. 10:00 AM – 11:30 AM), they divide column width equally side-by-side rather than obstructing each other.

### 3. Exporting to PDF
- Tap the week actions menu (**⋮**) in the week header and click **"Export Week as PDF"** (or use **Settings -> Backup & Data -> Export Timetable as PDF**).
- A clean, high-resolution **A4 Landscape PDF** will download automatically, formatted with full event details, time intervals, and color accents.

### 4. Data Backup & Restoration
- Under **Settings -> Backup & Data**, click **"Export JSON"** to download an offline backup of all your weekly events.
- To restore, click **"Import JSON"** and upload your backup file.

---

## 🗺️ Roadmap & Planned Improvements

- [ ] **Recurring Events**: Support for recurring task rules (daily, weekly, bi-weekly).
- [ ] **Dark Mode**: System-aware and manual dark theme toggle.
- [ ] **iCal / `.ics` Synchronization**: Import and export schedules with Google Calendar and Apple Calendar.
- [ ] **Category Filtering**: Toggle visibility of specific event tags (e.g., Work vs Study).
- [ ] **Custom Notifications**: Browser web push reminders before scheduled tasks.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. **Fork the Repository**
2. **Create your Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your Changes**:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. **Push to the Branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

Please ensure that `npm run build` passes with zero TypeScript warnings before opening a PR.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Parv Shah**

- **GitHub**: [@ParvShah2001](https://github.com/ParvShah2001)
- **Repository**: [github.com/ParvShah2001/timetable](https://github.com/ParvShah2001/timetable)

---

<div align="center">
  <sub>Built with ❤️ using React, TypeScript, Tailwind CSS, and Supabase.</sub>
</div>
