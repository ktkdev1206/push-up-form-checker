'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { SessionSummary, ErrorBreakdown } from '@/types/session';

function SummaryContent(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    // Extract session data from URL params
    const correctReps = parseInt(searchParams.get('correct') || '0', 10);
    const incorrectReps = parseInt(searchParams.get('incorrect') || '0', 10);
    const totalReps = parseInt(searchParams.get('total') || '0', 10);
    const duration = parseInt(searchParams.get('duration') || '0', 10);
    const errorsParam = searchParams.get('errors') || '[]';
    const errors = JSON.parse(decodeURIComponent(errorsParam)) as string[];

    // Calculate error breakdown
    const errorBreakdown: ErrorBreakdown = {
      elbowAngle: errors.filter((e) => e === 'ELBOW_ANGLE').length,
      handWidth: errors.filter((e) => e === 'HAND_WIDTH').length,
      bodyAlignment: errors.filter((e) => e === 'BODY_ALIGNMENT').length,
      romIncomplete: errors.filter((e) => e === 'ROM_INCOMPLETE').length,
    };

    // Calculate success rate
    const successRate = totalReps > 0 ? Math.round((correctReps / totalReps) * 100) : 0;

    setSummary({
      correctReps,
      incorrectReps,
      totalReps,
      successRate,
      duration,
      errorBreakdown,
      isPersonalBest: false, // TODO: Implement personal best check
    });
  }, [searchParams]);

  const handleTryAgain = (): void => {
    router.push('/workout');
  };

  const handleDone = (): void => {
    router.push('/');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!summary) {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">Loading summary...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8 text-gray-900">
          Session Complete!
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Correct Reps */}
          <Card className="bg-green-50 border-2 border-green-500">
            <div className="text-center">
              <div className="text-5xl font-bold text-green-600 mb-2">
                {summary.correctReps}
              </div>
              <div className="text-lg text-gray-700 font-medium">Correct Reps</div>
            </div>
          </Card>

          {/* Incorrect Reps */}
          <Card className="bg-red-50 border-2 border-red-500">
            <div className="text-center">
              <div className="text-5xl font-bold text-red-600 mb-2">
                {summary.incorrectReps}
              </div>
              <div className="text-lg text-gray-700 font-medium">Incorrect Reps</div>
            </div>
          </Card>

          {/* Success Rate */}
          <Card className="bg-blue-50 border-2 border-blue-500">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 mb-2">
                {summary.successRate}%
              </div>
              <div className="text-lg text-gray-700 font-medium">Success Rate</div>
            </div>
          </Card>

          {/* Duration */}
          <Card className="bg-gray-50 border-2 border-gray-500">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-600 mb-2">
                {formatDuration(summary.duration)}
              </div>
              <div className="text-lg text-gray-700 font-medium">Duration</div>
            </div>
          </Card>
        </div>

        {/* Error Breakdown */}
        {summary.totalReps > 0 && (
          <Card className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Error Breakdown</h2>
            <div className="space-y-4">
              {summary.errorBreakdown.elbowAngle > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700">Elbow Angle</span>
                    <span className="text-gray-600 font-medium">
                      {summary.errorBreakdown.elbowAngle}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (summary.errorBreakdown.elbowAngle / summary.totalReps) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {summary.errorBreakdown.handWidth > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700">Hand Width</span>
                    <span className="text-gray-600 font-medium">
                      {summary.errorBreakdown.handWidth}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (summary.errorBreakdown.handWidth / summary.totalReps) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {summary.errorBreakdown.bodyAlignment > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700">Body Alignment</span>
                    <span className="text-gray-600 font-medium">
                      {summary.errorBreakdown.bodyAlignment}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (summary.errorBreakdown.bodyAlignment / summary.totalReps) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {summary.errorBreakdown.romIncomplete > 0 && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700">Incomplete Range of Motion</span>
                    <span className="text-gray-600 font-medium">
                      {summary.errorBreakdown.romIncomplete}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (summary.errorBreakdown.romIncomplete / summary.totalReps) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {Object.values(summary.errorBreakdown).every((count) => count === 0) && (
                <p className="text-gray-500 text-center py-4">No errors! Perfect form! 🎉</p>
              )}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" size="lg" onClick={handleTryAgain}>
            Try Again
          </Button>
          <Button variant="secondary" size="lg" onClick={handleDone}>
            Done
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function SummaryPage(): JSX.Element {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-600">Loading summary...</p>
        </div>
      </main>
    }>
      <SummaryContent />
    </Suspense>
  );
}

