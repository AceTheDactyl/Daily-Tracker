/**
 * Analytics Page
 *
 * Comprehensive analytics dashboard accessible via navigation.
 * Includes rhythm patterns, music meditation metrics, emotional coherence tracking,
 * and full DeltaHV metrics integration with neural map visualization.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, BarChart3, Activity, Music,
  Heart, Brain, ArrowLeft, Clock, Target,
  Sparkles, Zap, Shield, Waves, AlertTriangle, CheckCircle2,
  Plus, Play, Trash2, ChevronDown, ListMusic, X
} from 'lucide-react';
import {
  musicLibrary,
  EMOTIONAL_CATEGORIES,
  type EmotionalCategoryId,
  type MusicSession
} from '../lib/musicLibrary';
import { MusicLibrary } from './MusicLibrary';
import { metricsHub, type EnhancedDeltaHVState, type MetricsSnapshot as HubMetricsSnapshot } from '../lib/metricsHub';
import { userProfileService, type MetricsSnapshot as ProfileMetricsSnapshot } from '../lib/userProfile';
import type { DeltaHVState } from '../lib/deltaHVEngine';
import { storyShuffleEngine, type Playlist } from '../lib/storyShuffleEngine';

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
  deltaHV?: DeltaHVState | null;
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
 * DeltaHV Metric Display Card
 */
