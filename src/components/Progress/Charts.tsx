import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getWeeklyData,
  getMonthlyTrend,
  getTimeOfDayDistribution,
  getDurationDistribution
} from '../../utils/statsUtils';
import styles from './Charts.module.css';

type ChartType = 'weekly' | 'monthly' | 'timeOfDay' | 'duration';

// Chevron icon for expandable sections
const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`${styles.expandIcon} ${expanded ? styles.expanded : ''}`}
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Bar Chart Component
function BarChart({ data, maxValue }: { data: { label: string; value: number }[]; maxValue: number }) {
  const chartHeight = 120;
  const barWidth = 30;
  const gap = 10;
  const chartWidth = data.length * (barWidth + gap);

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
        const x = index * (barWidth + gap);
        const y = chartHeight - barHeight;

        return (
          <g key={item.label}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              className={styles.bar}
              rx="4"
            />
            {/* Value label */}
            {item.value > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 5}
                className={styles.barValue}
                textAnchor="middle"
              >
                {item.value}
              </text>
            )}
            {/* X-axis label */}
            <text
              x={x + barWidth / 2}
              y={chartHeight + 18}
              className={styles.barLabel}
              textAnchor="middle"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Line Chart Component
function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const chartHeight = 120;
  const chartWidth = 280;
  const padding = 40;
  const maxValue = Math.max(...data.map(d => d.value), 1);

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - ((item.value / maxValue) * (chartHeight - padding * 2));
    return { x, y, ...item };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg
      className={styles.chart}
      viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = chartHeight - padding - (ratio * (chartHeight - padding * 2));
        return (
          <line
            key={ratio}
            x1={padding}
            y1={y}
            x2={chartWidth - padding}
            y2={y}
            className={styles.gridLine}
          />
        );
      })}

      {/* Line */}
      <path d={pathD} className={styles.line} fill="none" />

      {/* Area fill */}
      <path
        d={`${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`}
        className={styles.area}
      />

      {/* Points and labels */}
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="4" className={styles.point} />
          <text x={point.x} y={chartHeight + 10} className={styles.lineLabel} textAnchor="middle">
            {point.label}
          </text>
          {point.value > 0 && (
            <text x={point.x} y={point.y - 10} className={styles.lineValue} textAnchor="middle">
              {point.value}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// Donut Chart Component
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const size = 160;
  const radius = 60;
  const innerRadius = 40;
  const center = size / 2;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = -90; // Start from top

  const segments = data.map(item => {
    if (total === 0) return { ...item, startAngle: 0, endAngle: 0, percentage: 0 };

    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return { ...item, startAngle, endAngle, percentage };
  });

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };

  const describeArc = (cx: number, cy: number, outerR: number, innerR: number, start: number, end: number) => {
    const startOuter = polarToCartesian(cx, cy, outerR, end);
    const endOuter = polarToCartesian(cx, cy, outerR, start);
    const startInner = polarToCartesian(cx, cy, innerR, end);
    const endInner = polarToCartesian(cx, cy, innerR, start);

    const largeArc = end - start > 180 ? 1 : 0;

    return `M ${startOuter.x} ${startOuter.y}
            A ${outerR} ${outerR} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}
            L ${endInner.x} ${endInner.y}
            A ${innerR} ${innerR} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}
            Z`;
  };

  return (
    <div className={styles.donutContainer}>
      <svg viewBox={`0 0 ${size} ${size}`} className={styles.donut}>
        {total === 0 ? (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth={radius - innerRadius}
          />
        ) : (
          segments.map((segment) => {
            if (segment.percentage === 0) return null;

            // Handle full circle case
            if (segment.percentage >= 99.9) {
              return (
                <circle
                  key={segment.label}
                  cx={center}
                  cy={center}
                  r={(radius + innerRadius) / 2}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={radius - innerRadius}
                />
              );
            }

            return (
              <path
                key={segment.label}
                d={describeArc(center, center, radius, innerRadius, segment.startAngle, segment.endAngle)}
                fill={segment.color}
              />
            );
          })
        )}
        <text x={center} y={center} className={styles.donutCenter} textAnchor="middle" dy="0.35em">
          {total}
        </text>
        <text x={center} y={center + 14} className={styles.donutLabel} textAnchor="middle">
          sessions
        </text>
      </svg>
      <div className={styles.legend}>
        {data.map(item => (
          <div key={item.label} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: item.color }} />
            <span className={styles.legendLabel}>{item.label}</span>
            <span className={styles.legendValue}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Charts() {
  const { sessions } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [activeChart, setActiveChart] = useState<ChartType>('weekly');

  // Memoize chart data calculations
  const weeklyData = useMemo(() => getWeeklyData(sessions), [sessions]);
  const monthlyData = useMemo(() => getMonthlyTrend(sessions), [sessions]);
  const timeOfDayData = useMemo(() => getTimeOfDayDistribution(sessions), [sessions]);
  const durationData = useMemo(() => getDurationDistribution(sessions), [sessions]);

  // Time of day colors
  const timeColors = {
    'Morning': 'var(--warning)',
    'Afternoon': 'var(--primary)',
    'Evening': 'var(--info)',
    'Night': 'var(--text-tertiary)'
  };

  const chartTabs: { id: ChartType; label: string }[] = [
    { id: 'weekly', label: 'Week' },
    { id: 'monthly', label: 'Month' },
    { id: 'timeOfDay', label: 'Time' },
    { id: 'duration', label: 'Length' }
  ];

  const renderChart = () => {
    switch (activeChart) {
      case 'weekly': {
        const maxMinutes = Math.max(...weeklyData.map(d => d.minutes), 1);
        return (
          <div className={styles.chartContainer}>
            <h4 className={styles.chartTitle}>Minutes per Day (This Week)</h4>
            <BarChart
              data={weeklyData.map(d => ({ label: d.day, value: d.minutes }))}
              maxValue={maxMinutes}
            />
          </div>
        );
      }
      case 'monthly':
        return (
          <div className={styles.chartContainer}>
            <h4 className={styles.chartTitle}>Minutes per Week (Last 4 Weeks)</h4>
            <LineChart
              data={monthlyData.map(d => ({ label: d.week, value: d.minutes }))}
            />
          </div>
        );
      case 'timeOfDay':
        return (
          <div className={styles.chartContainer}>
            <h4 className={styles.chartTitle}>Time of Day</h4>
            <DonutChart
              data={timeOfDayData.map(d => ({
                label: d.period,
                value: d.count,
                color: timeColors[d.period as keyof typeof timeColors]
              }))}
            />
          </div>
        );
      case 'duration': {
        const maxCount = Math.max(...durationData.map(d => d.count), 1);
        return (
          <div className={styles.chartContainer}>
            <h4 className={styles.chartTitle}>Session Duration</h4>
            <BarChart
              data={durationData.map(d => ({ label: d.range, value: d.count }))}
              maxValue={maxCount}
            />
          </div>
        );
      }
    }
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.expandHeader}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className={styles.expandTitle}>Charts</span>
        <span className={styles.expandSummary}>
          Visualize your practice
        </span>
        <ChevronIcon expanded={expanded} />
      </button>

      {expanded && (
        <div className={styles.content}>
          {/* Tab selector */}
          <div className={styles.tabs}>
            {chartTabs.map(tab => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeChart === tab.id ? styles.active : ''}`}
                onClick={() => setActiveChart(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chart display */}
          {renderChart()}

          {sessions.length === 0 && (
            <p className={styles.emptyMessage}>
              Complete meditation sessions to see your statistics here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default Charts;
