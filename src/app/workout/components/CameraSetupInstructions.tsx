'use client';

import { Button } from '@/components/ui/Button';

interface CameraSetupInstructionsProps {
  onContinue: () => void;
}

export function CameraSetupInstructions({ onContinue }: CameraSetupInstructionsProps): JSX.Element {
  const steps = [
    {
      icon: '📱',
      text: 'Place your camera on mount or down',
    },
    {
      icon: '🔄',
      text: 'Keep it sideways or straight',
    },
    {
      icon: '💪',
      text: 'Get to push-up position',
    },
    {
      icon: '✅',
      text: 'Make sure you\'re fully visible',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-black px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
          How to setup your camera
        </h1>

        {/* Instruction Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 border border-purple-600/30"
            >
              <div className="text-4xl flex-shrink-0">{step.icon}</div>
              <p className="text-white text-lg font-medium">{step.text}</p>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center mt-8">
          <Button
            onClick={onContinue}
            variant="primary"
            size="lg"
            className="bg-teal-400 hover:bg-teal-500 text-white font-semibold rounded-xl py-4 px-8 text-lg shadow-lg w-full max-w-md"
            aria-label="Continue to camera setup"
          >
            Got it, let&apos;s go!
          </Button>
        </div>
      </div>
    </div>
  );
}

