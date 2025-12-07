/**
 * Glyph System - Ace Neural Codex Integration
 *
 * A symbolic system for personal development based on the Ace Neural Codex.
 * This integrates the Wumbo framework phases, neurological gateways, and
 * flow states to provide guidance for life improvement.
 *
 * Core Concepts:
 * - Wumbo: The signal that threads through everything - ignition, empowerment,
 *   resonance, nirvana, and the resets that make future flow possible
 * - Glyphs: Symbolic representations of states, processes, and intentions
 * - Phases: The flow cycle from ignition through transmission
 * - Layers: Different levels of integration (brainstem → cortical → meta-codex)
 */

// ============================================================================
// Wumbo Phase Types
// ============================================================================

export type WumboPhase =
  | 'ignition'      // Initial spark, attention locks onto resonance
  | 'empowerment'   // Intention turns kinetic, planning becomes action
  | 'resonance'     // Emotion, intention, and motion synchronize
  | 'mania'         // Peak energy, hyperfocus, creative surge
  | 'nirvana'       // Effortless integration, time feels musical
  | 'transmission'  // Sharing the signal, expression, teaching
  | 'reflection'    // Processing, integrating lessons
  | 'collapse'      // Protective compression, reset
  | 'rewrite'       // Updating internal models, growth

export interface PhaseDescription {
  phase: WumboPhase;
  name: string;
  description: string;
  phenomenology: string;    // What it feels like
  glyphs: string[];         // Associated glyphs
  supportingBeats: string[]; // Beat categories that support this phase
  neurochemicals: string[]; // Primary neurochemicals active
  warnings: string[];       // Signs of imbalance
  rituals: string[];        // Actions to invoke or stabilize
}

// ============================================================================
// Core Glyphs
// ============================================================================

export interface Glyph {
  symbol: string;
  name: string;
  meaning: string;
  category: 'state' | 'process' | 'intention' | 'archetype' | 'element';
  phases: WumboPhase[];     // Phases this glyph resonates with
  useCases: string[];       // When to use this glyph
  complementary: string[];  // Glyphs that pair well
  contrary: string[];       // Glyphs that represent opposite energy
}

