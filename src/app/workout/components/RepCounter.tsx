'use client';

interface RepCounterProps {
  correctReps: number;
  incorrectReps: number;
  totalAttempts: number;
}

export function RepCounter({
  correctReps,
  incorrectReps,
  totalAttempts,
}: RepCounterProps): JSX.Element {
  return (
    <div className="absolute top-4 right-4 bg-black/70 rounded-lg px-6 py-4 text-white">
      <div className="text-center">
        <div className="text-6xl font-bold drop-shadow-lg" aria-label={`${correctReps} correct reps`}>
          {correctReps}
        </div>
        <div className="text-sm text-gray-300 mt-1">
          {incorrectReps > 0 && (
            <span className="text-red-400">-{incorrectReps} incorrect</span>
          )}
          {incorrectReps === 0 && totalAttempts > 0 && (
            <span className="text-green-400">Perfect!</span>
          )}
        </div>
      </div>
    </div>
  );
}

