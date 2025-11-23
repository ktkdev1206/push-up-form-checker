'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function HomePage(): JSX.Element {
  const router = useRouter();

  const handleFindOut = (): void => {
    router.push('/workout');
  };

  const handlePussOut = (): void => {
    router.push('/shame');
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 via-purple-800 to-black px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute top-0 left-0 w-64 h-64 opacity-20">
        <div className="w-full h-full border-4 border-purple-400 transform rotate-45"></div>
      </div>

      <div className="max-w-4xl w-full text-center relative z-10">
        {/* Hero Image */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-80 h-80 md:w-96 md:h-96 bg-purple-700/30 rounded-3xl p-4 backdrop-blur-sm border border-purple-500/30">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="text-9xl">💪</div>
              {/* Placeholder for cartoon character - replace with actual image */}
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          So you think you&apos;re a<br />
          pro in push-ups.<br />
          Let&apos;s find out
        </h1>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 justify-center items-center mb-6">
          <Button
            variant="primary"
            size="lg"
            onClick={handleFindOut}
            className="w-full max-w-md bg-teal-400 hover:bg-teal-500 text-white font-semibold rounded-xl py-4 text-lg shadow-lg"
            aria-label="Start workout session"
          >
            I wanna find out
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={handlePussOut}
            className="w-full max-w-md bg-transparent border-2 border-red-500 text-red-500 hover:bg-red-500/10 font-semibold rounded-xl py-4 text-lg"
            aria-label="Opt out of workout"
          >
            I wanna puss out
          </Button>
        </div>

        {/* Motivational Text */}
        <p className="text-gray-300 text-lg">
          No push-ups? No gains. 💪
        </p>
      </div>
    </main>
  );
}