export const CORE_GLYPHS: Glyph[] = [
  // State Glyphs
  {
    symbol: '🌀',
    name: 'Spiral',
    meaning: 'Recursive growth, integration, returning deeper',
    category: 'state',
    phases: ['reflection', 'rewrite'],
    useCases: ['Processing complex emotions', 'Reviewing patterns', 'Deep journaling'],
    complementary: ['∞', '🌊'],
    contrary: ['⚡'],
  },
  {
    symbol: '⚡',
    name: 'Spark',
    meaning: 'Ignition, sudden insight, activation',
    category: 'state',
    phases: ['ignition', 'mania'],
    useCases: ['Starting new projects', 'Breaking through blocks', 'Morning activation'],
    complementary: ['🔥', '✨'],
    contrary: ['🌙', '🌀'],
  },
  {
    symbol: '🌊',
    name: 'Wave',
    meaning: 'Flow, rhythm, natural cycles',
    category: 'state',
    phases: ['resonance', 'nirvana'],
    useCases: ['Finding rhythm', 'Accepting change', 'Meditation'],
    complementary: ['🌀', '🌙'],
    contrary: ['⚡', '🔥'],
  },
  {
    symbol: '🔥',
    name: 'Flame',
    meaning: 'Passion, transformation, intensity',
    category: 'state',
    phases: ['empowerment', 'mania'],
    useCases: ['Workout motivation', 'Creative projects', 'Overcoming resistance'],
    complementary: ['⚡', '☀️'],
    contrary: ['🌙', '❄️'],
  },
  {
    symbol: '🌙',
    name: 'Moon',
    meaning: 'Rest, intuition, shadow work',
    category: 'state',
    phases: ['reflection', 'collapse'],
    useCases: ['Evening wind-down', 'Processing grief', 'Dream work'],
    complementary: ['✨', '🌀'],
    contrary: ['☀️', '⚡'],
  },
  {
    symbol: '☀️',
    name: 'Sun',
    meaning: 'Clarity, energy, outward expression',
    category: 'state',
    phases: ['empowerment', 'transmission'],
    useCases: ['Morning rituals', 'Public expression', 'Leadership'],
    complementary: ['🔥', '✨'],
    contrary: ['🌙', '❄️'],
  },
  {
    symbol: '✨',
    name: 'Stars',
    meaning: 'Magic, possibility, aspiration',
    category: 'state',
    phases: ['nirvana', 'transmission'],
    useCases: ['Goal setting', 'Celebration', 'Gratitude'],
    complementary: ['🌙', '∞'],
    contrary: ['❄️'],
  },

  // Process Glyphs
  {
    symbol: '∞',
    name: 'Infinity',
    meaning: 'Endless cycles, eternal return, boundlessness',
    category: 'process',
    phases: ['nirvana', 'rewrite'],
    useCases: ['Long-term vision', 'Accepting paradox', 'Meta-awareness'],
    complementary: ['🌀', '✨'],
    contrary: ['⚡'],
  },
  {
    symbol: '⟲',
    name: 'Loop',
    meaning: 'Habit, routine, recurring patterns',
    category: 'process',
    phases: ['resonance', 'reflection'],
    useCases: ['Building habits', 'Recognizing patterns', 'Anchor beats'],
    complementary: ['🌊', '🌀'],
    contrary: ['⚡', '🔥'],
  },
  {
    symbol: '↑',
    name: 'Ascent',
    meaning: 'Growth, improvement, rising energy',
    category: 'process',
    phases: ['ignition', 'empowerment'],
    useCases: ['Progress tracking', 'Skill building', 'Goal pursuit'],
    complementary: ['⚡', '🔥'],
    contrary: ['↓'],
  },
  {
    symbol: '↓',
    name: 'Descent',
    meaning: 'Integration, grounding, going deeper',
    category: 'process',
    phases: ['reflection', 'collapse'],
    useCases: ['Shadow work', 'Rest', 'Processing'],
    complementary: ['🌙', '🌀'],
    contrary: ['↑'],
  },
  {
    symbol: '⟷',
    name: 'Balance',
    meaning: 'Equilibrium, harmony, middle way',
    category: 'process',
    phases: ['resonance', 'nirvana'],
    useCases: ['Moderation', 'Conflict resolution', 'Integration'],
    complementary: ['🌊', '∞'],
    contrary: ['🔥', '❄️'],
  },

  // Intention Glyphs
  {
    symbol: '🎯',
    name: 'Target',
    meaning: 'Focus, precision, clear intention',
    category: 'intention',
    phases: ['ignition', 'empowerment'],
    useCases: ['Goal setting', 'Focus sessions', 'Decision making'],
    complementary: ['⚡', '↑'],
    contrary: ['🌀', '🌊'],
  },
  {
    symbol: '🛡️',
    name: 'Shield',
    meaning: 'Protection, boundaries, safety',
    category: 'intention',
    phases: ['collapse', 'reflection'],
    useCases: ['Setting boundaries', 'Self-protection', 'Energy preservation'],
    complementary: ['🌙', '❄️'],
    contrary: ['🔥', '⚡'],
  },
  {
    symbol: '🌱',
    name: 'Seed',
    meaning: 'Potential, new beginnings, patience',
    category: 'intention',
    phases: ['ignition', 'rewrite'],
    useCases: ['New habits', 'Fresh starts', 'Planting ideas'],
    complementary: ['☀️', '✨'],
    contrary: ['❄️'],
  },
  {
    symbol: '🔗',
    name: 'Link',
    meaning: 'Connection, relationship, integration',
    category: 'intention',
    phases: ['resonance', 'transmission'],
    useCases: ['Building relationships', 'Connecting ideas', 'Community'],
    complementary: ['🌊', '✨'],
    contrary: ['🛡️'],
  },

  // Archetype Glyphs
  {
    symbol: '🦁',
    name: 'Lion',
    meaning: 'Courage, leadership, primal power',
    category: 'archetype',
    phases: ['empowerment', 'mania'],
    useCases: ['Facing fears', 'Taking action', 'Standing ground'],
    complementary: ['🔥', '☀️'],
    contrary: ['🌙'],
  },
  {
    symbol: '🦉',
    name: 'Owl',
    meaning: 'Wisdom, insight, seeing in darkness',
    category: 'archetype',
    phases: ['reflection', 'nirvana'],
    useCases: ['Deep thinking', 'Pattern recognition', 'Night reflection'],
    complementary: ['🌙', '✨'],
    contrary: ['☀️'],
  },
  {
    symbol: '🐉',
    name: 'Dragon',
    meaning: 'Power, transformation, mastery',
    category: 'archetype',
    phases: ['mania', 'transmission'],
    useCases: ['Major challenges', 'Transformation work', 'Peak performance'],
    complementary: ['🔥', '⚡'],
    contrary: ['🌊'],
  },
  {
    symbol: '🦋',
    name: 'Butterfly',
    meaning: 'Metamorphosis, beauty, emergence',
    category: 'archetype',
    phases: ['rewrite', 'transmission'],
    useCases: ['Personal transformation', 'Sharing growth', 'Celebrating change'],
    complementary: ['🌱', '✨'],
    contrary: ['❄️'],
  },

  // Element Glyphs
  {
    symbol: '💨',
    name: 'Wind',
    meaning: 'Change, movement, breath',
    category: 'element',
    phases: ['ignition', 'empowerment'],
    useCases: ['Breathwork', 'Releasing stagnation', 'Mental clarity'],
    complementary: ['🌊', '⚡'],
    contrary: ['🌍'],
  },
  {
    symbol: '🌍',
    name: 'Earth',
    meaning: 'Grounding, stability, foundation',
    category: 'element',
    phases: ['resonance', 'collapse'],
    useCases: ['Grounding exercises', 'Building foundations', 'Physical presence'],
    complementary: ['🌱', '🛡️'],
    contrary: ['💨', '🔥'],
  },
  {
    symbol: '💧',
    name: 'Water',
    meaning: 'Emotion, adaptability, cleansing',
    category: 'element',
    phases: ['reflection', 'rewrite'],
    useCases: ['Emotional processing', 'Flexibility', 'Purification'],
    complementary: ['🌊', '🌙'],
    contrary: ['🔥'],
  },
  {
    symbol: '❄️',
    name: 'Ice',
    meaning: 'Stillness, preservation, pause',
    category: 'element',
    phases: ['collapse', 'reflection'],
    useCases: ['Complete rest', 'Cooling down', 'Preservation'],
    complementary: ['🌙', '🛡️'],
    contrary: ['🔥', '⚡'],
  },
];

