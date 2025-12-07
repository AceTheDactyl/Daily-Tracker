/**
 * Brain Region Challenge Component
 *
 * A gamified brain-region task completion system that replaces the drawing canvas.
 * Users complete challenges associated with specific brain regions to improve their
 * DeltaHV metrics and unlock achievements.
 *
 * Features:
 * - 100 brain regions mapped to challenges
 * - Gamified task completion with XP and streaks
 * - Integration with DeltaHV metrics
 * - Visual progress tracking
 * - Achievement system
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Trophy,
  Zap,
  Target,
  Brain,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Flame,
  Star,
  Crown,
  Eye,
  Activity,
  Layers,
} from 'lucide-react';
import type { DeltaHVState } from '../lib/deltaHVEngine';
import { BRAIN_REGIONS, type BrainRegion, type BrainRegionCategory } from '../lib/glyphSystem';

interface BrainRegionChallengeProps {
  deltaHV: DeltaHVState | null;
  onClose: () => void;
  onCompleteChallenge?: (regionId: string, xp: number) => void;
}

interface Challenge {
  id: string;
  regionId: string;
  title: string;
  description: string;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
  category: 'quick' | 'focus' | 'creative' | 'physical' | 'social' | 'reflective';
  beatSuggestion?: string;
}

interface CompletedChallenge {
  challengeId: string;
  regionId: string;
  completedAt: string;
  xpEarned: number;
}

// Generate challenges for each brain region
function generateChallenges(regions: BrainRegion[]): Challenge[] {
  const challenges: Challenge[] = [];

  const challengeTemplates: Record<BrainRegionCategory, { title: string; description: string; category: Challenge['category'] }[]> = {
    cortical: [
      { title: 'Deep Focus Session', description: 'Complete 25 minutes of uninterrupted focus work', category: 'focus' },
      { title: 'Creative Expression', description: 'Write, draw, or create something meaningful', category: 'creative' },
      { title: 'Problem Solving', description: 'Work through a challenging problem step by step', category: 'focus' },
      { title: 'Learning Sprint', description: 'Learn something new for 15 minutes', category: 'focus' },
    ],
    limbic: [
      { title: 'Gratitude Practice', description: 'Write down 3 things you\'re grateful for today', category: 'reflective' },
      { title: 'Emotional Check-In', description: 'Sit quietly and identify your current emotions', category: 'reflective' },
      { title: 'Connect with Someone', description: 'Have a meaningful conversation with a friend or family member', category: 'social' },
      { title: 'Self-Compassion Break', description: 'Speak kindly to yourself for 5 minutes', category: 'reflective' },
    ],
    subcortical: [
      { title: 'Movement Break', description: 'Do 10 minutes of physical activity', category: 'physical' },
      { title: 'Reward Reflection', description: 'Celebrate a recent accomplishment, no matter how small', category: 'quick' },
      { title: 'Habit Stack', description: 'Complete a small habit immediately after an existing one', category: 'quick' },
      { title: 'Dopamine Detox Hour', description: 'Avoid screens and instant gratification for 1 hour', category: 'focus' },
    ],
    brainstem: [
      { title: 'Breathing Exercise', description: 'Complete 4-7-8 breathing pattern for 5 minutes', category: 'quick' },
      { title: 'Body Scan', description: 'Do a full body relaxation scan from head to toe', category: 'physical' },
      { title: 'Grounding Exercise', description: '5-4-3-2-1 sensory grounding technique', category: 'quick' },
      { title: 'Cold Exposure', description: 'Take a cold shower or splash cold water on face', category: 'physical' },
    ],
    cerebellar: [
      { title: 'Balance Practice', description: 'Stand on one foot for 1 minute each side', category: 'physical' },
      { title: 'Coordination Drill', description: 'Practice a skill that requires coordination', category: 'physical' },
      { title: 'Rhythm Exercise', description: 'Tap out a rhythm pattern or dance to music', category: 'physical' },
      { title: 'Fine Motor Task', description: 'Complete a detailed task requiring precision', category: 'focus' },
    ],
    sensory: [
      { title: 'Mindful Listening', description: 'Close your eyes and focus on sounds for 5 minutes', category: 'reflective' },
      { title: 'Texture Exploration', description: 'Touch 5 different textures and notice sensations', category: 'quick' },
      { title: 'Visual Focus', description: 'Practice focused gazing on a single point for 2 minutes', category: 'quick' },
      { title: 'Taste Mindfully', description: 'Eat something slowly, noticing every flavor', category: 'reflective' },
    ],
    motor: [
      { title: 'Stretching Routine', description: 'Complete a 10-minute stretch sequence', category: 'physical' },
      { title: 'Walking Meditation', description: 'Take a mindful walk, noticing each step', category: 'physical' },
      { title: 'Hand-Eye Challenge', description: 'Practice catching or juggling for 5 minutes', category: 'physical' },
      { title: 'Dance Break', description: 'Put on music and move freely for one song', category: 'physical' },
    ],
    integration: [
      { title: 'Mind-Body Sync', description: 'Do yoga or tai chi for 15 minutes', category: 'physical' },
      { title: 'Multi-Task Challenge', description: 'Safely combine two simple activities mindfully', category: 'focus' },
      { title: 'Cross-Brain Exercise', description: 'Do an activity that uses both hands equally', category: 'physical' },
      { title: 'Integration Meditation', description: 'Visualize energy flowing through your entire body', category: 'reflective' },
    ],
  };

  // Map categories to beat suggestions
  const categoryBeats: Record<BrainRegionCategory, string> = {
    cortical: 'Focus',
    limbic: 'Emotion',
    subcortical: 'Workout',
    brainstem: 'Meditation',
    cerebellar: 'Workout',
    sensory: 'Meditation',
    motor: 'Workout',
    integration: 'Meditation',
  };

  regions.forEach((region, idx) => {
    const templates = challengeTemplates[region.category] || challengeTemplates.cortical;
    const template = templates[idx % templates.length];

    challenges.push({
      id: `challenge-${region.id}`,
      regionId: region.id,
      title: template.title,
      description: template.description,
      xpReward: region.category === 'cortical' ? 30 :
                region.category === 'limbic' ? 25 :
                region.category === 'subcortical' ? 20 :
                region.category === 'brainstem' ? 15 : 20,
      difficulty: region.category === 'cortical' ? 'hard' :
                  region.category === 'limbic' ? 'medium' : 'easy',
      timeEstimate: template.category === 'quick' ? '5 min' :
                    template.category === 'focus' ? '25 min' :
                    template.category === 'physical' ? '10 min' : '15 min',
      category: template.category,
      beatSuggestion: categoryBeats[region.category],
    });
  });

  return challenges;
}

const CHALLENGE_STORAGE_KEY = 'brain-region-challenges-completed';
const XP_STORAGE_KEY = 'brain-region-xp';
const STREAK_STORAGE_KEY = 'brain-region-streak';

export const BrainRegionChallenge: React.FC<BrainRegionChallengeProps> = ({
  deltaHV,
  onClose,
  onCompleteChallenge,
}) => {
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<BrainRegionCategory | 'all'>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const savedCompleted = localStorage.getItem(CHALLENGE_STORAGE_KEY);
      if (savedCompleted) setCompletedChallenges(JSON.parse(savedCompleted));

      const savedXP = localStorage.getItem(XP_STORAGE_KEY);
      if (savedXP) setTotalXP(parseInt(savedXP));

      const savedStreak = localStorage.getItem(STREAK_STORAGE_KEY);
      if (savedStreak) setStreak(parseInt(savedStreak));
    } catch (e) {
      console.error('Failed to load challenge data:', e);
    }
  }, []);

  // Save to localStorage
  const saveData = useCallback(() => {
    localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(completedChallenges));
    localStorage.setItem(XP_STORAGE_KEY, totalXP.toString());
    localStorage.setItem(STREAK_STORAGE_KEY, streak.toString());
  }, [completedChallenges, totalXP, streak]);

  useEffect(() => {
    saveData();
  }, [saveData]);

  // Generate challenges from brain regions
  const challenges = useMemo(() => {
    return generateChallenges(BRAIN_REGIONS);
  }, []);

  // Filter challenges
  const filteredChallenges = useMemo(() => {
    let result = challenges;

    if (selectedCategory !== 'all') {
      const regionIds = BRAIN_REGIONS
        .filter(r => r.category === selectedCategory)
        .map(r => r.id);
      result = result.filter(c => regionIds.includes(c.regionId));
    }

    if (!showCompleted) {
      const completedIds = completedChallenges.map(c => c.challengeId);
      result = result.filter(c => !completedIds.includes(c.id));
    }

    return result;
  }, [challenges, selectedCategory, showCompleted, completedChallenges]);

  // Complete a challenge
  const handleCompleteChallenge = useCallback((challenge: Challenge) => {
    const completed: CompletedChallenge = {
      challengeId: challenge.id,
      regionId: challenge.regionId,
      completedAt: new Date().toISOString(),
      xpEarned: challenge.xpReward,
    };

    setCompletedChallenges(prev => [...prev, completed]);
    setTotalXP(prev => prev + challenge.xpReward);

    // Update streak if completing on a new day
    const today = new Date().toDateString();
    const lastCompleted = completedChallenges[completedChallenges.length - 1];
    if (!lastCompleted || new Date(lastCompleted.completedAt).toDateString() !== today) {
      setStreak(prev => prev + 1);
    }

    setSelectedChallenge(null);
    onCompleteChallenge?.(challenge.regionId, challenge.xpReward);
  }, [completedChallenges, onCompleteChallenge]);

  // Get recommended challenges based on DeltaHV
  const recommendedChallenges = useMemo(() => {
    if (!deltaHV) return filteredChallenges.slice(0, 3);

    const { symbolicDensity, resonanceCoupling, frictionCoefficient, harmonicStability } = deltaHV;

    // Prioritize based on what metrics need improvement
    let priorityCategories: BrainRegionCategory[] = [];

    if (symbolicDensity < 50) priorityCategories.push('cortical');
    if (resonanceCoupling < 50) priorityCategories.push('limbic');
    if (frictionCoefficient > 50) priorityCategories.push('brainstem');
    if (harmonicStability < 50) priorityCategories.push('cerebellar');

    if (priorityCategories.length === 0) priorityCategories = ['cortical', 'limbic'];

    const priorityRegionIds = BRAIN_REGIONS
      .filter(r => priorityCategories.includes(r.category))
      .map(r => r.id);

    const completedIds = completedChallenges.map(c => c.challengeId);
    const recommended = challenges
      .filter(c => priorityRegionIds.includes(c.regionId) && !completedIds.includes(c.id))
      .slice(0, 3);

    return recommended.length > 0 ? recommended : filteredChallenges.slice(0, 3);
  }, [deltaHV, challenges, filteredChallenges, completedChallenges]);

  // Calculate level from XP
  const level = Math.floor(totalXP / 100) + 1;
  const xpToNextLevel = 100 - (totalXP % 100);
  const levelProgress = (totalXP % 100) / 100 * 100;

  // Get region info for a challenge
  const getRegion = (regionId: string) => BRAIN_REGIONS.find(r => r.id === regionId);

  const categories: { id: BrainRegionCategory | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'all', label: 'All', icon: <Brain className="w-4 h-4" />, color: 'gray' },
    { id: 'cortical', label: 'Mind', icon: <Sparkles className="w-4 h-4" />, color: 'purple' },
    { id: 'limbic', label: 'Emotion', icon: <Heart className="w-4 h-4" />, color: 'pink' },
    { id: 'subcortical', label: 'Reward', icon: <Star className="w-4 h-4" />, color: 'amber' },
    { id: 'brainstem', label: 'Body', icon: <Zap className="w-4 h-4" />, color: 'cyan' },
    { id: 'cerebellar', label: 'Balance', icon: <Target className="w-4 h-4" />, color: 'green' },
    { id: 'sensory', label: 'Senses', icon: <Eye className="w-4 h-4" />, color: 'blue' },
    { id: 'motor', label: 'Movement', icon: <Activity className="w-4 h-4" />, color: 'orange' },
    { id: 'integration', label: 'Integrate', icon: <Layers className="w-4 h-4" />, color: 'indigo' },
  ];

  const difficultyColors = {
    easy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    hard: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button onClick={onClose} className="p-2 rounded-lg bg-gray-900/70 border border-gray-800 hover:bg-gray-800">
          <X className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-lg font-medium text-white">Level {level}</span>
            </div>
            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                style={{ width: `${levelProgress}%` }} />
            </div>
            <span className="text-xs text-gray-500">{xpToNextLevel} XP to next</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-lg border border-orange-500/30">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">{streak} day streak</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">{totalXP} XP</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-light text-white flex items-center justify-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            Brain Region Challenges
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            Complete challenges to activate brain regions and improve your metrics
          </p>
        </div>

        {/* Recommended Challenges */}
        {recommendedChallenges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              Recommended for You
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {recommendedChallenges.map(challenge => {
                const region = getRegion(challenge.regionId);
                return (
                  <button
                    key={challenge.id}
                    onClick={() => setSelectedChallenge(challenge)}
                    className="p-4 bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-xl border border-cyan-500/30 text-left hover:border-cyan-400/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{region?.glyph}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{challenge.title}</div>
                        <div className="text-xs text-gray-400 truncate">{region?.name}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${difficultyColors[challenge.difficulty]}`}>
                            {challenge.difficulty}
                          </span>
                          <span className="text-xs text-purple-300">+{challenge.xpReward} XP</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? `bg-${cat.color}-500/30 text-${cat.color}-300 border border-${cat.color}-500/50`
                  : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ml-auto ${
              showCompleted
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </button>
        </div>

        {/* Challenge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredChallenges.map(challenge => {
            const region = getRegion(challenge.regionId);
            const isCompleted = completedChallenges.some(c => c.challengeId === challenge.id);

            return (
              <button
                key={challenge.id}
                onClick={() => !isCompleted && setSelectedChallenge(challenge)}
                disabled={isCompleted}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isCompleted
                    ? 'bg-emerald-900/20 border-emerald-500/30 opacity-60'
                    : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900/70'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{region?.glyph}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate flex items-center gap-2">
                      {challenge.title}
                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{region?.name}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{challenge.timeEstimate}</span>
                  </div>
                  <span className="text-xs text-purple-300">+{challenge.xpReward} XP</span>
                </div>
              </button>
            );
          })}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white">All Challenges Completed!</h3>
            <p className="text-sm text-gray-400 mt-2">
              Amazing work! You've completed all challenges in this category.
            </p>
          </div>
        )}
      </div>

      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-60 p-4">
          <div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getRegion(selectedChallenge.regionId)?.glyph}</span>
                <div>
                  <h3 className="text-lg font-medium text-white">{selectedChallenge.title}</h3>
                  <p className="text-sm text-gray-400">{getRegion(selectedChallenge.regionId)?.name}</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-gray-300">{selectedChallenge.description}</p>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-gray-900/50 rounded-lg">
                  <span className={`text-xs px-2 py-0.5 rounded border ${difficultyColors[selectedChallenge.difficulty]}`}>
                    {selectedChallenge.difficulty}
                  </span>
                </div>
                <div className="p-2 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-300">{selectedChallenge.timeEstimate}</span>
                  </div>
                </div>
                <div className="p-2 bg-gray-900/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span className="text-sm text-purple-300">+{selectedChallenge.xpReward} XP</span>
                  </div>
                </div>
              </div>

              {selectedChallenge.beatSuggestion && (
                <div className="p-3 bg-cyan-900/20 rounded-lg border border-cyan-500/20">
                  <div className="text-xs text-cyan-400 uppercase tracking-wider mb-1">Suggested Beat</div>
                  <div className="text-sm text-gray-300">{selectedChallenge.beatSuggestion}</div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedChallenge(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCompleteChallenge(selectedChallenge)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-sm font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Challenge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Heart icon not in lucide-react import, use inline
function Heart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export default BrainRegionChallenge;
