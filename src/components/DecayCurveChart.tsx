import {
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { useCaffeineStore } from '../store/caffeine-store';
import { generateCurveData } from '../engine/caffeine';
import { PROJECTION_STEP_MS } from '../engine/constants';
import { useCurrentTime } from '../hooks/useCurrentTime';

/**
 * Caffeine decay curve chart showing caffeine level over a 48-hour window.
 *
 * Features:
 * - Filled area chart with indigo gradient (D-01)
 * - 48h window: ~24h past + ~24h future centered on now (D-02)
 * - Vertical dashed "Now" line separating past from projected (D-03)
 * - Horizontal dashed sleep threshold line at configured mg (D-04 / VIZ-03)
 * - Tooltip showing time and caffeine value on hover (D-05)
 *
 * Data is recomputed every 30 seconds via useCurrentTime hook.
 * Parent div has explicit h-[300px] height (Recharts Pitfall 1).
 * XAxis uses type="number" with epoch ms domain (Recharts Pitfall 2).
 */
export function DecayCurveChart() {
  const now = useCurrentTime();
  const drinks = useCaffeineStore((s) => s.drinks);
  const settings = useCaffeineStore((s) => s.settings);

  // 48h window centered on now (~24h past + ~24h future)
  const windowMs = 24 * 60 * 60 * 1000;
  const startTime = now - windowMs;
  const endTime = now + windowMs;

  const curveData = generateCurveData(
    drinks, startTime, endTime, PROJECTION_STEP_MS, settings.halfLifeHours
  );

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
        Caffeine Level
      </h2>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="caffeineFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
              </linearGradient>
            </defs>
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
            <Tooltip
              labelFormatter={(epoch) => format(new Date(Number(epoch)), 'h:mm a')}
              formatter={(value) => [`${Math.round(Number(value))} mg`, 'Caffeine']}
            />
            {/* VIZ-03: Sleep threshold reference line */}
            <ReferenceLine
              y={settings.thresholdMg}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              label={{ value: `${settings.thresholdMg} mg`, position: 'right', fill: '#f59e0b', fontSize: 12 }}
            />
            {/* D-03: Vertical "Now" line */}
            <ReferenceLine
              x={now}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{ value: 'Now', position: 'top', fill: '#94a3b8', fontSize: 12 }}
            />
            {/* D-01: Filled area chart */}
            <Area
              type="monotone"
              dataKey="mg"
              stroke="#6366f1"
              fill="url(#caffeineFill)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
