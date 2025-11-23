import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Push-Up Pro - Form Checker',
  description: 'Real-time push-up form validation using AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Suppress browser extension errors (harmless but annoying)
              // These errors come from browser extensions (ad blockers, password managers, etc.)
              // trying to communicate with content scripts, not from our app code.
              
              // Suppress window error events
              window.addEventListener('error', function(e) {
                if (e.message && (
                  e.message.includes('runtime.lastError') ||
                  e.message.includes('message port closed') ||
                  e.message.includes('Extension context invalidated')
                )) {
                  e.preventDefault();
                  return false;
                }
              });
              
              // Suppress console.error calls from browser extensions
              const originalConsoleError = console.error;
              console.error = function(...args) {
                const message = args.join(' ');
                if (
                  message.includes('runtime.lastError') ||
                  message.includes('message port closed') ||
                  message.includes('Extension context invalidated') ||
                  message.includes('Unchecked runtime.lastError')
                ) {
                  // Silently ignore browser extension errors
                  return;
                }
                // Call original console.error for real errors
                originalConsoleError.apply(console, args);
              };
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
