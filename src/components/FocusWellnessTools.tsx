/**
 * Focus & Wellness Tools Component
 *
 * An integrated tabbed section that combines:
 * - Frequency: 3-tier frequency modulator for binaural/meditation tones
 * - Glyph/Challenges: Brain region challenges with drawing canvas
 * - Metrics Overview: Real-time DeltaHV metrics display
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Disc3,
  Brain,
  Activity,
  Volume2,
  Music,
  Sparkles,
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
  Download,
  Trash2,
  Pencil,
} from 'lucide-react';
import type { DeltaHVState } from '../lib/deltaHVEngine';
import type { EnhancedDeltaHVState } from '../lib/metricsHub';
import { metricsHub } from '../lib/metricsHub';
import { BRAIN_REGIONS, type BrainRegion, type BrainRegionCategory } from '../lib/glyphSystem';

interface FocusWellnessToolsProps {
  deltaHV: DeltaHVState | null;
  enhancedMetrics: EnhancedDeltaHVState | null;
  onOpenFullDJ?: () => void;
  onOpenFullChallenges?: () => void;
  onCompleteChallenge?: (regionId: string, xp: number) => void;
}

type ActiveTab = 'metrics' | 'frequency' | 'glyph';

// Frequency presets
interface FrequencyPreset {
  id: string;
  name: string;
  icon: React.ReactNode;
  freqs: [number, number, number];
  description: string;
}

const FREQUENCY_PRESETS: FrequencyPreset[] = [
  { id: 'focus', name: 'Focus', icon: <Target className="w-4 h-4" />, freqs: [40, 14, 0], description: 'Gamma + Beta for concentration' },
  { id: 'calm', name: 'Calm', icon: <Moon className="w-4 h-4" />, freqs: [432, 528, 0], description: 'Solfeggio healing frequencies' },
  { id: 'energy', name: 'Energy', icon: <Zap className="w-4 h-4" />, freqs: [285, 396, 417], description: 'Activation and transformation' },
  { id: 'love', name: 'Love', icon: <Heart className="w-4 h-4" />, freqs: [528, 639, 741], description: 'Heart-centered frequencies' },
  { id: 'sleep', name: 'Sleep', icon: <Sun className="w-4 h-4" />, freqs: [174, 285, 0], description: 'Deep relaxation tones' },
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
  requiresDrawing?: boolean;
}

interface CompletedChallenge {
  challengeId: string;
  regionId: string;
  completedAt: string;
  xpEarned: number;
  glyphData?: string;
}

const CHALLENGE_STORAGE_KEY = 'brain-region-challenges-completed';
const XP_STORAGE_KEY = 'brain-region-xp';
const GLYPH_STORAGE_KEY = 'saved-glyphs';

// Generate challenges with some requiring drawing
function generateChallenges(regions: BrainRegion[]): Challenge[] {
  const challenges: Challenge[] = [];
  const templates: Record<BrainRegionCategory, { title: string; description: string; category: Challenge['category']; requiresDrawing?: boolean }[]> = {
    cortical: [
      { title: 'Deep Focus Session', description: 'Complete 25 minutes of uninterrupted focus work', category: 'focus' },
      { title: 'Draw Your Intention', description: 'Draw a glyph representing your current goal', category: 'creative', requiresDrawing: true },
    ],
    limbic: [
      { title: 'Gratitude Glyph', description: 'Draw a symbol of something you\'re grateful for', category: 'creative', requiresDrawing: true },
      { title: 'Emotional Check-In', description: 'Sit quietly and identify your current emotions', category: 'reflective' },
    ],
    subcortical: [
      { title: 'Movement Break', description: 'Do 10 minutes of physical activity', category: 'physical' },
      { title: 'Reward Symbol', description: 'Draw a glyph celebrating a recent win', category: 'creative', requiresDrawing: true },
    ],
    brainstem: [
      { title: 'Breathing Exercise', description: 'Complete 4-7-8 breathing for 5 minutes', category: 'quick' },
      { title: 'Body Scan', description: 'Do a full body relaxation scan', category: 'physical' },
    ],
    cerebellar: [
      { title: 'Balance Practice', description: 'Stand on one foot for 1 minute each side', category: 'physical' },
      { title: 'Flow State Glyph', description: 'Draw while in a flow state', category: 'creative', requiresDrawing: true },
    ],
    sensory: [
      { title: 'Mindful Listening', description: 'Close your eyes and focus on sounds', category: 'reflective' },
      { title: 'Sensory Symbol', description: 'Draw what you feel right now', category: 'creative', requiresDrawing: true },
    ],
    motor: [
      { title: 'Stretching Routine', description: 'Complete a 10-minute stretch sequence', category: 'physical' },
      { title: 'Movement Glyph', description: 'Draw a symbol representing energy flow', category: 'creative', requiresDrawing: true },
    ],
    integration: [
      { title: 'Mind-Body Sync', description: 'Do yoga or tai chi for 15 minutes', category: 'physical' },
      { title: 'Integration Symbol', description: 'Draw a glyph connecting mind and body', category: 'creative', requiresDrawing: true },
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
      xpReward: template.requiresDrawing ? 35 : (region.category === 'cortical' ? 30 : region.category === 'limbic' ? 25 : 20),
      difficulty: template.requiresDrawing ? 'medium' : (region.category === 'cortical' ? 'hard' : region.category === 'limbic' ? 'medium' : 'easy'),
      timeEstimate: template.category === 'quick' ? '5 min' : template.category === 'focus' ? '25 min' : '10 min',
      category: template.category,
      requiresDrawing: template.requiresDrawing,
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

  // Frequency State
  const [mixFreqs, setMixFreqs] = useState<[number, number, number]>([432, 0, 0]);
  const [mixPlaying, setMixPlaying] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const mixCtx = useRef<AudioContext | null>(null);
  const mixOsc = useRef<(OscillatorNode | null)[]>([null, null, null]);
  const mixGain = useRef<(GainNode | null)[]>([null, null, null]);

  // Challenge State
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [selectedChallengeCategory, setSelectedChallengeCategory] = useState<BrainRegionCategory | 'all'>('all');
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  // Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [savedGlyphs, setSavedGlyphs] = useState<string[]>([]);

  // Load challenge data
  useEffect(() => {
    try {
      const savedCompleted = localStorage.getItem(CHALLENGE_STORAGE_KEY);
      if (savedCompleted) setCompletedChallenges(JSON.parse(savedCompleted));
      const savedXP = localStorage.getItem(XP_STORAGE_KEY);
      if (savedXP) setTotalXP(parseInt(savedXP));
      const glyphs = localStorage.getItem(GLYPH_STORAGE_KEY);
      if (glyphs) setSavedGlyphs(JSON.parse(glyphs));
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (showCanvas && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [showCanvas]);

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

  // Frequency controls
  const handleFreqChange = useCallback((index: number, value: number) => {
    setMixFreqs(prev => {
      const next = [...prev] as [number, number, number];
      next[index] = value;
      return next;
    });
    if (mixPlaying && mixOsc.current[index] && mixCtx.current) {
      mixOsc.current[index]!.frequency.setValueAtTime(value, mixCtx.current.currentTime);
    }
  }, [mixPlaying]);

  const applyPreset = useCallback((preset: FrequencyPreset) => {
    setSelectedPreset(preset.id);
    setMixFreqs(preset.freqs);
    if (mixPlaying) {
      preset.freqs.forEach((freq, i) => {
        if (mixOsc.current[i] && mixCtx.current) {
          mixOsc.current[i]!.frequency.setValueAtTime(freq, mixCtx.current.currentTime);
        }
      });
    }
  }, [mixPlaying]);

  const toggleFrequency = useCallback(() => {
    if (!mixPlaying) {
      if (!mixCtx.current) {
        mixCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      for (let i = 0; i < 3; i++) {
        if (mixFreqs[i] && mixFreqs[i] > 0) {
          const osc = mixCtx.current.createOscillator();
          const g = mixCtx.current.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(mixFreqs[i], mixCtx.current.currentTime);
          g.gain.setValueAtTime(0.0, mixCtx.current.currentTime);
          g.gain.linearRampToValueAtTime(0.12, mixCtx.current.currentTime + 0.4);
          osc.connect(g);
          g.connect(mixCtx.current.destination);
          osc.start();
          mixOsc.current[i] = osc;
          mixGain.current[i] = g;
        }
      }
      setMixPlaying(true);
    } else {
      for (let i = 0; i < 3; i++) {
        try {
          mixOsc.current[i]?.stop();
        } catch {}
        mixOsc.current[i] = null;
        mixGain.current[i] = null;
      }
      setMixPlaying(false);
    }
  }, [mixPlaying, mixFreqs]);

  // Drawing functions
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const saveGlyph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const dataUrl = canvas.toDataURL('image/png');
    setSavedGlyphs(prev => {
      const updated = [...prev, dataUrl];
      localStorage.setItem(GLYPH_STORAGE_KEY, JSON.stringify(updated.slice(-10))); // Keep last 10
      return updated.slice(-10);
    });
    return dataUrl;
  }, []);

  const downloadGlyph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `glyph_${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Complete challenge (with optional glyph)
  const handleCompleteChallenge = useCallback((challenge: Challenge, glyphData?: string) => {
    const completed: CompletedChallenge = {
      challengeId: challenge.id,
      regionId: challenge.regionId,
      completedAt: new Date().toISOString(),
      xpEarned: challenge.xpReward,
      glyphData,
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
    setActiveChallenge(null);
    setShowCanvas(false);
    clearCanvas();
  }, [onCompleteChallenge, clearCanvas]);

  // Check if challenge is completed today
  const isChallengeCompletedToday = useCallback((challengeId: string) => {
    const today = new Date().toDateString();
    return completedChallenges.some(
      c => c.challengeId === challengeId && new Date(c.completedAt).toDateString() === today
    );
  }, [completedChallenges]);

  // Start a drawing challenge
  const startDrawingChallenge = useCallback((challenge: Challenge) => {
    setActiveChallenge(challenge);
    setShowCanvas(true);
  }, []);

  // Submit drawing for challenge
  const submitDrawingChallenge = useCallback(() => {
    if (!activeChallenge) return;
    const glyphData = saveGlyph();
    handleCompleteChallenge(activeChallenge, glyphData || undefined);
  }, [activeChallenge, saveGlyph, handleCompleteChallenge]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (let i = 0; i < 3; i++) {
        try {
          mixOsc.current[i]?.stop();
        } catch {}
      }
    };
  }, []);

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
            <Volume2 className={`w-4 h-4 ${mixPlaying ? 'text-violet-400' : ''}`} />
            <span>Frequency</span>
            {mixPlaying && <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />}
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
            <span>Glyph</span>
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
              {deltaHV && (
                <>
                  {/* DeltaHV Score */}
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

                  {/* Four Core Metrics */}
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
                  <div className={`rounded-xl p-3 border ${
                    deltaHV.fieldState === 'coherent' ? 'bg-emerald-950/30 border-emerald-800/30' :
                    deltaHV.fieldState === 'transitioning' ? 'bg-amber-950/30 border-amber-800/30' :
                    deltaHV.fieldState === 'fragmented' ? 'bg-orange-950/30 border-orange-800/30' :
                    'bg-gray-900/40 border-gray-800'
                  }`}>
                    <p className="text-sm">
                      {deltaHV.fieldState === 'coherent' && <span className="text-emerald-300">🌟 Your field is highly coherent. Maintain momentum.</span>}
                      {deltaHV.fieldState === 'transitioning' && <span className="text-amber-300">🔄 Transitioning between states. Stay consistent.</span>}
                      {deltaHV.fieldState === 'fragmented' && <span className="text-orange-300">⚡ Some fragmentation detected. Focus on grounding.</span>}
                      {deltaHV.fieldState === 'dormant' && <span className="text-gray-300">💤 Field is dormant. Start with small symbolic actions.</span>}
                    </p>
                  </div>
                </>
              )}

              {!deltaHV && (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p>Complete your rhythm setup to see metrics</p>
                </div>
              )}
            </div>
          )}

          {/* Frequency Tab */}
          {activeTab === 'frequency' && (
            <div className="space-y-4">
              {/* Presets */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Quick Presets</p>
                <div className="grid grid-cols-5 gap-2">
                  {FREQUENCY_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                        selectedPreset === preset.id
                          ? 'bg-violet-600/30 border-2 border-violet-400'
                          : 'bg-gray-900/50 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <span className={selectedPreset === preset.id ? 'text-violet-300' : 'text-gray-400'}>
                        {preset.icon}
                      </span>
                      <span className={`text-xs ${selectedPreset === preset.id ? 'text-violet-300' : 'text-gray-400'}`}>
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedPreset && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {FREQUENCY_PRESETS.find(p => p.id === selectedPreset)?.description}
                  </p>
                )}
              </div>

              {/* 3-Tier Frequency Sliders */}
              <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800 space-y-4">
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-violet-400" />
                  3-Tier Frequency Modulator
                </p>
                {[0, 1, 2].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Layer {i + 1}</span>
                      <span className={mixFreqs[i] > 0 ? 'text-violet-300' : 'text-gray-600'}>
                        {mixFreqs[i] > 0 ? `${mixFreqs[i]} Hz` : 'off'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1000}
                      step={1}
                      value={mixFreqs[i]}
                      onChange={(e) => handleFreqChange(i, parseInt(e.target.value || '0'))}
                      className="w-full accent-violet-500"
                    />
                  </div>
                ))}
              </div>

              {/* Play/Stop Button */}
              <button
                onClick={toggleFrequency}
                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                  mixPlaying
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {mixPlaying ? (
                  <>
                    <span className="w-3 h-3 bg-white rounded-sm" />
                    Stop Frequencies
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    Play Frequencies
                  </>
                )}
              </button>

              {/* Open Full DJ Button */}
              {onOpenFullDJ && (
                <button
                  onClick={onOpenFullDJ}
                  className="w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Disc3 className="w-4 h-4" />
                  Open Full DJ Mode
                </button>
              )}
            </div>
          )}

          {/* Glyph/Challenges Tab */}
          {activeTab === 'glyph' && (
            <div className="space-y-4">
              {/* Drawing Canvas (when active challenge requires it) */}
              {showCanvas && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-amber-300 flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      {activeChallenge?.title || 'Draw Your Glyph'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={clearCanvas}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        title="Clear"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={downloadGlyph}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-48 bg-gray-900 rounded-xl border border-amber-500/30 touch-none cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {activeChallenge && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowCanvas(false); setActiveChallenge(null); clearCanvas(); }}
                        className="flex-1 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitDrawingChallenge}
                        className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-sm font-medium transition-colors"
                      >
                        Complete Challenge (+{activeChallenge.xpReward}XP)
                      </button>
                    </div>
                  )}
                  {!activeChallenge && (
                    <button
                      onClick={() => { saveGlyph(); clearCanvas(); }}
                      className="w-full py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
                    >
                      Save Glyph
                    </button>
                  )}
                </div>
              )}

              {/* XP Display */}
              {!showCanvas && (
                <>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-600/30 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-white">Brain Training</p>
                        <p className="text-sm text-gray-400">Draw glyphs & complete challenges</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-amber-400">{totalXP} XP</p>
                      <p className="text-xs text-gray-500">Total Earned</p>
                    </div>
                  </div>

                  {/* Quick Draw Button */}
                  <button
                    onClick={() => setShowCanvas(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600/30 to-amber-600/30 border border-violet-500/30 hover:border-violet-400/50 text-white font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <Pencil className="w-5 h-5 text-violet-400" />
                    Open Drawing Canvas
                  </button>

                  {/* Saved Glyphs Gallery */}
                  {savedGlyphs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Recent Glyphs</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {savedGlyphs.slice(0, 5).map((glyph, idx) => (
                          <img
                            key={idx}
                            src={glyph}
                            alt={`Glyph ${idx + 1}`}
                            className="w-16 h-16 rounded-lg border border-gray-700 bg-gray-900 object-cover flex-shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  )}

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
                              {challenge.requiresDrawing ? '🌀' : (region?.glyph || '🧠')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-300' : 'text-white'}`}>
                                  {challenge.title}
                                </p>
                                {challenge.requiresDrawing && (
                                  <Pencil className="w-3 h-3 text-violet-400" />
                                )}
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
                            ) : challenge.requiresDrawing ? (
                              <button
                                onClick={() => startDrawingChallenge(challenge)}
                                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors flex-shrink-0"
                              >
                                Draw
                              </button>
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
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FocusWellnessTools;