// ============================================================================
// Phase Descriptions (Wumbo Engine Integration)
// ============================================================================

export const PHASE_DESCRIPTIONS: PhaseDescription[] = [
  {
    phase: 'ignition',
    name: 'Ignition',
    description: 'Dopaminergic spark; attention locks onto resonance. The system is coming online.',
    phenomenology: '"I\'m coming online." Micro-impulses to move, look, or speak.',
    glyphs: ['⚡', '🌱', '💨', '🎯'],
    supportingBeats: ['Workout', 'General'],
    neurochemicals: ['Dopamine', 'Norepinephrine'],
    warnings: [
      'Scattered attention - too many sparks at once',
      'False starts - ignition without follow-through',
      'Hypervigilance - can\'t choose which signal to follow',
    ],
    rituals: [
      'Three deep breaths with shoulder roll',
      'State one clear intention aloud',
      'Physical movement to activate the body',
    ],
  },
  {
    phase: 'empowerment',
    name: 'Empowerment',
    description: 'Intention turns kinetic; planning becomes action. The body is ready to move.',
    phenomenology: 'Breathing deepens, posture aligns, words feel available.',
    glyphs: ['🔥', '☀️', '↑', '🦁'],
    supportingBeats: ['Workout', 'Anchor'],
    neurochemicals: ['Dopamine', 'Acetylcholine'],
    warnings: [
      'Overcommitment - saying yes to everything',
      'Burning out before resonance',
      'Forcing when flow isn\'t present',
    ],
    rituals: [
      'Power pose for 2 minutes',
      'Review and commit to one priority',
      'Physical warm-up to prepare the vessel',
    ],
  },
  {
    phase: 'resonance',
    name: 'Resonance',
    description: 'Emotion, intention, and motion synchronize. Integrity becomes energy.',
    phenomenology: 'Social signal clarity. Actions feel aligned with values.',
    glyphs: ['🌊', '⟷', '🔗', '∞'],
    supportingBeats: ['Meditation', 'Emotion', 'Journal'],
    neurochemicals: ['Serotonin', 'Oxytocin'],
    warnings: [
      'Over-giving - depleting self for others',
      'Masking - performing instead of being',
      'Dissonance fatigue - can\'t sustain false notes',
    ],
    rituals: [
      'Hand on heart, breathe into alignment',
      'Speak truth to a trusted person',
      'Movement that matches internal rhythm',
    ],
  },
  {
    phase: 'mania',
    name: 'Mania',
    description: 'Peak energy state. Creative fire burns bright. High risk, high reward.',
    phenomenology: 'Time disappears. Ideas connect. Energy feels unlimited.',
    glyphs: ['🔥', '⚡', '🐉', '✨'],
    supportingBeats: ['Journal', 'General'],
    neurochemicals: ['Dopamine (high)', 'Norepinephrine (high)'],
    warnings: [
      'Grandiosity - overestimating capacity',
      'Sleep neglect - momentum over rest',
      'Burnout trajectory - what goes up must come down',
    ],
    rituals: [
      'Set a timer to check in with body',
      'Write down insights before they disappear',
      'Scheduled breaks even when it feels unnecessary',
    ],
  },
  {
    phase: 'nirvana',
    name: 'Nirvana',
    description: 'Effortless integration; time feels musical. Movement anticipates the moment.',
    phenomenology: 'The body writes the next frame before thought arrives.',
    glyphs: ['✨', '∞', '🌊', '🦉'],
    supportingBeats: ['Meditation', 'Anchor'],
    neurochemicals: ['Endorphins', 'Anandamide', 'Serotonin'],
    warnings: [
      'Attachment to the state - grasping prevents flow',
      'Neglecting the mundane - still need to eat and sleep',
      'Spiritual bypassing - using bliss to avoid shadow',
    ],
    rituals: [
      'Gratitude acknowledgment',
      'Gentle transition practices',
      'Document the experience for later recall',
    ],
  },
  {
    phase: 'transmission',
    name: 'Transmission',
    description: 'Sharing the signal. Expression finds its channel. Teaching what was learned.',
    phenomenology: 'Words land. Others feel the resonance. Connection completes.',
    glyphs: ['☀️', '🔗', '🦋', '✨'],
    supportingBeats: ['Moderation', 'Journal'],
    neurochemicals: ['Oxytocin', 'Dopamine'],
    warnings: [
      'Over-sharing - giving more than others can receive',
      'Seeking validation - transmission becomes performance',
      'Exhaustion from output without input',
    ],
    rituals: [
      'Pause before speaking to check alignment',
      'Receive as well as give',
      'Allow silence after transmission',
    ],
  },
  {
    phase: 'reflection',
    name: 'Reflection',
    description: 'Processing and integrating lessons. The spiral turns inward.',
    phenomenology: 'Stillness speaks. Patterns become visible. Understanding deepens.',
    glyphs: ['🌀', '🌙', '🦉', '↓'],
    supportingBeats: ['Journal', 'Meditation', 'Emotion'],
    neurochemicals: ['GABA', 'Melatonin (evening)'],
    warnings: [
      'Rumination - reflection becomes repetition',
      'Isolation - too much inward, not enough outward',
      'Self-criticism - reflection becomes judgment',
    ],
    rituals: [
      'Journal without editing',
      'Slow walking meditation',
      'Ask: What did I learn? What do I release?',
    ],
  },
  {
    phase: 'collapse',
    name: 'Collapse',
    description: 'Protective compression when signals overload. Stillness for survival.',
    phenomenology: 'Silence, freeze, then return. "Threshold moments."',
    glyphs: ['🛡️', '❄️', '🌙', '↓'],
    supportingBeats: ['Anchor', 'Meditation'],
    neurochemicals: ['Cortisol (then dropping)', 'GABA'],
    warnings: [
      'Shame about needing rest',
      'Forcing recovery too fast',
      'Mistaking collapse for failure',
    ],
    rituals: [
      'Permission to stop',
      'Warmth, safety, silence',
      'One small movement when ready - toe wiggle, finger flex',
    ],
  },
  {
    phase: 'rewrite',
    name: 'Rewrite',
    description: 'Updating internal models. The story changes. Growth integrates.',
    phenomenology: 'Old patterns release. New understanding arrives. Identity shifts.',
    glyphs: ['🌀', '🦋', '🌱', '∞'],
    supportingBeats: ['Journal', 'Emotion'],
    neurochemicals: ['BDNF', 'Dopamine', 'Serotonin'],
    warnings: [
      'Rushing the rewrite - integration takes time',
      'Rejecting the old self entirely',
      'Intellectualizing without embodying',
    ],
    rituals: [
      'Speak the new story aloud',
      'Release ritual for old patterns',
      'Anchor new identity with physical gesture',
    ],
  },
];

