# SKILLOREA NEXUS

**An AI-powered student learning and academic insights platform.**

- **Live Demo:** https://skillorae-nexus.vercel.app
- **GitHub Repository:** https://github.com/VishnuVardhanPapisetty/skillorae-nexus

## Overview

SKILLOREA NEXUS is a web application built to bring student-focused information and AI-assisted academic insights into one platform. It uses a modern Next.js interface, Supabase for backend services, and Google Gemini for AI-powered functionality.

## Technology Stack

- **Next.js** — React framework
- **React** — User interface
- **TypeScript** — Type-safe development
- **Supabase** — Backend and database services
- **Google Gemini API** — AI functionality

## Features

- Student-focused dashboard
- Supabase integration
- AI-assisted functionality
- Responsive web application interface

*The availability of individual features depends on the implementation and configured backend services.*

## Live Demo

Visit **https://skillorae-nexus.vercel.app** to try the deployed application.

## Getting Started

### Prerequisites

- Node.js and npm
- A Supabase project
- A Google Gemini API key for AI features

### 1. Clone the repository

```bash
git clone https://github.com/VishnuVardhanPapisetty/skillorae-nexus.git
cd skillorae-nexus/skillorae
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the `skillorae` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
GEMINI_API_KEY=your_gemini_api_key
```

Replace the placeholders with your own credentials. Never commit `.env.local` or secret API keys to GitHub. The `NEXT_PUBLIC_` variables are exposed to the browser, so use only the Supabase publishable key there and configure appropriate Row Level Security (RLS) policies.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create a production build

```bash
npm run build
```

## Deployment

The application is deployed on Vercel. Configure the required environment variables in the Vercel project settings for the features that need them.

**Live URL:** https://skillorae-nexus.vercel.app

## Project Structure

```text
skillorae-nexus/
└── skillorae/
    ├── app/
    │   ├── Dashboard/
    │   └── lib/
    │       └── supabase.ts
    ├── package.json
    └── ...
```

## Future Improvements

- Expand personalized learning recommendations
- Add richer academic progress visualizations
- Improve accessibility and user experience

## Acknowledgements

Built as a student project exploring AI-assisted education, modern web development, and cloud-based backend services.
