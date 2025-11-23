Push-Up Form Checker App — Technical Specification
Version: 1.0
Date: November 19, 2025
Status: MVP Development

About This Product
Push-Up Pro is a minimalist web fitness app using computer vision to validate push-up form. It offers instant, meme-style feedback and session stats with zero onboarding friction.

Business Case
Home workout users lack real-time form feedback, risking injury or inefficiency. Push-Up Pro provides fast, free, AI-powered validation through the browser, boosting motivation and form quality.

Overview & Objectives
Primary Goal: Real-time push-up validation and feedback
Secondary: Engaging user experience with meme audio
Objectives: Fast setup, fun feedback, minimal scope for rapid iteration

Features & Functionalities (MVP Scope Only)
Humorous landing page ("So you think you're a pro in push-ups. Let's find out.”)
Camera permission & clear setup flow
Pose estimation with MediaPipe (preferred) or MoveNet fallback
Rep counting, form analysis, and instant feedback/overlay
Motivational & shame audio cues using provided mp3s
Meme-style shame screen for opt-out path
Basic session summary (total, correct, incorrect, duration)
Minimal data storage for session stats (optionally anonymous)

Explicitly Out of Scope:
Leaderboards, social features, onboarding flows, multi-exercise support, analytics, payment, video recording.

Technical Requirements
Frontend: Next.js 14, TypeScript, React (function components), Tailwind CSS only
Pose Detection: @mediapipe/tasks-vision
Backend: Next.js API routes, MongoDB Atlas (Mongoose)
Testing: Jest, Playwright, React Testing Library
Performance: 30FPS on desktop, 15+FPS on mobile, <100ms feedback
Accessibility: WCAG AA, mobile responsive, alt text, ARIA, touch targets

User Stories & Acceptance Criteria

| US #   | As a ...        | I want to ...                    | So That ...            | Acceptance Criteria                                      |
| ------ | --------------- | -------------------------------- | ---------------------- | -------------------------------------------------------- |
| US-001 | First-time user | See landing page                 | Feel welcome           | Loads <2s, image/CTAs visible, mobile friendly           |
| US-002 | Opting-out user | Click "I wanna puss out"         | See meme shame screen  | Animated text, return button, no data saved              |
| US-003 | Ready user      | Grant camera permission          | Start quickly          | Prompt after CTA, camera preview <1s, denial handling    |
| US-004 | Setting up      | Real-time feedback               | Know I'm visible       | Green/red indicators, "Start Now" gating, <500ms latency |
| US-005 | Exercising      | Count correct reps only          | Know my form           | Validated angles/hand width, debounced reps              |
| US-006 | Exercising      | Get instant feedback on bad form | Improve during session | Audio + overlay, error details, tracked separately       |
| US-007 | Exercising      | Audio every 10 reps              | Motivation             | Plays after every 10, volume adjustable                  |
| US-008 | Finishing       | See session stats                | Assess performance     | Summary screen, correct/incorrect stats, try again/done  |
| US-009 | Stopping early  | End mid-session                  | Not forced to continue | Confirmation modal, summary for partial session          |
| US-010 | Any user        | Smooth app                       | No frustration         | 30FPS desktop, 15+FPS mobile, <100ms rep latency         |


Technical Architecture
File Structure: Domain-driven, see structure below
README.md
package.json
env.example
.gitignore
instructions.md
src/
  app/
    layout.tsx
    page.tsx
    globals.css
    api/
      users/route.ts
      sessions/route.ts
    workout/
      page.tsx
      components/
        CameraSetup.tsx
        PoseDetector.tsx
        FormValidator.tsx
        RepCounter.tsx
        AudioPlayer.tsx
  components/
    ui/Button.tsx
    ui/Card.tsx
    shared/Header.tsx
    shared/Footer.tsx
  lib/
    pose/poseDetection.ts
    pose/angleCalculation.ts
    pose/formValidation.ts
    database/mongodb.ts
    database/models/User.ts
    database/models/Session.ts
    utils/camera.ts
    utils/audio.ts
    utils/constants.ts
  hooks/
    usePoseDetection.ts
    useCamera.ts
    useAudio.ts
  types/pose.ts
  types/session.ts
  types/user.ts
  public/
    audio/you-dont-know-me-son.mp3
    audio/gayyyy.mp3
   


API Endpoints:
POST /api/sessions: Create session
GET /api/sessions/:id: Retrieve session

Database Models: User (optional), Session (stats, errors, duration, timestamps)

Env vars: MONGODB_URI etc.

Testing: Unit, integration, E2E

Key dependencies: Next.js, React, TypeScript, Tailwind, MediaPipe, MoveNet, Jest, Playwright

Acceptance Criteria (Global)
All required user stories pass their criteria

Tests (unit/integration/E2E) >80% coverage, fail then pass (TDD)

No TypeScript errors, strict mode enabled

No out-of-scope features created

Bundle <500KB gzipped

Performance/accessibility targets met