function DeltaHVCard({
  metric,
  value,
  regions,
  color
}: {
  metric: 'symbolic' | 'resonance' | 'friction' | 'stability';
  value: number;
  regions: Array<{ glyph: string; name: string; active: boolean }>;
  color: string;
}) {
  const labels = {
    symbolic: { name: 'Symbolic (S)', desc: 'Meaning & intention density', icon: Sparkles },
    resonance: { name: 'Resonance (R)', desc: 'Alignment with rhythm', icon: Waves },
    friction: { name: 'Friction (δφ)', desc: 'Resistance in flow', icon: Zap },
    stability: { name: 'Stability (H)', desc: 'Harmonic coherence', icon: Shield },
  };

  const { name, desc, icon: Icon } = labels[metric];

  return (
    <div className="rounded-xl bg-gray-900/60 border border-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-${color}-500/20`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
          </div>
          <div>
            <p className="font-medium text-sm">{name}</p>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
          <p className="text-xs text-gray-500">/100</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500`}
          style={{ width: `${value}%`, backgroundColor: `var(--color-${color}-500, ${COLORS[color as keyof typeof COLORS] || COLORS.cyan})` }}
        />
      </div>

      {/* Brain regions */}
      <div className="flex flex-wrap gap-1">
        {regions.map((region, i) => (
          <span
            key={i}
            className={`text-xs px-2 py-0.5 rounded-full ${
              region.active
                ? `bg-${color}-500/30 text-${color}-300`
                : 'bg-gray-800/50 text-gray-600'
            }`}
            title={region.name}
          >
            {region.glyph}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Neural Map Visualization
 */
function NeuralMapViz({
  metricsState
}: {
  metricsState: EnhancedDeltaHVState | null;
}) {
  if (!metricsState) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No neural activity data available</p>
        <p className="text-xs mt-1">Complete tasks and engage with the app to see brain region activation</p>
      </div>
    );
  }

  const { brainActivation, fieldState, deltaHV } = metricsState;

  const fieldColors = {
    coherent: 'from-emerald-500/20 to-cyan-500/20 border-emerald-500/50',
    transitioning: 'from-amber-500/20 to-yellow-500/20 border-amber-500/50',
    fragmented: 'from-rose-500/20 to-red-500/20 border-rose-500/50',
    dormant: 'from-gray-500/20 to-gray-600/20 border-gray-500/50',
  };

  const allRegions = [
    { metric: 'symbolic', label: 'Symbolic Density', color: 'purple', regions: brainActivation.symbolic },
    { metric: 'resonance', label: 'Resonance Coupling', color: 'cyan', regions: brainActivation.resonance },
    { metric: 'friction', label: 'Friction Points', color: 'amber', regions: brainActivation.friction },
    { metric: 'stability', label: 'Harmonic Stability', color: 'emerald', regions: brainActivation.stability },
  ];

  return (
    <div className="space-y-6">
      {/* Field State Overview */}
      <div className={`rounded-xl p-6 bg-gradient-to-br ${fieldColors[fieldState]} border text-center`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain className="w-8 h-8" />
          <span className="text-2xl font-bold">{deltaHV}</span>
          <span className="text-sm text-gray-400">/100</span>
        </div>
        <p className="text-lg font-medium capitalize">{fieldState} Field</p>
        <p className="text-xs text-gray-400 mt-1">
          {fieldState === 'coherent' && 'High alignment between intention and action'}
          {fieldState === 'transitioning' && 'Building momentum toward coherence'}
          {fieldState === 'fragmented' && 'Multiple focus points, scattered energy'}
          {fieldState === 'dormant' && 'Low activity, awaiting engagement'}
        </p>
      </div>

      {/* Brain Region Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {allRegions.map(({ metric, label, color, regions }) => (
          <div
            key={metric}
            className={`rounded-xl bg-gray-900/50 border border-gray-800 p-4`}
          >
            <h4 className={`text-sm font-medium text-${color}-400 mb-3`}>{label}</h4>
            {regions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {regions.map((region, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1.5 rounded-lg bg-${color}-500/20 text-${color}-300 text-sm`}
                  >
                    {region}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">No active regions</p>
            )}
          </div>
        ))}
      </div>

      {/* Source Contributions */}
      <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Metric Sources</h4>
        <div className="space-y-2">
          {metricsState.sources.map(source => (
            <div key={source.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{source.name}</span>
              <span className="text-gray-300">{Math.round(source.weight * 100)}% weight</span>
            </div>
          ))}
        </div>
      </div>

      {/* Music Influence */}
      {metricsState.musicInfluence && (
        <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
          <h4 className="text-sm font-medium text-purple-400 mb-3">🎵 Music Influence</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Skip Ratio</p>
              <p className={metricsState.musicInfluence.skipRatio > 0.5 ? 'text-amber-400' : 'text-emerald-400'}>
                {Math.round(metricsState.musicInfluence.skipRatio * 100)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Authorship Score</p>
              <p className="text-cyan-400">{Math.round(metricsState.musicInfluence.authorshipScore)}</p>
            </div>
            <div>
              <p className="text-gray-500">Healing Progress</p>
              <p className="text-pink-400">{Math.round(metricsState.musicInfluence.healingProgress)}%</p>
            </div>
            <div>
              <p className="text-gray-500">Emotional Trajectory</p>
              <p className="text-purple-400 capitalize">{metricsState.musicInfluence.emotionalTrajectory}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Health Insights Panel - Detection for good AND bad health signs
 */
function HealthInsights({
  metricsState,
  profileHistory
}: {
  metricsState: EnhancedDeltaHVState | null;
  profileHistory: ProfileMetricsSnapshot[];
}) {
  if (!metricsState) return null;

  const insights: Array<{ type: 'positive' | 'warning' | 'neutral'; message: string; icon: React.ElementType }> = [];

  // Check symbolic density
  if (metricsState.symbolicDensity >= 70) {
    insights.push({
      type: 'positive',
      message: 'High symbolic engagement - your intentions are clear',
      icon: CheckCircle2
    });
  } else if (metricsState.symbolicDensity < 30) {
    insights.push({
      type: 'warning',
      message: 'Low symbolic density - try journaling or setting intentions',
      icon: AlertTriangle
    });
  }

  // Check resonance
  if (metricsState.resonanceCoupling >= 70) {
    insights.push({
      type: 'positive',
      message: 'Excellent rhythm alignment - you\'re in sync with your schedule',
      icon: CheckCircle2
    });
  } else if (metricsState.resonanceCoupling < 30) {
    insights.push({
      type: 'warning',
      message: 'Low resonance - tasks may not align with your natural rhythm',
      icon: AlertTriangle
    });
  }

  // Check friction
  if (metricsState.frictionCoefficient <= 30) {
    insights.push({
      type: 'positive',
      message: 'Low friction - smooth flow through your day',
      icon: CheckCircle2
    });
  } else if (metricsState.frictionCoefficient >= 70) {
    insights.push({
      type: 'warning',
      message: 'High friction detected - consider simplifying or delegating',
      icon: AlertTriangle
    });
  }

  // Check stability
  if (metricsState.harmonicStability >= 70) {
    insights.push({
      type: 'positive',
      message: 'Strong harmonic stability - consistent patterns established',
      icon: CheckCircle2
    });
  } else if (metricsState.harmonicStability < 30) {
    insights.push({
      type: 'warning',
      message: 'Low stability - try establishing anchor routines',
      icon: AlertTriangle
    });
  }

  // Check overall coherence
  if (metricsState.fieldState === 'coherent') {
    insights.unshift({
      type: 'positive',
      message: 'You\'re in a coherent state! Excellent work maintaining balance.',
      icon: Sparkles
    });
  }

  // Check for positive trends in profile history
  if (profileHistory.length >= 3) {
    const recent = profileHistory.slice(-3);
    const avgDeltaHV = recent.reduce((sum, s) => sum + s.deltaHV, 0) / recent.length;
    const firstDeltaHV = recent[0].deltaHV;

    if (avgDeltaHV > firstDeltaHV + 10) {
      insights.push({
        type: 'positive',
        message: 'Your DeltaHV is trending upward - keep up the momentum!',
        icon: TrendingUp
      });
    }
  }

  if (insights.length === 0) return null;

  return (
    <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
        <Heart className="w-4 h-4 text-pink-400" />
        Health Insights
      </h4>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 p-2 rounded-lg ${
              insight.type === 'positive' ? 'bg-emerald-500/10 text-emerald-300' :
              insight.type === 'warning' ? 'bg-amber-500/10 text-amber-300' :
              'bg-gray-500/10 text-gray-300'
            }`}
          >
            <insight.icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{insight.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Library with Playlist Manager Component
 */
function LibraryWithPlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistEmoji, setNewPlaylistEmoji] = useState('🎵');

  useEffect(() => {
    const loadData = async () => {
      await musicLibrary.initialize();
      const allTracks = await musicLibrary.getAllTracks();
      setTracks(allTracks);
      setPlaylists(storyShuffleEngine.getPlaylists());
    };
    loadData();

    const unsub = storyShuffleEngine.subscribe(() => {
      setPlaylists(storyShuffleEngine.getPlaylists());
    });
    return () => unsub();
  }, []);

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    storyShuffleEngine.createPlaylist(newPlaylistName.trim(), undefined, newPlaylistEmoji);
    setNewPlaylistName('');
    setNewPlaylistEmoji('🎵');
    setShowCreateModal(false);
  };

  const deletePlaylist = (playlistId: string) => {
    storyShuffleEngine.deletePlaylist(playlistId);
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    storyShuffleEngine.removeFromPlaylist(playlistId, trackId);
  };

  const playPlaylist = async (playlist: Playlist) => {
    if (playlist.trackIds.length > 0) {
      const firstTrack = tracks.find(t => t.id === playlist.trackIds[0]);
      if (firstTrack) {
        await musicLibrary.playTrack(firstTrack.id, firstTrack.categoryId);
      }
    }
  };

  const userPlaylists = playlists.filter(p => !p.isSystem);
  const systemPlaylists = playlists.filter(p => p.isSystem);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-light flex items-center gap-3">
        <Music className="w-7 h-7 text-purple-400" />
        Music Library
      </h2>

      {/* Playlist Manager Section */}
      <div className="bg-gray-950/60 backdrop-blur border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-cyan-400" />
            Your Playlists
          </h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Playlist
          </button>
        </div>

        {/* User Playlists */}
        {userPlaylists.length > 0 ? (
          <div className="space-y-3 mb-6">
            {userPlaylists.map(playlist => (
              <div
                key={playlist.id}
                className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  <span className="text-3xl">{playlist.coverEmoji}</span>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{playlist.name}</h4>
                    <p className="text-sm text-gray-400">{playlist.trackIds.length} tracks</p>
                  </div>
                  <button
                    onClick={() => playPlaylist(playlist)}
                    className="p-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors"
                    disabled={playlist.trackIds.length === 0}
                  >
                    <Play className="w-5 h-5 text-purple-300" />
                  </button>
                  <button
                    onClick={() => setExpandedPlaylist(expandedPlaylist === playlist.id ? null : playlist.id)}
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedPlaylist === playlist.id ? 'rotate-180' : ''
                    }`} />
                  </button>
                  <button
                    onClick={() => deletePlaylist(playlist.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>

                {expandedPlaylist === playlist.id && (
                  <div className="px-4 pb-4 border-t border-gray-800">
                    {playlist.trackIds.length > 0 ? (
                      <div className="space-y-2 mt-3">
                        {playlist.trackIds.map((trackId, idx) => {
                          const track = tracks.find(t => t.id === trackId);
                          if (!track) return null;
                          return (
                            <div
                              key={trackId}
                              className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg"
                            >
                              <span className="text-sm text-gray-500 w-6">{idx + 1}</span>
                              <span className="text-lg">{EMOTIONAL_CATEGORIES[track.categoryId as EmotionalCategoryId]?.icon}</span>
                              <div className="flex-1">
                                <div className="text-sm text-white">{track.name}</div>
                                <div className="text-xs text-gray-500">
                                  {EMOTIONAL_CATEGORIES[track.categoryId as EmotionalCategoryId]?.name}
                                </div>
                              </div>
                              <button
                                onClick={() => removeTrackFromPlaylist(playlist.id, trackId)}
                                className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                              >
                                <X className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No tracks yet. Add songs from the DJ tab.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-6 bg-gray-900/30 rounded-xl border border-gray-800">
            <ListMusic className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No custom playlists yet</p>
            <p className="text-sm text-gray-500 mt-1">Create your first playlist to organize your music</p>
          </div>
        )}

        {/* System Playlists */}
        <div className="pt-4 border-t border-gray-800">
          <h4 className="text-sm text-gray-400 uppercase tracking-wider mb-3">AI-Generated Playlists</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {systemPlaylists.map(playlist => (
              <button
                key={playlist.id}
                onClick={() => playPlaylist(playlist)}
                className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-gray-700 transition-all text-left"
                disabled={playlist.trackIds.length === 0}
              >
                <span className="text-2xl block mb-2">{playlist.coverEmoji}</span>
                <h5 className="text-sm text-white font-medium truncate">{playlist.name}</h5>
                <p className="text-xs text-gray-500">{playlist.trackIds.length} tracks</p>
                {playlist.basedOnMetric && (
                  <span className={`mt-2 inline-block px-2 py-0.5 rounded text-xs ${
                    playlist.basedOnMetric === 'symbolic' ? 'bg-purple-500/20 text-purple-300' :
                    playlist.basedOnMetric === 'resonance' ? 'bg-cyan-500/20 text-cyan-300' :
                    playlist.basedOnMetric === 'friction' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {playlist.basedOnMetric}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Music Library */}
      <div className="rounded-xl bg-gray-900/50 border border-gray-800 overflow-hidden">
        <MusicLibrary compact />
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-white mb-4">Create New Playlist</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Playlist Name</label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="My awesome playlist..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Choose an Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {['🎵', '🎶', '🎸', '🎹', '🎤', '🎧', '💜', '🌙', '☀️', '⚡', '🔥', '🌊', '🌈', '✨', '💫', '🎯'].map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => setNewPlaylistEmoji(emoji)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        newPlaylistEmoji === emoji
                          ? 'bg-purple-600/30 border-2 border-purple-400'
                          : 'bg-gray-800 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName('');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createPlaylist}
                disabled={!newPlaylistName.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Analytics Page Component
 */
export function AnalyticsPage({ checkIns, waves, onBack }: AnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'rhythm' | 'music' | 'coherence' | 'neural' | 'library'>('overview');
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [musicSessions, setMusicSessions] = useState<MusicSession[]>([]);
  const [coherenceStats, setCoherenceStats] = useState<any>(null);
  const [listeningTime, setListeningTime] = useState<Record<EmotionalCategoryId, number> | null>(null);

  // Real-time metrics from metricsHub
  const [metricsState, setMetricsState] = useState<EnhancedDeltaHVState | null>(null);
  const [profileHistory, setProfileHistory] = useState<ProfileMetricsSnapshot[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<HubMetricsSnapshot[]>([]);

  // Load music data and subscribe to changes
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

    // Subscribe to music library changes for real-time updates
    const unsubscribe = musicLibrary.subscribe(() => {
      loadMusicData();
    });

    return () => unsubscribe();
  }, [timeRange]);

  // Subscribe to real-time metrics from metricsHub
  useEffect(() => {
    const unsubscribe = metricsHub.subscribe((state) => {
      setMetricsState(state);
    });

    // Get initial state
    const initial = metricsHub.getState();
    if (initial) setMetricsState(initial);

    // Get history
    setMetricsHistory(metricsHub.getHistory());

    return unsubscribe;
  }, []);

  // Load profile history for cross-referencing
  useEffect(() => {
    const loadProfileData = async () => {
      await userProfileService.initialize();
      const history = userProfileService.getMetricsHistory(timeRange);
      setProfileHistory(history);
    };

    loadProfileData();
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

  // Music session analytics - now also includes listening time breakdown for donut chart
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

    // Calculate category usage by sessions AND listening time for better accuracy
    const categoryUsage = Object.entries(EMOTIONAL_CATEGORIES).map(([key, cat]) => {
      const catSessions = filteredSessions.filter(s => s.categoryId === key);
      const totalListeningTime = catSessions.reduce((sum, s) => sum + s.duration, 0);
      return {
        label: cat.name,
        value: catSessions.length,
        listeningTime: totalListeningTime,
        color: cat.color,
        icon: cat.icon
      };
    }).filter(c => c.value > 0);

    // Sessions with post-session data for mood tracking
    const sessionsWithMoodData = filteredSessions.filter(
      s => s.postSession?.moodBefore !== undefined && s.postSession?.moodAfter !== undefined
    );

    // Calculate mood improvement stats
    const moodChanges = sessionsWithMoodData.map(s =>
      (s.postSession?.moodAfter || 0) - (s.postSession?.moodBefore || 0)
    );
    const avgMoodChange = moodChanges.length > 0
      ? moodChanges.reduce((a, b) => a + b, 0) / moodChanges.length
      : 0;

    return {
      dailyListening,
      categoryUsage,
      totalSessions: filteredSessions.length,
      sessionsWithData: sessionsWithMoodData.length,
      avgMoodChange
    };
  }, [musicSessions, timeRange]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'rhythm', label: 'Rhythm', icon: Activity },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'coherence', label: 'Coherence', icon: Heart },
    { id: 'neural', label: 'Neural', icon: Brain },
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

            {/* DeltaHV Metrics Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                DeltaHV Metrics (Real-Time)
                {metricsState?.isLive && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">LIVE</span>
                )}
              </h3>

              {metricsState ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DeltaHVCard
                    metric="symbolic"
                    value={metricsState.symbolicDensity}
                    regions={metricsHub.getMetricDisplay('symbolic').regions}
                    color="purple"
                  />
                  <DeltaHVCard
                    metric="resonance"
                    value={metricsState.resonanceCoupling}
                    regions={metricsHub.getMetricDisplay('resonance').regions}
                    color="cyan"
                  />
                  <DeltaHVCard
                    metric="friction"
                    value={metricsState.frictionCoefficient}
                    regions={metricsHub.getMetricDisplay('friction').regions}
                    color="amber"
                  />
                  <DeltaHVCard
                    metric="stability"
                    value={metricsState.harmonicStability}
                    regions={metricsHub.getMetricDisplay('stability').regions}
                    color="green"
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No real-time metrics available yet</p>
                  <p className="text-xs mt-1">Complete tasks and activities to see your DeltaHV state</p>
                </div>
              )}
            </div>

            {/* Health Insights */}
            <HealthInsights metricsState={metricsState} profileHistory={profileHistory} />

            {/* Profile History Trend */}
            {profileHistory.length > 0 && (
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  DeltaHV History ({timeRange} days)
                </h3>
                <LineChart
                  data={profileHistory.map(p => ({ label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: p.deltaHV }))}
                  width={700}
                  height={180}
                  color={COLORS.purple}
                  showArea
                />
              </div>
            )}
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
                {musicAnalytics.categoryUsage.length > 0 ? (
                  <div className="flex items-center justify-center gap-6">
                    <DonutChart data={musicAnalytics.categoryUsage} size={140} thickness={25} />
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {musicAnalytics.categoryUsage.map(cat => (
                        <div key={cat.label} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-gray-400">{cat.icon} {cat.label}</span>
                          <span className="text-gray-500">({cat.value} • {formatDuration(cat.listeningTime)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No music sessions yet</p>
                    <p className="text-xs mt-1">Play some music to see category breakdown</p>
                  </div>
                )}
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                value={musicAnalytics.sessionsWithData}
                subValue={`of ${musicAnalytics.totalSessions} total`}
                icon={Brain}
                color="purple"
              />
              <StatCard
                label="Mood Improvement"
                value={musicAnalytics.avgMoodChange > 0 ? `+${musicAnalytics.avgMoodChange.toFixed(1)}` : musicAnalytics.avgMoodChange.toFixed(1)}
                subValue="From music sessions"
                icon={Heart}
                color={musicAnalytics.avgMoodChange > 0 ? 'green' : 'amber'}
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

        {/* Neural Tab */}
        {activeTab === 'neural' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-light flex items-center gap-3">
              <Brain className="w-7 h-7 text-purple-400" />
              Neural Map
              {metricsState?.isLive && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">LIVE</span>
              )}
            </h2>

            <NeuralMapViz metricsState={metricsState} />

            {/* Real-time Metrics History Chart */}
            {metricsHistory.length > 0 && (
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">Real-Time Metric Updates</h3>
                <div className="text-xs text-gray-500 mb-2">
                  Last {Math.min(metricsHistory.length, 50)} updates
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-1" style={{ width: `${Math.min(metricsHistory.length, 50) * 10}px` }}>
                    {metricsHistory.slice(-50).map((snapshot, i) => (
                      <div
                        key={i}
                        className="flex-shrink-0 w-2 rounded-full bg-purple-500"
                        style={{
                          height: `${snapshot.deltaHV}px`,
                          opacity: (i + 1) / 50
                        }}
                        title={`ΔHV: ${snapshot.deltaHV} - ${snapshot.trigger}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cross-Reference with Profile */}
            {profileHistory.length > 0 && (
              <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Profile Metrics Over Time
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Symbolic & Resonance</p>
                    <LineChart
                      data={profileHistory.map(p => ({
                        label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        value: Math.round((p.symbolicDensity + p.resonanceCoupling) / 2)
                      }))}
                      width={300}
                      height={120}
                      color={COLORS.purple}
                      showArea
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Friction & Stability</p>
                    <LineChart
                      data={profileHistory.map(p => ({
                        label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        value: Math.round((100 - p.frictionCoefficient + p.harmonicStability) / 2)
                      }))}
                      width={300}
                      height={120}
                      color={COLORS.cyan}
                      showArea
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <LibraryWithPlaylists />
        )}
      </div>
    </div>
  );
}

export default AnalyticsPage;
