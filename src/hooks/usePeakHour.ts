import { useMemo } from 'react';
import { Appliance } from '../types/appliance';

export function usePeakHour(appliances: Appliance[]) {
  return useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Find all appliances that have a peak window
    const peakAppliances = appliances.filter(
      (a) => a.peak_start && a.peak_end
    );

    if (peakAppliances.length === 0) return { label: 'None set', isInPeak: false, activeCount: 0 };

    // Check which appliances are currently in their peak window
    const currentlyPeaking = peakAppliances.filter((a) => {
      const [startH, startM] = a.peak_start!.split(':').map(Number);
      const [endH, endM] = a.peak_end!.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      const nowTotal = currentHour * 60 + currentMinutes;
      return nowTotal >= startTotal && nowTotal < endTotal;
    });

    if (currentlyPeaking.length > 0) {
      // We're inside a peak window right now
      const earliest = currentlyPeaking.reduce((prev, curr) => {
        const [endH, endM] = curr.peak_end!.split(':').map(Number);
        const [prevH, prevM] = prev.peak_end!.split(':').map(Number);
        return endH * 60 + endM < prevH * 60 + prevM ? curr : prev;
      });
      return {
        label: `Until ${formatTime(earliest.peak_end!)}`,
        isInPeak: true,
        activeCount: currentlyPeaking.length,
      };
    }

    // Not in peak right now — find the next upcoming peak
    const upcoming = peakAppliances
      .map((a) => {
        const [h, m] = a.peak_start!.split(':').map(Number);
        return { appliance: a, totalMinutes: h * 60 + m };
      })
      .filter(({ totalMinutes }) => totalMinutes > currentHour * 60 + currentMinutes)
      .sort((a, b) => a.totalMinutes - b.totalMinutes);

    if (upcoming.length > 0) {
      return {
        label: `Next: ${formatTime(upcoming[0].appliance.peak_start!)}`,
        isInPeak: false,
        activeCount: 0,
      };
    }

    return { label: 'None today', isInPeak: false, activeCount: 0 };
  }, [appliances]);
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${period}` : `${hour}:${m.toString().padStart(2, '0')}${period}`;
}