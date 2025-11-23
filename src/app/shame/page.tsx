'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useEffect, useState } from 'react';

export default function ShamePage(): JSX.Element {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    setIsAnimating(true);
  }, []);

  const handleTryAgain = (): void => {
    router.push('/workout');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-500 via-orange-600 to-red-600 px-4 relative">
      <div className="max-w-2xl w-full text-center relative z-10">
        {/* Shame Text */}
        <h1
          className={`text-5xl md:text-6xl lg:text-7xl font-bold text-orange-100 mb-8 transition-all duration-500 ${
            isAnimating ? 'animate-fade-in' : ''
          }`}
          style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          What a sc<br />
          boii los
        </h1>

        {/* Crying Emoji */}
        <div className="mb-12 text-9xl animate-bounce-slow">
          😭
        </div>

        {/* Recovery Button */}
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={handleTryAgain}
            className="bg-teal-400 hover:bg-teal-500 text-white font-semibold rounded-xl py-4 px-8 text-lg shadow-lg min-w-[250px]"
            aria-label="Try the workout"
          >
            aight I will try
          </Button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}

