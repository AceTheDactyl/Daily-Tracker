/**
 * Analytics Page
 *
 * Comprehensive analytics dashboard accessible via navigation.
 * Includes rhythm patterns, music meditation metrics, and emotional coherence tracking.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, BarChart3, Activity, Music,
  Heart, Brain, ArrowLeft, Clock, Target
} from 'lucide-react';
import {
  musicLibrary,
  EMOTIONAL_CATEGORIES,
  type EmotionalCategoryId,
  type MusicSession
} from '../lib/musicLibrary';
import { MusicLibrary } from './MusicLibrary';

// Types
interface CheckIn {
  id: string;
  category: string;
  task: string;
  waveId?: string;
  slot: string;
  loggedAt: string;
  done: boolean;
  isAnchor?: boolean;
}

interface Wave {
  id: string;
  name: string;
  color: string;
}

interface AnalyticsPageProps {
  checkIns: CheckIn[];
  waves: Wave[];
  onBack: () => void;
}

// Color mapping
const COLORS = {
  cyan: '#22d3ee',
  purple: '#a855f7',
  blue: '#3b82f6',
  orange: '#f97316',
  pink: '#ec4899',
  green: '#22c55e',
  amber: '#f59e0b',
  rose: '#f43f5e',
  gray: '#6b7280'
};

const CATEGORY_COLORS: Record<string, string> = {
  Workout: COLORS.pink,
  Moderation: COLORS.cyan,
  Meditation: COLORS.green,
  Emotion: COLORS.purple,
  General: COLORS.gray,
  Journal: COLORS.blue,
  Anchor: COLORS.amber
};

// Utility functions
const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const formatDate = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const getDateRange = (days: number): Date[] => {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

/**
 * Simple Line Chart
 */