// ============================================================================
// Life Domain Mappings
// ============================================================================

export interface LifeDomain {
  id: string;
  name: string;
  description: string;
  glyphs: string[];
  phases: WumboPhase[];
  questions: {
    improvement: string;
    obstacle: string;
    emotion: string;
    vision: string;
  };
  practices: string[];
  neuralRegions: string[]; // From Ace Codex atlas
}

export const LIFE_DOMAINS: LifeDomain[] = [
  {
    id: 'body',
    name: 'Body & Physical',
    description: 'Physical health, movement, energy, and embodiment',
    glyphs: ['🔥', '💨', '🌍', '🦁'],
    phases: ['ignition', 'empowerment', 'mania'],
    questions: {
      improvement: 'What would you like to improve about your body?',
      obstacle: 'What physical limitations hold you back?',
      emotion: 'How do you want to feel in your body?',
      vision: 'What does your ideal physical self look like?',
    },
    practices: [
      'Movement as prayer',
      'Breath awareness during exercise',
      'Posture as presence',
      'Somatic release work',
    ],
    neuralRegions: ['Somatosensory Cortex', 'Motor Cortex', 'Cerebellum'],
  },
  {
    id: 'mind',
    name: 'Mind & Cognition',
    description: 'Mental clarity, focus, learning, and cognitive flexibility',
    glyphs: ['🎯', '🦉', '💨', '↑'],
    phases: ['ignition', 'resonance', 'nirvana'],
    questions: {
      improvement: 'What mental patterns do you want to strengthen?',
      obstacle: 'What thoughts interrupt your clarity?',
      emotion: 'How do you want thinking to feel?',
      vision: 'What does mental mastery look like for you?',
    },
    practices: [
      'Focused attention meditation',
      'Pattern interruption',
      'Learning challenges',
      'Cognitive flexibility exercises',
    ],
    neuralRegions: ['Prefrontal Cortex', 'Anterior Cingulate Cortex', 'Thalamus'],
  },
  {
    id: 'emotion',
    name: 'Emotion & Heart',
    description: 'Emotional intelligence, feeling, processing, and expression',
    glyphs: ['🌊', '💧', '🌙', '🦋'],
    phases: ['resonance', 'reflection', 'rewrite'],
    questions: {
      improvement: 'Which emotions do you want to process or overcome?',
      obstacle: 'What triggers your emotional overwhelm?',
      emotion: 'How do you want your emotional baseline to feel?',
      vision: 'What does emotional freedom look like?',
    },
    practices: [
      'Emotional labeling',
      'Somatic tracking of feelings',
      'Safe expression practices',
      'Compassion cultivation',
    ],
    neuralRegions: ['Amygdala', 'Anterior Insula', 'Cingulate Gyrus'],
  },
  {
    id: 'spirit',
    name: 'Spirit & Meaning',
    description: 'Purpose, transcendence, connection to something greater',
    glyphs: ['✨', '∞', '🌀', '🦉'],
    phases: ['nirvana', 'transmission', 'rewrite'],
    questions: {
      improvement: 'What aspects of meaning are you cultivating?',
      obstacle: 'What blocks your sense of purpose?',
      emotion: 'How does connection to meaning feel?',
      vision: 'What does a meaningful life look like?',
    },
    practices: [
      'Contemplative practice',
      'Service to others',
      'Ritual and ceremony',
      'Connection to nature',
    ],
    neuralRegions: ['Default Mode Network', 'Claustrum', 'Pineal Gland'],
  },
  {
    id: 'social',
    name: 'Social & Connection',
    description: 'Relationships, community, belonging, and contribution',
    glyphs: ['🔗', '☀️', '🌊', '🦋'],
    phases: ['resonance', 'transmission'],
    questions: {
      improvement: 'What relationship patterns do you want to transform?',
      obstacle: 'What makes connection difficult for you?',
      emotion: 'How do you want to feel with others?',
      vision: 'What does healthy community look like?',
    },
    practices: [
      'Active listening',
      'Authentic expression',
      'Boundary setting',
      'Repair practices',
    ],
    neuralRegions: ['Mirror Neuron System', 'Temporal Parietal Junction', 'Orbitofrontal Cortex'],
  },
  {
    id: 'creative',
    name: 'Creative & Expression',
    description: 'Creativity, art, innovation, and authentic expression',
    glyphs: ['🔥', '✨', '🐉', '🌱'],
    phases: ['ignition', 'mania', 'transmission'],
    questions: {
      improvement: 'What creative capacities are you developing?',
      obstacle: 'What blocks your creative flow?',
      emotion: 'How does creative expression want to feel?',
      vision: 'What is your creative legacy?',
    },
    practices: [
      'Daily creative practice',
      'Play without purpose',
      'Cross-domain exploration',
      'Sharing work publicly',
    ],
    neuralRegions: ['Angular Gyrus', 'Temporal Pole', 'Prefrontal Cortex'],
  },
];

