Push-Up Form Checker — Development Instructions for Cursor AI
Always reference technical-specs.md. Always follow .cursorrules for workflow.

Primary Directive
Implement ONLY features described in technical-specs.md, strictly. Deviation is forbidden; scope creep is to be rejected explicitly.

Architecture & File Organization
Domain-driven modular structure

src/app for pages, API

src/components for reusable UI

src/lib for business logic, src/hooks for custom React hooks

tests/unit, tests/integration, tests/e2e

public for audio/images

Coding Standards
TypeScript strict (no any)

Function components ONLY; typed props/interfaces everywhere

React hooks for logic/state, minimal useMemo/memo for perf

Tailwind CSS for all styles

Aria labels, accessibility basics for every interactive element

All async ops in try/catch, errors user-friendly, no silent fail

Test-Driven Development (TDD) Workflow
Write failing tests FIRST (unit, integration, or E2E)

Implement minimum code for tests to pass

Refactor with tests green

Repeat until all features tested

Never commit or merge without passing tests

Use AAA pattern for tests, descriptive test names

Pose Detection Rules
Use MediaPipe tasks-vision for pose detection

Fallback to MoveNet if needed

Only count valid push-up forms (angles, hand width, cycle)

Audio feedback after 10 correct reps, instant for bad form

Overlay session stats in real-time

Error Handling & Performance
Log errors in dev, handle gracefully in prod

All edge cases tested

30FPS desktop, 15+FPS mobile, latency targets enforced

No custom CSS, no class components, no global state libraries

Forbidden Features
Onboarding/leaderboard/analytics/multi-exercise/social/payment/video NOT ALLOWED

Any time such a feature is requested, state it's out-of-scope

Code Review Checklist
All code typed, documented, readable, accessible

No monolithic files, no commented code, no console.log in prod

All tests pass, all lint/type checks pass, performance as specified

Success Criteria
Meet all acceptance criteria for stories

80% test coverage

Pose detection accuracy >90%

No TypeScript/ESLint errors

App accessible and performant