function LineChart({
  data,
  width = 300,
  height = 150,
  color = COLORS.cyan,
  showArea = false
}: {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
}) {
  if (data.length === 0) return null;

  const padding = { top: 10, right: 10, bottom: 25, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.value - minValue) / range) * chartHeight
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = linePath +
    ` L ${points[points.length - 1].x} ${padding.top + chartHeight}` +
    ` L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <line
          key={ratio}
          x1={padding.left}
          y1={padding.top + chartHeight * (1 - ratio)}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight * (1 - ratio)}
          stroke="#374151"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}
      {[0, 0.5, 1].map(ratio => (
        <text
          key={ratio}
          x={padding.left - 5}
          y={padding.top + chartHeight * (1 - ratio) + 4}
          textAnchor="end"
          fontSize="10"
          fill="#6b7280"
        >
          {Math.round(minValue + range * ratio)}
        </text>
      ))}
      {showArea && <path d={areaPath} fill={color} fillOpacity="0.1" />}
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
      {data.map((d, i) => (
        i % Math.ceil(data.length / 5) === 0 && (
          <text key={i} x={points[i].x} y={height - 5} textAnchor="middle" fontSize="9" fill="#6b7280">
            {d.label}
          </text>
        )
      ))}
    </svg>
  );
}

/**
 * Donut Chart
 */
function DonutChart({
  data,
  size = 120,
  thickness = 20
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={(size - thickness) / 2} fill="none" stroke="#374151" strokeWidth={thickness} />
      </svg>
    );
  }

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {data.map((d, i) => {
        const percentage = d.value / total;
        const strokeLength = percentage * circumference;
        const offset = currentOffset;
        currentOffset += strokeLength;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/**
 * Stat Card
 */
function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color = 'cyan',
  trend
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const colorClasses: Record<string, string> = {
    cyan: 'from-cyan-950/50 to-cyan-900/30 border-cyan-700/30 text-cyan-400',
    purple: 'from-purple-950/50 to-purple-900/30 border-purple-700/30 text-purple-400',
    amber: 'from-amber-950/50 to-amber-900/30 border-amber-700/30 text-amber-400',
    rose: 'from-rose-950/50 to-rose-900/30 border-rose-700/30 text-rose-400',
    green: 'from-emerald-950/50 to-emerald-900/30 border-emerald-700/30 text-emerald-400',
    pink: 'from-pink-950/50 to-pink-900/30 border-pink-700/30 text-pink-400'
  };

  return (
    <div className={`rounded-xl p-4 bg-gradient-to-br ${colorClasses[color] || colorClasses.cyan} border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
        </div>
        <div className="p-2 rounded-lg bg-black/20">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className={`text-xs mt-2 flex items-center gap-1 ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-gray-400'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
        </div>
      )}
    </div>
  );
}

/**
 * Main Analytics Page Component
 */
export function AnalyticsPage({ checkIns, waves, onBack }: AnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rhythm' | 'music' | 'coherence' | 'library'>('overview');
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [musicSessions, setMusicSessions] = useState<MusicSession[]>([]);
  const [coherenceStats, setCoherenceStats] = useState<any>(null);
  const [listeningTime, setListeningTime] = useState<Record<EmotionalCategoryId, number> | null>(null);

  // Load music data
  useEffect(() => {
    const loadMusicData = async () => {
      await musicLibrary.initialize();
      const sessions = await musicLibrary.getAllSessions();
      setMusicSessions(sessions);

      const stats = await musicLibrary.getCoherenceStats(timeRange);
      setCoherenceStats(stats);

      const listening = await musicLibrary.getListeningTimeByCategory(timeRange);
      setListeningTime(listening);
    };

    loadMusicData();
  }, [timeRange]);

  // Calculate rhythm analytics
  const rhythmAnalytics = useMemo(() => {
    const dates = getDateRange(timeRange);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyStats = dates.map(date => {
      const dayCheckIns = checkIns.filter(c => sameDay(new Date(c.slot), date));
      const completed = dayCheckIns.filter(c => c.done).length;
      const total = dayCheckIns.length;
      return {
        date,
        label: formatDate(date),
        completed,
        total,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      };
    });

    const categoryStats: Record<string, { total: number; completed: number }> = {};
    checkIns.forEach(c => {
      const date = new Date(c.slot);
      if (date >= dates[0] && date <= dates[dates.length - 1]) {
        if (!categoryStats[c.category]) categoryStats[c.category] = { total: 0, completed: 0 };
        categoryStats[c.category].total++;
        if (c.done) categoryStats[c.category].completed++;
      }
    });

    const waveStats: Record<string, number> = {};
    checkIns.forEach(c => {
      const date = new Date(c.slot);
      if (date >= dates[0] && date <= dates[dates.length - 1] && c.waveId) {
        waveStats[c.waveId] = (waveStats[c.waveId] || 0) + 1;
      }
    });

    const totalTasks = dailyStats.reduce((sum, d) => sum + d.total, 0);
    const completedTasks = dailyStats.reduce((sum, d) => sum + d.completed, 0);

    const midpoint = Math.floor(dailyStats.length / 2);
    const firstHalf = dailyStats.slice(0, midpoint);
    const secondHalf = dailyStats.slice(midpoint);
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, d) => sum + d.completionRate, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, d) => sum + d.completionRate, 0) / secondHalf.length : 0;
    const trend: 'up' | 'down' | 'neutral' = secondHalfAvg > firstHalfAvg + 5 ? 'up' : secondHalfAvg < firstHalfAvg - 5 ? 'down' : 'neutral';

    return { dailyStats, categoryStats, waveStats, totalTasks, completedTasks, trend };
  }, [checkIns, timeRange]);

  // Music session analytics
  const musicAnalytics = useMemo(() => {
    const dates = getDateRange(timeRange);
    const filteredSessions = musicSessions.filter(s => {
      const date = new Date(s.startedAt);
      return date >= dates[0] && date <= dates[dates.length - 1];
    });

    const dailyListening = dates.map(date => {
      const daySessions = filteredSessions.filter(s => sameDay(new Date(s.startedAt), date));
      const totalDuration = daySessions.reduce((sum, s) => sum + s.duration, 0);
      return { label: formatDate(date), value: Math.round(totalDuration / 60) };
    });

    const categoryUsage = Object.entries(EMOTIONAL_CATEGORIES).map(([key, cat]) => {
      const catSessions = filteredSessions.filter(s => s.categoryId === key);
      return { label: cat.name, value: catSessions.length, color: cat.color };
    }).filter(c => c.value > 0);

    return { dailyListening, categoryUsage, totalSessions: filteredSessions.length };
  }, [musicSessions, timeRange]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'rhythm', label: 'Rhythm', icon: Activity },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'coherence', label: 'Coherence', icon: Heart },
    { id: 'library', label: 'Library', icon: Music }
  ] as const;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>

            <div className="flex items-center gap-2">
              {([7, 14, 30] as const).map(days => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    timeRange === days
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-light flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-purple-400" />
              Analytics Overview
            </h2>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Task Completion"
                value={`${rhythmAnalytics.totalTasks > 0 ? Math.round((rhythmAnalytics.completedTasks / rhythmAnalytics.totalTasks) * 100) : 0}%`}
                subValue={`${rhythmAnalytics.completedTasks}/${rhythmAnalytics.totalTasks} tasks`}
                icon={Target}
                color="cyan"
                trend={rhythmAnalytics.trend}
              />
              <StatCard
                label="Music Sessions"
                value={musicAnalytics.totalSessions}
                subValue={`Over ${timeRange} days`}
                icon={Music}
                color="purple"
              />
              <StatCard
                label="Coherence Rate"
                value={coherenceStats ? `${Math.round(coherenceStats.coherenceRate)}%` : '—'}
                subValue="Desired vs Experienced"
                icon={Heart}
                color="pink"
              />
              <StatCard
                label="Mood Improvement"
                value={coherenceStats ? `+${coherenceStats.avgMoodImprovement.toFixed(1)}` : '—'}
                subValue="Avg session change"
                icon={TrendingUp}
                color="green"
              />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Task Completion Trend
                </h3>
                <LineChart
                  data={rhythmAnalytics.dailyStats.map(d => ({ label: d.label, value: d.completionRate }))}
                  width={350}
                  height={180}
                  color={COLORS.cyan}
                  showArea
                />
              </div>

              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Music className="w-4 h-4 text-purple-400" />
                  Daily Listening (minutes)
                </h3>
                <LineChart
                  data={musicAnalytics.dailyListening}
                  width={350}
                  height={180}
                  color={COLORS.purple}
                  showArea
                />
              </div>
            </div>
          </div>
        )}

        {/* Rhythm Tab */}
        {activeTab === 'rhythm' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-light flex items-center gap-3">
              <Activity className="w-7 h-7 text-cyan-400" />
              Rhythm Patterns
            </h2>

            <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Completion Rate by Day</h3>
              <LineChart
                data={rhythmAnalytics.dailyStats.map(d => ({ label: d.label, value: d.completionRate }))}
                width={700}
                height={250}
                color={COLORS.cyan}
                showArea
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Wave Distribution</h3>
                <div className="flex items-center justify-center gap-6">
                  <DonutChart
                    data={waves.filter(w => rhythmAnalytics.waveStats[w.id]).map(w => ({
                      label: w.name,
                      value: rhythmAnalytics.waveStats[w.id] || 0,
                      color: COLORS[w.color as keyof typeof COLORS] || COLORS.gray
                    }))}
                    size={120}
                    thickness={20}
                  />
                  <div className="space-y-2">
                    {waves.filter(w => rhythmAnalytics.waveStats[w.id]).map(w => (
                      <div key={w.id} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[w.color as keyof typeof COLORS] }} />
                        <span className="text-gray-400">{w.name}</span>
                        <span className="text-gray-500">({rhythmAnalytics.waveStats[w.id]})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Category Completion</h3>
                <div className="space-y-3">
                  {Object.entries(rhythmAnalytics.categoryStats)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([category, stats]) => {
                      const rate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                      return (
                        <div key={category} className="flex items-center gap-3">
                          <span className="w-20 text-sm text-gray-400 truncate">{category}</span>
                          <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${rate}%`, backgroundColor: CATEGORY_COLORS[category] || COLORS.gray }}
                            />
                          </div>
                          <span className="w-10 text-sm text-gray-300 text-right">{rate}%</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Music Tab */}
        {activeTab === 'music' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-light flex items-center gap-3">
              <Music className="w-7 h-7 text-purple-400" />
              Music Meditation Analytics
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Sessions"
                value={coherenceStats?.totalSessions || 0}
                subValue={`${timeRange} day period`}
                icon={Music}
                color="purple"
              />
              <StatCard
                label="Completed"
                value={coherenceStats?.completedSessions || 0}
                subValue="Full sessions"
                icon={Target}
                color="green"
              />
              <StatCard
                label="Listening Time"
                value={listeningTime ? formatDuration(Object.values(listeningTime).reduce((a, b) => a + b, 0)) : '—'}
                subValue="Total duration"
                icon={Clock}
                color="cyan"
              />
              <StatCard
                label="Coherent Sessions"
                value={coherenceStats?.coherentSessions || 0}
                subValue="Matched expectations"
                icon={Heart}
                color="pink"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Emotional Category Usage</h3>
                <div className="flex items-center justify-center gap-6">
                  <DonutChart data={musicAnalytics.categoryUsage} size={140} thickness={25} />
                  <div className="space-y-2">
                    {musicAnalytics.categoryUsage.map(cat => (
                      <div key={cat.label} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-gray-400">{cat.label}</span>
                        <span className="text-gray-500">({cat.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Listening Time by Emotion</h3>
                {listeningTime && (
                  <div className="space-y-3">
                    {Object.entries(listeningTime)
                      .filter(([_, time]) => time > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([key, time]) => {
                        const cat = EMOTIONAL_CATEGORIES[key as EmotionalCategoryId];
                        const maxTime = Math.max(...Object.values(listeningTime));
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-xl">{cat.icon}</span>
                            <span className="w-20 text-sm text-gray-400 truncate">{cat.name}</span>
                            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${(time / maxTime) * 100}%`, backgroundColor: cat.color }}
                              />
                            </div>
                            <span className="text-sm text-gray-300">{formatDuration(time)}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Coherence Tab */}
        {activeTab === 'coherence' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-light flex items-center gap-3">
              <Heart className="w-7 h-7 text-pink-400" />
              Emotional Coherence
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                label="Coherence Rate"
                value={coherenceStats ? `${Math.round(coherenceStats.coherenceRate)}%` : '—'}
                subValue="Desired = Experienced"
                icon={Target}
                color="pink"
              />
              <StatCard
                label="Avg Mood Change"
                value={coherenceStats ? (coherenceStats.avgMoodImprovement > 0 ? `+${coherenceStats.avgMoodImprovement.toFixed(1)}` : coherenceStats.avgMoodImprovement.toFixed(1)) : '—'}
                subValue="Before → After"
                icon={TrendingUp}
                color={coherenceStats?.avgMoodImprovement > 0 ? 'green' : 'amber'}
              />
              <StatCard
                label="Sessions w/ Data"
                value={coherenceStats ? `${coherenceStats.coherentSessions + (coherenceStats.completedSessions - coherenceStats.coherentSessions)}` : '—'}
                subValue="With post-session feedback"
                icon={Brain}
                color="purple"
              />
            </div>

            <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-4">Coherence by Emotional Category</h3>
              {coherenceStats?.categoryBreakdown && (
                <div className="space-y-4">
                  {Object.entries(coherenceStats.categoryBreakdown)
                    .filter(([_, data]: [string, any]) => data.sessions > 0)
                    .sort((a: any, b: any) => b[1].sessions - a[1].sessions)
                    .map(([key, data]: [string, any]) => {
                      const cat = EMOTIONAL_CATEGORIES[key as EmotionalCategoryId];
                      const coherenceRate = data.sessions > 0 ? (data.coherentSessions / data.sessions) * 100 : 0;
                      return (
                        <div key={key} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{cat.icon}</span>
                              <span className="font-medium">{cat.name}</span>
                            </div>
                            <div className="text-sm text-gray-400">
                              {data.sessions} sessions
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Coherence</p>
                              <p className="text-lg font-medium" style={{ color: cat.color }}>
                                {Math.round(coherenceRate)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Coherent</p>
                              <p className="text-lg">{data.coherentSessions}/{data.sessions}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Mood Change</p>
                              <p className={`text-lg ${data.avgMoodChange > 0 ? 'text-emerald-400' : data.avgMoodChange < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                                {data.avgMoodChange > 0 ? '+' : ''}{data.avgMoodChange.toFixed(1)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-light flex items-center gap-3">
              <Music className="w-7 h-7 text-purple-400" />
              Music Library
            </h2>
            <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden">
              <MusicLibrary compact />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
