/**
 * Focus & Wellness Tools Component
 *
 * An integrated tabbed section that combines:
 * - Frequency/DJ Mode: Music mixing and playlist management
 * - Glyph/Challenges: Brain region challenge system
 * - Metrics Overview: Real-time DeltaHV metrics display
 *
 * This component replaces the standalone modals and provides
 * an inline experience within the dashboard.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Disc3,
  Brain,
  Activity,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  Sparkles,
  TrendingUp,
  Heart,
  Zap,
  Sun,
  Moon,
  Target,
  Trophy,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { DeltaHVState } from '../lib/deltaHVEngine';
import type { MusicTrack, EmotionalCategoryId } from '../lib/musicLibrary';
import { musicLibrary, EMOTIONAL_CATEGORIES } from '../lib/musicLibrary';
import { storyShuffleEngine } from '../lib/storyShuffleEngine';
import { BRAIN_REGIONS, type BrainRegion, type BrainRegionCategory } from '../lib/glyphSystem';
import { metricsHub, type EnhancedDeltaHVState } from '../lib/metricsHub';

interface FocusWellnessToolsProps {
  deltaHV: DeltaHVState | null;
  enhancedMetrics: EnhancedDeltaHVState | null;
  onOpenFullDJ?: () => void;
  onOpenFullChallenges?: () => void;
  onCompleteChallenge?: (regionId: string, xp: number) => void;
}

type ActiveTab = 'metrics' | 'frequency' | 'glyph';

// Mood presets for DJ
interface MoodPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  categories: EmotionalCategoryId[];
  description: string;
}

const MOOD_PRESETS: MoodPreset[] = [
  { id: 'energize', name: 'Energize', icon: <Zap className="w-4 h-4" />, categories: ['ENERGY', 'JOY', 'COURAGE'], description: 'High energy' },
  { id: 'focus', name: 'Focus', icon: <Target className="w-4 h-4" />, categories: ['FOCUS', 'CALM'], description: 'Concentration' },
  { id: 'chill', name: 'Chill', icon: <Moon className="w-4 h-4" />, categories: ['CALM', 'RELEASE', 'GRATITUDE'], description: 'Relaxation' },
  { id: 'uplift', name: 'Uplift', icon: <Sun className="w-4 h-4" />, categories: ['JOY', 'LOVE', 'GRATITUDE', 'WONDER'], description: 'Positive' },
  { id: 'process', name: 'Process', icon: <Heart className="w-4 h-4" />, categories: ['MELANCHOLY', 'RELEASE'], description: 'Healing' },
];

// Challenge interface
interface Challenge {
  id: string;
  regionId: string;
  title: string;
  description: string;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
  category: 'quick' | 'focus' | 'creative' | 'physical' | 'social' | 'reflective';
}

interface CompletedChallenge {
  challengeId: string;
  regionId: string;
  completedAt: string;
  xpEarned: number;
}

const CHALLENGE_STORAGE_KEY = 'brain-region-challenges-completed';
const XP_STORAGE_KEY = 'brain-region-xp';

// Generate challenges
function generateChallenges(regions: BrainRegion[]): Challenge[] {
  const challenges: Challenge[] = [];
  const templates: Record<BrainRegionCategory, { title: string; description: string; category: Challenge['category'] }[]> = {
    cortical: [
      { title: 'Deep Focus Session', description: 'Complete 25 minutes of uninterrupted focus work', category: 'focus' },
      { title: 'Creative Expression', description: 'Write, draw, or create something meaningful', category: 'creative' },
    ],
    limbic: [
      { title: 'Gratitude Practice', description: 'Write down 3 things you\'re grateful for today', category: 'reflective' },
      { title: 'Emotional Check-In', description: 'Sit quietly and identify your current emotions', category: 'reflective' },
    ],
    subcortical: [
      { title: 'Movement Break', description: 'Do 10 minutes of physical activity', category: 'physical' },
      { title: 'Reward Reflection', description: 'Celebrate a recent accomplishment', category: 'quick' },
    ],
    brainstem: [
      { title: 'Breathing Exercise', description: 'Complete 4-7-8 breathing for 5 minutes', category: 'quick' },
      { title: 'Body Scan', description: 'Do a full body relaxation scan', category: 'physical' },
    ],
    cerebellar: [
      { title: 'Balance Practice', description: 'Stand on one foot for 1 minute each side', category: 'physical' },
      { title: 'Coordination Drill', description: 'Practice a skill requiring coordination', category: 'physical' },
    ],
    sensory: [
      { title: 'Mindful Listening', description: 'Close your eyes and focus on sounds', category: 'reflective' },
      { title: 'Texture Exploration', description: 'Touch 5 different textures mindfully', category: 'quick' },
    ],
    motor: [
      { title: 'Stretching Routine', description: 'Complete a 10-minute stretch sequence', category: 'physical' },
      { title: 'Walking Meditation', description: 'Take a mindful walk, noticing each step', category: 'physical' },
    ],
    integration: [
      { title: 'Mind-Body Sync', description: 'Do yoga or tai chi for 15 minutes', category: 'physical' },
      { title: 'Cross-Brain Exercise', description: 'Do an activity that uses both hands', category: 'physical' },
    ],
  };

  regions.slice(0, 16).forEach((region, idx) => {
    const categoryTemplates = templates[region.category] || templates.cortical;
    const template = categoryTemplates[idx % categoryTemplates.length];
    challenges.push({
      id: `challenge-${region.id}`,
      regionId: region.id,
      title: template.title,
      description: template.description,
      xpReward: region.category === 'cortical' ? 30 : region.category === 'limbic' ? 25 : 20,
      difficulty: region.category === 'cortical' ? 'hard' : region.category === 'limbic' ? 'medium' : 'easy',
      timeEstimate: template.category === 'quick' ? '5 min' : template.category === 'focus' ? '25 min' : '10 min',
      category: template.category,
    });
  });

  return challenges;
}

export const FocusWellnessTools: React.FC<FocusWellnessToolsProps> = ({
  deltaHV,
  enhancedMetrics,
  onOpenFullDJ,
  onOpenFullChallenges,
  onCompleteChallenge,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('metrics');
  const [isExpanded, setIsExpanded] = useState(true);

  // DJ State
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Challenge State
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [selectedChallengeCategory, setSelectedChallengeCategory] = useState<BrainRegionCategory | 'all'>('all');

  // Load DJ data
  useEffect(() => {
    const loadData = async () => {
      await musicLibrary.initialize();
      const allTracks = await musicLibrary.getAllTracks();
      setTracks(allTracks);
    };
    loadData();

    const unsub = musicLibrary.subscribe(async () => {
      const allTracks = await musicLibrary.getAllTracks();
      setTracks(allTracks);
    });

    const unsubPlayback = musicLibrary.subscribeToPlayback((state) => {
      setIsPlaying(state.isPlaying);
      if (state.trackId) {
        musicLibrary.getTrack(state.trackId).then(track => {
          if (track) setCurrentTrack(track);
        });
      }
    });

    return () => {
      unsub();
      unsubPlayback();
    };
  }, []);

  // Load challenge data
  useEffect(() => {
    try {
      const savedCompleted = localStorage.getItem(CHALLENGE_STORAGE_KEY);
      if (savedCompleted) setCompletedChallenges(JSON.parse(savedCompleted));
      const savedXP = localStorage.getItem(XP_STORAGE_KEY);
      if (savedXP) setTotalXP(parseInt(savedXP));
    } catch (e) {
      console.error('Failed to load challenge data:', e);
    }
  }, []);

  // Generate challenges
  const challenges = useMemo(() => generateChallenges(BRAIN_REGIONS), []);

  // Filter challenges by category
  const filteredChallenges = useMemo(() => {
    if (selectedChallengeCategory === 'all') return challenges;
    return challenges.filter(c => {
      const region = BRAIN_REGIONS.find(r => r.id === c.regionId);
      return region?.category === selectedChallengeCategory;
    });
  }, [challenges, selectedChallengeCategory]);

  // Filter tracks by mood
  const moodTracks = useMemo(() => {
    if (!selectedMood) return tracks;
    const preset = MOOD_PRESETS.find(p => p.id === selectedMood);
    if (!preset) return tracks;
    return tracks.filter(t => preset.categories.includes(t.categoryId));
  }, [tracks, selectedMood]);

  // Play track
  const playTrack = useCallback(async (track: MusicTrack) => {
    await musicLibrary.playTrack(track.id, track.categoryId);
    setCurrentTrack(track);
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    if (musicLibrary.isCurrentlyPlaying()) {
      musicLibrary.pausePlayback();
    } else {
      await musicLibrary.resumePlayback();
    }
  }, []);

  // Complete challenge
  const handleCompleteChallenge = useCallback((challenge: Challenge) => {
    const completed: CompletedChallenge = {
      challengeId: challenge.id,
      regionId: challenge.regionId,
      completedAt: new Date().toISOString(),
      xpEarned: challenge.xpReward,
    };

    setCompletedChallenges(prev => {
      const updated = [...prev, completed];
      localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    setTotalXP(prev => {
      const updated = prev + challenge.xpReward;
      localStorage.setItem(XP_STORAGE_KEY, updated.toString());
      return updated;
    });

    onCompleteChallenge?.(challenge.regionId, challenge.xpReward);
    metricsHub.recordAction(`challenge_complete_${challenge.regionId}`);
  }, [onCompleteChallenge]);

  // Check if challenge is completed today
  const isChallengeCompletedToday = useCallback((challengeId: string) => {
    const today = new Date().toDateString();
    return completedChallenges.some(
      c => c.challengeId === challengeId && new Date(c.completedAt).toDateString() === today
    );
  }, [completedChallenges]);

  // Get music metric influence
  const metricInfluence = useMemo(() => storyShuffleEngine.getMetricInfluenceFromMusic(), []);

  // Recommended mood based on DeltaHV
  const recommendedMood = useMemo(() => {
    if (!deltaHV) return 'focus';
    if (deltaHV.frictionCoefficient > 60) return 'chill';
    if (deltaHV.harmonicStability < 40) return 'focus';
    if (deltaHV.resonanceCoupling < 40) return 'uplift';
    if (deltaHV.fieldState === 'coherent') return 'energize';
    return 'focus';
  }, [deltaHV]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-950/60 backdrop-blur border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header with Tabs */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Focus & Wellness Tools
          </h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'metrics'
                ? 'bg-gradient-to-r from-cyan-600/30 to-purple-600/30 border border-cyan-500/30 text-white'
                : 'bg-gray-900/50 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab('frequency')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'frequency'
                ? 'bg-gradient-to-r from-violet-600/30 to-pink-600/30 border border-violet-500/30 text-white'
                : 'bg-gray-900/50 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <Disc3 className={`w-4 h-4 ${isPlaying && activeTab === 'frequency' ? 'animate-spin' : ''}`} />
            <span>DJ Mode</span>
          </button>
          <button
            onClick={() => setActiveTab('glyph')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'glyph'
                ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-500/30 text-white'
                : 'bg-gray-900/50 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Challenges</span>
            {totalXP > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300">
                {totalXP}XP
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="space-y-4">
              {/* DeltaHV Score */}
              {deltaHV && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      deltaHV.fieldState === 'coherent' ? 'bg-emerald-900/60 text-emerald-400' :
                      deltaHV.fieldState === 'transitioning' ? 'bg-amber-900/60 text-amber-400' :
                      deltaHV.fieldState === 'fragmented' ? 'bg-orange-900/60 text-orange-400' :
                      'bg-gray-800/60 text-gray-400'
                    }`}>
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white">ΔHV Field State</p>
                      <p className="text-sm text-gray-400 capitalize">{deltaHV.fieldState}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${
                      deltaHV.deltaHV >= 75 ? 'text-emerald-400' :
                      deltaHV.deltaHV >= 50 ? 'text-amber-400' :
                      deltaHV.deltaHV >= 25 ? 'text-orange-400' :
                      'text-gray-400'
                    }`}>{deltaHV.deltaHV}</p>
                    <p className="text-xs text-gray-500">ΔHV Score</p>
                  </div>
                </div>
              )}

              {/* Four Core Metrics */}
              {deltaHV && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 rounded-xl p-3 border border-violet-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">✨</span>
                      <span className="text-xl font-bold text-violet-400">{deltaHV.symbolicDensity}%</span>
                    </div>
                    <p className="text-xs text-violet-300">Symbolic (S)</p>
                    <div className="h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${deltaHV.symbolicDensity}%` }} />
                    </div>
                  </div>

                  <div className="bg-gray-900/60 rounded-xl p-3 border border-cyan-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">🎯</span>
                      <span className="text-xl font-bold text-cyan-400">{deltaHV.resonanceCoupling}%</span>
                    </div>
                    <p className="text-xs text-cyan-300">Resonance (R)</p>
                    <div className="h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${deltaHV.resonanceCoupling}%` }} />
                    </div>
                  </div>

                  <div className="bg-gray-900/60 rounded-xl p-3 border border-orange-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">🌧️</span>
                      <span className="text-xl font-bold text-orange-400">{deltaHV.frictionCoefficient}%</span>
                    </div>
                    <p className="text-xs text-orange-300">Friction (δφ)</p>
                    <div className="h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${deltaHV.frictionCoefficient}%` }} />
                    </div>
                  </div>

                  <div className="bg-gray-900/60 rounded-xl p-3 border border-emerald-800/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">⚖️</span>
                      <span className="text-xl font-bold text-emerald-400">{deltaHV.harmonicStability}%</span>
                    </div>
                    <p className="text-xs text-emerald-300">Stability (H)</p>
                    <div className="h-1.5 bg-gray-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${deltaHV.harmonicStability}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Music Influence */}
              {enhancedMetrics?.musicInfluence && enhancedMetrics.musicInfluence.authorshipScore > 0 && (
                <div className="p-3 bg-gray-900/40 rounded-xl border border-purple-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-purple-300">Music Influence</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-400">
                        Authorship: <span className="text-purple-400">{enhancedMetrics.musicInfluence.authorshipScore}%</span>
                      </span>
                      <span className={`capitalize ${
                        enhancedMetrics.musicInfluence.emotionalTrajectory === 'rising' ? 'text-green-400' :
                        enhancedMetrics.musicInfluence.emotionalTrajectory === 'processing' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {enhancedMetrics.musicInfluence.emotionalTrajectory}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Field State Interpretation */}
              {deltaHV && (
                <div className={`rounded-xl p-3 border ${
                  deltaHV.fieldState === 'coherent' ? 'bg-emerald-950/30 border-emerald-800/30' :
                  deltaHV.fieldState === 'transitioning' ? 'bg-amber-950/30 border-amber-800/30' :
                  deltaHV.fieldState === 'fragmented' ? 'bg-orange-950/30 border-orange-800/30' :
                  'bg-gray-900/40 border-gray-800'
                }`}>
                  <p className="text-sm">
                    {deltaHV.fieldState === 'coherent' && (
                      <span className="text-emerald-300">🌟 Your field is highly coherent. Maintain momentum.</span>
                    )}
                    {deltaHV.fieldState === 'transitioning' && (
                      <span className="text-amber-300">🔄 Transitioning between states. Stay consistent.</span>
                    )}
                    {deltaHV.fieldState === 'fragmented' && (
                      <span className="text-orange-300">⚡ Some fragmentation detected. Focus on grounding.</span>
                    )}
                    {deltaHV.fieldState === 'dormant' && (
                      <span className="text-gray-300">💤 Field is dormant. Start with small symbolic actions.</span>
                    )}
                  </p>
                </div>
              )}

              {!deltaHV && (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Complete your rhythm setup to see metrics</p>
                </div>
              )}
            </div>
          )}

          {/* Frequency/DJ Tab */}
          {activeTab === 'frequency' && (
            <div className="space-y-4">
              {/* Current Track */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/20">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-cyan-600 rounded-xl flex items-center justify-center">
                  {currentTrack ? (
                    <span className="text-3xl">{EMOTIONAL_CATEGORIES[currentTrack.categoryId]?.icon}</span>
                  ) : (
                    <Music className="w-8 h-8 text-white/50" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-white">
                    {currentTrack?.name || 'No track playing'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {currentTrack ? EMOTIONAL_CATEGORIES[currentTrack.categoryId]?.name : 'Select a mood'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  <button className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mood Presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-400">Mood Selector</p>
                  {deltaHV && (
                    <span className="text-xs text-cyan-400">
                      Recommended: {MOOD_PRESETS.find(p => p.id === recommendedMood)?.name}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {MOOD_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedMood(selectedMood === preset.id ? null : preset.id)}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                        selectedMood === preset.id
                          ? 'bg-purple-600/30 border-2 border-purple-400'
                          : preset.id === recommendedMood
                          ? 'bg-cyan-900/30 border border-cyan-500/30 hover:border-cyan-400/50'
                          : 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <span className={selectedMood === preset.id ? 'text-purple-300' : 'text-gray-400'}>
                        {preset.icon}
                      </span>
                      <span className={`text-xs ${selectedMood === preset.id ? 'text-purple-300' : 'text-gray-400'}`}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mood Tracks */}
              {selectedMood && moodTracks.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    {MOOD_PRESETS.find(p => p.id === selectedMood)?.name} Tracks ({moodTracks.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {moodTracks.slice(0, 8).map(track => (
                      <button
                        key={track.id}
                        onClick={() => playTrack(track)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                          currentTrack?.id === track.id
                            ? 'bg-purple-900/30 border border-purple-500/30'
                            : 'hover:bg-gray-800/50'
                        }`}
                      >
                        <span className="text-lg">{EMOTIONAL_CATEGORIES[track.categoryId]?.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white truncate">{track.name}</div>
                          <div className="text-xs text-gray-500">{formatDuration(track.duration)}</div>
                        </div>
                        {currentTrack?.id === track.id && isPlaying && (
                          <div className="flex gap-0.5">
                            <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" />
                            <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse delay-75" />
                            <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse delay-150" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Metric Influence */}
              <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <TrendingUp className="w-3 h-3" />
                  Music Influence on Metrics
                </p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <span className="text-purple-400">{metricInfluence.symbolic.value}%</span>
                    <p className="text-gray-500">S</p>
                  </div>
                  <div className="text-center">
                    <span className="text-cyan-400">{metricInfluence.resonance.value}%</span>
                    <p className="text-gray-500">R</p>
                  </div>
                  <div className="text-center">
                    <span className="text-amber-400">{metricInfluence.friction.value}%</span>
                    <p className="text-gray-500">δφ</p>
                  </div>
                  <div className="text-center">
                    <span className="text-pink-400">{metricInfluence.stability.value}%</span>
                    <p className="text-gray-500">H</p>
                  </div>
                </div>
              </div>

              {/* Open Full DJ Button */}
              {onOpenFullDJ && (
                <button
                  onClick={onOpenFullDJ}
                  className="w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-sm font-medium transition-colors"
                >
                  Open Full DJ Mode
                </button>
              )}

              {tracks.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tracks in your library</p>
                </div>
              )}
            </div>
          )}

          {/* Glyph/Challenges Tab */}
          {activeTab === 'glyph' && (
            <div className="space-y-4">
              {/* XP Display */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-600/30 flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">Brain Training</p>
                    <p className="text-sm text-gray-400">Complete challenges to boost metrics</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-400">{totalXP} XP</p>
                  <p className="text-xs text-gray-500">Total Earned</p>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedChallengeCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedChallengeCategory === 'all'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                      : 'bg-gray-900/50 text-gray-400 border border-gray-800 hover:border-gray-700'
                  }`}
                >
                  All
                </button>
                {(['cortical', 'limbic', 'subcortical', 'brainstem'] as BrainRegionCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedChallengeCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-all ${
                      selectedChallengeCategory === cat
                        ? 'bg-amber-600/30 text-amber-300 border border-amber-500/30'
                        : 'bg-gray-900/50 text-gray-400 border border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Challenges List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredChallenges.slice(0, 6).map(challenge => {
                  const isCompleted = isChallengeCompletedToday(challenge.id);
                  const region = BRAIN_REGIONS.find(r => r.id === challenge.regionId);

                  return (
                    <div
                      key={challenge.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCompleted
                          ? 'bg-emerald-950/30 border-emerald-700/30'
                          : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          isCompleted ? 'bg-emerald-600/30' : 'bg-gray-800'
                        }`}>
                          {region?.glyph || '🧠'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-300' : 'text-white'}`}>
                              {challenge.title}
                            </p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              challenge.difficulty === 'hard' ? 'bg-rose-500/20 text-rose-300' :
                              challenge.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {challenge.xpReward}XP
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{challenge.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {challenge.timeEstimate}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">{region?.category}</span>
                          </div>
                        </div>
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <button
                            onClick={() => handleCompleteChallenge(challenge)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black text-xs font-medium transition-colors flex-shrink-0"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Open Full Challenges Button */}
              {onOpenFullChallenges && (
                <button
                  onClick={onOpenFullChallenges}
                  className="w-full py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-sm font-medium transition-colors"
                >
                  View All Challenges
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FocusWellnessTools;