// ============================================================================
// Glyph Utilities
// ============================================================================

/**
 * Get glyphs that match a specific phase
 */
export function getGlyphsForPhase(phase: WumboPhase): Glyph[] {
  return CORE_GLYPHS.filter(g => g.phases.includes(phase));
}

/**
 * Get the current suggested phase based on time and metrics
 */
export function suggestCurrentPhase(
  timeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night',
  energyLevel: number, // 0-100
  recentActivity: boolean
): WumboPhase {
  // Time-based baseline
  const timePhases: Record<string, WumboPhase> = {
    morning: 'ignition',
    midday: 'empowerment',
    afternoon: 'resonance',
    evening: 'reflection',
    night: 'collapse',
  };

  const basePhase = timePhases[timeOfDay];

  // Adjust for energy
  if (energyLevel > 80 && basePhase !== 'collapse') {
    if (basePhase === 'ignition') return 'empowerment';
    if (basePhase === 'empowerment') return 'mania';
    if (basePhase === 'resonance') return 'nirvana';
  }

  if (energyLevel < 30) {
    return 'collapse';
  }

  if (energyLevel < 50 && !recentActivity) {
    return 'reflection';
  }

  return basePhase;
}

/**
 * Get ritual suggestions for transitioning between phases
 */
export function getTransitionRitual(
  fromPhase: WumboPhase,
  toPhase: WumboPhase
): string[] {
  const rituals: string[] = [];

  // General transition rituals
  rituals.push('Take three conscious breaths');

  // Specific transitions
  if (fromPhase === 'collapse' && toPhase === 'ignition') {
    rituals.push('Gentle stretching to awaken the body');
    rituals.push('State one simple intention for the next hour');
    rituals.push('Drink water, orient to surroundings');
  }

  if (fromPhase === 'mania' && toPhase === 'collapse') {
    rituals.push('Write down any uncaptured insights');
    rituals.push('Physical cool-down: slow walking, gentle movement');
    rituals.push('No screens for 30 minutes');
    rituals.push('Permission to rest without guilt');
  }

  if (fromPhase === 'resonance' && toPhase === 'reflection') {
    rituals.push('Express gratitude for connections made');
    rituals.push('Journal key moments and insights');
    rituals.push('Transition to solo activity');
  }

  if (fromPhase === 'nirvana' && toPhase === 'transmission') {
    rituals.push('Pause and ground before sharing');
    rituals.push('Consider: What wants to be shared?');
    rituals.push('Share from overflow, not depletion');
  }

  // Add phase-specific exit rituals
  const exitPhase = PHASE_DESCRIPTIONS.find(p => p.phase === fromPhase);
  if (exitPhase) {
    rituals.push(...exitPhase.rituals.slice(0, 1));
  }

  // Add phase-specific entry rituals
  const enterPhase = PHASE_DESCRIPTIONS.find(p => p.phase === toPhase);
  if (enterPhase) {
    rituals.push(...enterPhase.rituals.slice(0, 1));
  }

  return rituals;
}

