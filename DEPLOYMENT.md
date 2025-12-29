# Deployment Guide

This guide covers deploying Hope's Corner Guest Check-In App to Firebase.

## Quick Deploy

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build

# Deploy to Firebase
npm run firebase:deploy
```

## Deploying to Your Own Firebase Project

### 1. Create a Firebase Project

1. Go to the [Firebase console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore and Authentication (Email/Password) services

### 2. Configure Environment Variables

Duplicate `.env.example` to `.env.local` and add your Firebase project values:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### 3. Connect Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase use --add <your-project-id>
```

### 4. Deploy

```bash
npm run firebase:deploy
```

## Continuous Integration

The repository includes GitHub Actions workflow (`.github/workflows/ci.yml`) that:
- Installs dependencies
- Runs ESLint suite
- Executes Vitest unit tests

Tests run automatically on:
- Every push to `main`
- Every pull request

## Installing as Mobile App (PWA)

Once deployed to Firebase:

**Android/Chrome:**
- Visit app URL → tap "Install" banner → "Add to Home screen"

**iOS/Safari:**
- Visit app URL → tap Share (□↑) → "Add to Home Screen"

**Desktop:**
- Visit app URL → click install icon in address bar
