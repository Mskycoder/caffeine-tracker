import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { useCaffeineStore } from '../store/caffeine-store';
import { generateStackedCurveData, parseNextBedtime, getCaffeineLevel } from '../engine/caffeine';
import { PROJECTION_STEP_MS } from '../engine/constants';
import { getDrinkColor } from '../data/colors';
import { getEffectiveHalfLife } from '../engine/metabolism';
import { useCurrentTime } from '../hooks/useCurrentTime';
import type { DrinkEntry } from '../engine/types';

/**
 * Custom tooltip for stacked per-drink area chart.
 * Shows per-drink name, color swatch, mg value, and a total line
 * when multiple drinks are present. Serves as tooltip-only legend (D-06).
 */
interface StackedTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number; color?: string }>;
  label?: string | number;
  drinks: DrinkEntry[];
}

function StackedTooltip({ active, payload, label, drinks }: StackedTooltipProps) {
  if (!active || !payload?.length) return null;

  const time = format(new Date(Number(label)), 'h:mm a');
  const entries = payload
    .filter((p) => (p.value ?? 0) > 0.5)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const total = entries.reduce((sum, p) => sum + (p.value ?? 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-3 text-sm">
      <p className="font-medium text-gray-700 mb-1">{time}</p>
      {entries.map((entry) => {
        const drink = drinks.find((d) => d.id === entry.dataKey);
        return (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{drink?.name ?? 'Unknown'}</span>
            <span className="ml-auto font-medium">{Math.round(entry.value ?? 0)} mg</span>
          </div>
        );
      })}
      {entries.length > 1 && (
        <div className="border-t border-gray-100 mt-1 pt-1 font-semibold text-gray-900">
          Total: {Math.round(total)} mg
        </div>
      )}
    </div>
  );
}

/**
 * Caffeine decay curve chart showing caffeine level over a 48-hour window.
 *
 * Features:
 * - Stacked per-drink colored area chart (VIZ-05 / D-01)
 * - 48h window: ~24h past + ~24h future centered on now (D-02)
 * - Vertical dashed "Now" line separating past from projected (D-03)
 * - Horizontal dashed sleep threshold line at configured mg (D-04 / VIZ-03)
 * - Vertical dashed indigo bedtime line with projected mg label (BED-02)
 * - Custom tooltip showing per-drink breakdown on hover (D-06)
 *
 * Visual layering (back to front): grid, threshold, bedtime line, "Now" line, drink areas.
 * Bedtime line only renders when targetBedtime is set (not null).
 *
 * Data is recomputed every 30 seconds via useCurrentTime hook.
 * Parent div has responsive height: h-[220px] on mobile, sm:h-[300px] on desktop (Recharts Pitfall 1).
 * XAxis uses type="number" with epoch ms domain (Recharts Pitfall 2).
 */
export function DecayCurveChart() {
  const now = useCurrentTime();
  const drinks = useCaffeineStore((s) => s.drinks);
  const settings = useCaffeineStore((s) => s.settings);
  const effectiveHalfLife = getEffectiveHalfLife(settings);

  // BED-02: Bedtime projection for chart marker (D-05, D-06, D-07)
  const bedtimeStr = settings.targetBedtime;
  const targetBedtimeMs = bedtimeStr !== null
    ? parseNextBedtime(bedtimeStr, now)
    : null;
  const bedtimeMg = targetBedtimeMs !== null
    ? getCaffeineLevel(drinks, targetBedtimeMs, effectiveHalfLife)
    : 0;

  // 48h window centered on now (~24h past + ~24h future)
  const windowMs = 24 * 60 * 60 * 1000;
  const startTime = now - windowMs;
  const endTime = now + windowMs;

  const stackedData = generateStackedCurveData(
    drinks, startTime, endTime, PROJECTION_STEP_MS, effectiveHalfLife
  );

  // Extract active drink IDs sorted chronologically (earliest at bottom of stack)
  const activeDrinkIds = useMemo(() => {
    const ids = new Set<string>();
    for (const point of stackedData) {
      for (const key of Object.keys(point)) {
        if (key !== 'time' && key !== 'total') ids.add(key);
      }
    }
    return Array.from(ids).sort((a, b) => {
      const drinkA = drinks.find((d) => d.id === a);
      const drinkB = drinks.find((d) => d.id === b);
      return (drinkA?.timestamp ?? 0) - (drinkB?.timestamp ?? 0);
    });
  }, [stackedData, drinks]);

  // Build color map for each drink using preset color or hash fallback
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const drink of drinks) {
      map[drink.id] = getDrinkColor(drink.presetId, drink.name);
    }
    return map;
  }, [drinks]);

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Caffeine Level
      </h2>
      <div className="h-[220px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stackedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(epoch: number) => format(new Date(epoch), 'ha').toLowerCase()}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(mg: number) => `${Math.round(mg)}`}
              tick={{ fontSize: 12 }}
              width={40}
            />
            <Tooltip content={<StackedTooltip drinks={drinks} />} />
            {/* VIZ-03: Sleep threshold reference line */}
            <ReferenceLine
              y={settings.thresholdMg}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: `${settings.thresholdMg} mg`, position: 'right', fill: '#f59e0b', fontSize: 12 }}
            />
            {/* BED-02: Vertical bedtime line with mg label */}
            {targetBedtimeMs !== null && (
              <ReferenceLine
                x={targetBedtimeMs}
                stroke="#818cf8"
                strokeDasharray="6 4"
                label={{
                  value: `${Math.round(bedtimeMg)}mg`,
                  position: 'insideTopRight',
                  fill: '#818cf8',
                  fontSize: 12,
                }}
              />
            )}
            {/* D-03: Vertical "Now" line */}
            <ReferenceLine
              x={now}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: 'Now', position: 'top', fill: '#94a3b8', fontSize: 12 }}
            />
            {/* VIZ-05: Stacked per-drink colored areas */}
            {activeDrinkIds.map((drinkId) => (
              <Area
                key={drinkId}
                type="monotone"
                dataKey={drinkId}
                stackId="caffeine"
                stroke={colorMap[drinkId] ?? '#94a3b8'}
                fill={colorMap[drinkId] ?? '#94a3b8'}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