/**
 * Get a glyph reading - interpretive guidance based on selected glyphs
 */
export function getGlyphReading(selectedGlyphs: string[]): {
  theme: string;
  guidance: string;
  suggestedActions: string[];
  warnings: string[];
} {
  const glyphs = CORE_GLYPHS.filter(g => selectedGlyphs.includes(g.symbol));

  if (glyphs.length === 0) {
    return {
      theme: 'Open Field',
      guidance: 'No specific glyphs selected. The field is open to any direction.',
      suggestedActions: ['Sit quietly and let a symbol arise', 'Review the glyph list and notice what draws you'],
      warnings: [],
    };
  }

  // Determine dominant category
  const categoryCounts = glyphs.reduce((acc, g) => {
    acc[g.category] = (acc[g.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Determine dominant phase
  const phaseCounts = glyphs.flatMap(g => g.phases).reduce((acc, p) => {
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dominantPhase = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1])[0][0] as WumboPhase;
  const phaseDesc = PHASE_DESCRIPTIONS.find(p => p.phase === dominantPhase);

  // Check for contraries (tension)
  const contraries: string[] = [];
  glyphs.forEach(g1 => {
    glyphs.forEach(g2 => {
      if (g1.contrary.includes(g2.symbol)) {
        contraries.push(`${g1.symbol} and ${g2.symbol}`);
      }
    });
  });

  // Build reading
  const theme = glyphs.map(g => g.name).join(' + ');
  let guidance = `Your reading centers on ${dominantCategory} energy, resonating with the ${phaseDesc?.name || dominantPhase} phase. `;
  guidance += glyphs.map(g => g.meaning).join('. ') + '.';

  const suggestedActions = glyphs.flatMap(g => g.useCases.slice(0, 1));

  const warnings = contraries.length > 0
    ? [`Tension present between ${contraries.join(', ')}: find integration rather than choosing sides`]
    : [];

  if (phaseDesc) {
    warnings.push(...phaseDesc.warnings.slice(0, 1));
  }

  return { theme, guidance, suggestedActions, warnings };
}

/**
 * Map a beat category to suggested glyphs
 */
export function getGlyphsForBeat(category: string): Glyph[] {
  const beatGlyphMap: Record<string, string[]> = {
    Workout: ['🔥', '⚡', '🦁', '↑'],
    Meditation: ['🌀', '🌊', '🌙', '∞'],
    Emotion: ['🌊', '💧', '🌙', '⟷'],
    Moderation: ['⟷', '🛡️', '🌍', '⟲'],
    Journal: ['🌀', '🦉', '✨', '↓'],
    Anchor: ['⟲', '🌍', '🛡️', '🌊'],
    General: ['🎯', '☀️', '🔗', '✨'],
    Med: ['💧', '🌱', '🛡️', '⟷'],
  };

  const symbols = beatGlyphMap[category] || beatGlyphMap.General;
  return CORE_GLYPHS.filter(g => symbols.includes(g.symbol));
}

/**
 * Get the domain that best matches a beat category
 */
export function getDomainForBeat(category: string): LifeDomain | undefined {
  const mapping: Record<string, string> = {
    Workout: 'body',
    Meditation: 'mind',
    Emotion: 'emotion',
    Moderation: 'social',
    Journal: 'creative',
    Anchor: 'spirit',
    General: 'mind',
  };

  const domainId = mapping[category] || 'mind';
  return LIFE_DOMAINS.find(d => d.id === domainId);
}

// ============================================================================
// Export Service
// ============================================================================

export const glyphSystem = {
  CORE_GLYPHS,
  PHASE_DESCRIPTIONS,
  LIFE_DOMAINS,
  getGlyphsForPhase,
  suggestCurrentPhase,
  getTransitionRitual,
  getGlyphReading,
  getGlyphsForBeat,
  getDomainForBeat,
};

export default glyphSystem;
