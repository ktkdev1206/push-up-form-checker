'use client';

import { useEffect, useState } from 'react';
import type { FormAnalysis } from '@/types/pose';

interface FormValidatorProps {
  formAnalysis: FormAnalysis | null;
}

export function FormValidator({ formAnalysis }: FormValidatorProps): JSX.Element {
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (formAnalysis?.errors && formAnalysis.errors.length > 0) {
      const firstError = formAnalysis.errors[0];
      setErrorMessage(firstError.message);
      setShowError(true);

      // Auto-hide after 2 seconds
      timer = setTimeout(() => {
        setShowError(false);
      }, 2000);
    } else {
      setShowError(false);
      setErrorMessage(null);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [formAnalysis]);

  const getFormIndicator = (state: FormAnalysis['state']): JSX.Element => {
    switch (state) {
      case 'VALID_UP':
      case 'VALID_DOWN':
        return (
          <div
            className="w-6 h-6 bg-green-500 rounded-full animate-pulse"
            aria-label="Good form"
          />
        );
      case 'PARTIAL_REP':
        return (
          <div
            className="w-6 h-6 bg-yellow-500 rounded-full animate-pulse"
            aria-label="Partial rep"
          />
        );
      case 'INVALID_FORM':
        return (
          <div
            className="w-6 h-6 bg-red-500 rounded-full animate-pulse"
            aria-label="Invalid form"
          />
        );
      default:
        return (
          <div
            className="w-6 h-6 bg-gray-500 rounded-full"
            aria-label="Not detected"
          />
        );
    }
  };

  return (
    <>
      {/* Form Indicator - Top Left */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 rounded-full px-3 py-2">
        {formAnalysis && getFormIndicator(formAnalysis.state)}
        <span className="text-white text-sm font-medium">
          {formAnalysis?.state === 'VALID_UP' || formAnalysis?.state === 'VALID_DOWN'
            ? 'Good Form'
            : formAnalysis?.state === 'INVALID_FORM'
              ? 'Fix Form'
              : formAnalysis?.state === 'PARTIAL_REP'
                ? 'Complete Rep'
                : 'Not Detected'}
        </span>
      </div>

      {/* Error Message - Bottom Slide Up */}
      {showError && errorMessage && (
        <div
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg animate-slide-up max-w-md"
          role="alert"
          aria-live="assertive"
        >
          <p className="font-medium text-center">{errorMessage}</p>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

