/**
 * Rhythm Planner - AI-Assisted Scheduling (Phase 3 Partial)
 *
 * This module provides intelligent scheduling suggestions and automatic
 * interventions based on the user's rhythm state, check-in patterns, and
 * energy levels. It bridges Phase 2 (Rhythm State) with actionable schedule
 * optimization.
 *
 * Key capabilities:
 * - Auto-suggest breaks after extended focus sessions
 * - Suggest focus blocks for logged but unscheduled tasks
 * - Detect rhythm friction and propose schedule adjustments
 * - Integrate with Google Calendar for event creation
 * - Log all interventions to the audit trail
 */

import { auditLog } from './auditLog';
import type { RhythmState } from './rhythmStateEngine';

/**
 * Check-in structure (matches App.tsx)
 */
export interface CheckIn {
  id: string;
  category: string;
  task: string;
  waveId?: string;
  slot: string;
  loggedAt: string;
  note?: string;
  done: boolean;
  isAnchor?: boolean;
}

/**
 * Wave structure
 */
export interface Wave {
  id: string;
  name: string;
  description: string;
  color: string;
  startHour: number;
  endHour: number;
}

/**
 * Planner suggestion types
 */
export type SuggestionType =
  | 'BREAK_NEEDED'
  | 'FOCUS_BLOCK'
  | 'SCHEDULE_ADJUSTMENT'
  | 'REFLECTION_REMINDER'
  | 'ANCHOR_REMINDER'
  | 'FRICTION_WARNING';

/**
 * A suggestion from the planner
 */
export interface PlannerSuggestion {
  id: string;
  type: SuggestionType;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: {
    type: 'create_event' | 'snooze' | 'dismiss' | 'navigate';
    payload?: any;
  };
  createdAt: string;
  expiresAt?: string;
  dismissed?: boolean;
}

/**
 * Planner configuration
 */
export interface PlannerConfig {
  // Minutes of continuous focus before suggesting a break
  focusBreakThreshold: number;
  // Default break duration in minutes
  defaultBreakDuration: number;
  // Minutes before a task to send anchor reminders
  anchorReminderLeadTime: number;
  // Enable auto-scheduling (vs just suggestions)
  autoScheduleEnabled: boolean;
  // Maximum suggestions to keep active
  maxActiveSuggestions: number;
}

const DEFAULT_CONFIG: PlannerConfig = {
  focusBreakThreshold: 90, // 90 minutes
  defaultBreakDuration: 15,
  anchorReminderLeadTime: 15,
  autoScheduleEnabled: false, // Default to suggestions only
  maxActiveSuggestions: 5
};

/**
 * Helper to check if two dates are the same day
 */
const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Generate unique ID
 */
const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Rhythm Planner
 *
 * Analyzes rhythm patterns and provides intelligent scheduling suggestions.
 */
export class RhythmPlanner {
  private config: PlannerConfig;
  private suggestions: PlannerSuggestion[] = [];
  private checkIns: CheckIn[] = [];
  private waves: Wave[] = [];
  private currentRhythmState: RhythmState = 'OPEN';
  private lastFocusStart: Date | null = null;
  private listeners: Set<(suggestions: PlannerSuggestion[]) => void> = new Set();

  constructor(config: Partial<PlannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    auditLog.addEntry(
      'SYSTEM_INIT',
      'info',
      'Rhythm planner initialized',
      { config: this.config }
    );
  }

  /**
   * Update check-ins data
   */
  updateCheckIns(checkIns: CheckIn[]): void {
    this.checkIns = checkIns;
    this.analyzeAndSuggest();
  }

  /**
   * Update waves configuration
   */
  updateWaves(waves: Wave[]): void {
    this.waves = waves;
  }

  /**
   * Get configured waves
   */
  getWaves(): Wave[] {
    return this.waves;
  }

  /**
   * Handle rhythm state changes
   */
  onRhythmStateChange(newState: RhythmState, _trigger: string): void {
    const oldState = this.currentRhythmState;
    this.currentRhythmState = newState;

    // Track focus session start
    if (newState === 'FOCUS' && oldState !== 'FOCUS') {
      this.lastFocusStart = new Date();
    }

    // Check for extended focus when leaving focus state
    if (oldState === 'FOCUS' && newState !== 'FOCUS' && this.lastFocusStart) {
      const focusDuration = (Date.now() - this.lastFocusStart.getTime()) / 60000;
      if (focusDuration > this.config.focusBreakThreshold) {
        this.suggestBreak(focusDuration);
      }
      this.lastFocusStart = null;
    }

    // Entering reflective state - suggest review
    if (newState === 'REFLECTIVE' && oldState !== 'REFLECTIVE') {
      this.suggestReflection();
    }

    this.analyzeAndSuggest();
  }

  /**
   * Analyze current state and generate suggestions
   */
  private analyzeAndSuggest(): void {
    const now = new Date();

    // Check for ongoing long focus session
    if (this.currentRhythmState === 'FOCUS' && this.lastFocusStart) {
      const focusDuration = (now.getTime() - this.lastFocusStart.getTime()) / 60000;
      if (focusDuration > this.config.focusBreakThreshold) {
        this.suggestBreak(focusDuration);
      }
    }

    // Check for upcoming anchors that need reminders
    this.checkAnchorReminders(now);

    // Check for friction patterns
    this.checkFrictionPatterns(now);

    // Check for unscheduled high-priority tasks
    this.checkUnscheduledTasks(now);

    // Clean up expired suggestions
    this.cleanupSuggestions();

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Suggest a break after extended focus
   */
  private suggestBreak(focusDurationMinutes: number): void {
    // Don't duplicate break suggestions
    const existingBreak = this.suggestions.find(
      s => s.type === 'BREAK_NEEDED' && !s.dismissed
    );
    if (existingBreak) return;

    const suggestion: PlannerSuggestion = {
      id: generateId(),
      type: 'BREAK_NEEDED',
      priority: focusDurationMinutes > 120 ? 'high' : 'medium',
      title: '💤 Time for a Break',
      description: `You've been focused for ${Math.round(focusDurationMinutes)} minutes. A short break will help maintain your energy and clarity.`,
      action: {
        type: 'create_event',
        payload: {
          summary: '💤 Rhythm Break',
          description: 'Auto-suggested break to recharge after extended focus',
          durationMinutes: this.config.defaultBreakDuration,
          colorId: '5' // Yellow for breaks
        }
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString() // 30 min expiry
    };

    this.addSuggestion(suggestion);

    auditLog.addEntry(
      'AI_SUGGESTION',
      'info',
      `Break suggested after ${Math.round(focusDurationMinutes)}min focus`,
      { focusDuration: focusDurationMinutes, breakDuration: this.config.defaultBreakDuration }
    );
  }

  /**
   * Suggest reflection/journaling during reflective hours
   */
  private suggestReflection(): void {
    const existingReflection = this.suggestions.find(
      s => s.type === 'REFLECTION_REMINDER' && !s.dismissed
    );
    if (existingReflection) return;

    // Check if user has journaled today
    const today = new Date();
    const todayCheckIns = this.checkIns.filter(c =>
      sameDay(new Date(c.slot), today) && c.category === 'Journal'
    );

    if (todayCheckIns.length === 0) {
      const suggestion: PlannerSuggestion = {
        id: generateId(),
        type: 'REFLECTION_REMINDER',
        priority: 'low',
        title: '🌙 Evening Reflection',
        description: 'Take a few minutes to journal about your day. Reflection helps integrate learning and set intentions.',
        action: {
          type: 'navigate',
          payload: { section: 'journal' }
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3 * 60 * 60000).toISOString() // 3 hour expiry
      };

      this.addSuggestion(suggestion);

      auditLog.addEntry(
        'AI_SUGGESTION',
        'info',
        'Reflection reminder sent during reflective hours',
        { hasJournaledToday: false }
      );
    }
  }

  /**
   * Check for upcoming anchors and send reminders
   */
  private checkAnchorReminders(now: Date): void {
    const upcomingAnchors = this.checkIns.filter(c => {
      if (!c.isAnchor || c.done) return false;
      const slotTime = new Date(c.slot);
      if (!sameDay(slotTime, now)) return false;

      const minutesUntil = (slotTime.getTime() - now.getTime()) / 60000;
      return minutesUntil > 0 && minutesUntil <= this.config.anchorReminderLeadTime;
    });

    upcomingAnchors.forEach(anchor => {
      const existingReminder = this.suggestions.find(
        s => s.type === 'ANCHOR_REMINDER' && s.action?.payload?.anchorId === anchor.id
      );
      if (existingReminder) return;

      const minutesUntil = Math.round(
        (new Date(anchor.slot).getTime() - now.getTime()) / 60000
      );

      const suggestion: PlannerSuggestion = {
        id: generateId(),
        type: 'ANCHOR_REMINDER',
        priority: 'medium',
        title: `⚓ Anchor Starting Soon`,
        description: `"${anchor.task}" starts in ${minutesUntil} minutes. Prepare to transition.`,
        action: {
          type: 'navigate',
          payload: { anchorId: anchor.id }
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(new Date(anchor.slot).getTime() + 5 * 60000).toISOString()
      };

      this.addSuggestion(suggestion);

      auditLog.addEntry(
        'AI_SUGGESTION',
        'info',
        `Anchor reminder: ${anchor.task} in ${minutesUntil}min`,
        { task: anchor.task, minutesUntil }
      );
    });
  }

  /**
   * Check for friction patterns (missed/delayed tasks)
   */
  private checkFrictionPatterns(now: Date): void {
    const todayCheckIns = this.checkIns.filter(c => sameDay(new Date(c.slot), now));

    // Count overdue incomplete tasks
    const overdueCount = todayCheckIns.filter(c => {
      if (c.done) return false;
      const slotTime = new Date(c.slot).getTime();
      return slotTime < now.getTime() - 15 * 60000; // 15+ min overdue
    }).length;

    if (overdueCount >= 3) {
      const existingWarning = this.suggestions.find(
        s => s.type === 'FRICTION_WARNING' && !s.dismissed
      );
      if (existingWarning) return;

      const suggestion: PlannerSuggestion = {
        id: generateId(),
        type: 'FRICTION_WARNING',
        priority: 'high',
        title: '⚡ Schedule Friction Detected',
        description: `${overdueCount} tasks are overdue. Consider rescheduling or taking a reset moment to regroup.`,
        action: {
          type: 'create_event',
          payload: {
            summary: '🛑 Regroup & Plan',
            description: 'Take a moment to review and adjust your schedule',
            durationMinutes: 10,
            colorId: '11' // Red for urgent
          }
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60000).toISOString()
      };

      this.addSuggestion(suggestion);

      auditLog.addEntry(
        'AI_SUGGESTION',
        'warning',
        `Friction warning: ${overdueCount} overdue tasks`,
        { overdueCount }
      );
    }
  }

  /**
   * Check for tasks that could use a scheduled focus block
   */
  private checkUnscheduledTasks(now: Date): void {
    // This would integrate with a task list if available
    // For now, suggest focus blocks during OPEN time if no upcoming beats
    if (this.currentRhythmState !== 'OPEN') return;

    const upcomingToday = this.checkIns.filter(c => {
      if (c.done) return false;
      const slotTime = new Date(c.slot);
      if (!sameDay(slotTime, now)) return false;
      return slotTime.getTime() > now.getTime();
    });

    // If there's a 2+ hour gap with nothing scheduled, suggest a focus block
    if (upcomingToday.length === 0) {
      const hour = now.getHours();
      // Only suggest during typical working hours
      if (hour >= 9 && hour <= 17) {
        const existingSuggestion = this.suggestions.find(
          s => s.type === 'FOCUS_BLOCK' && !s.dismissed
        );
        if (existingSuggestion) return;

        const suggestion: PlannerSuggestion = {
          id: generateId(),
          type: 'FOCUS_BLOCK',
          priority: 'low',
          title: '🎯 Open Time Available',
          description: 'You have unscheduled time. Consider adding a focus block for an important task.',
          action: {
            type: 'create_event',
            payload: {
              summary: '🎯 Focus Block',
              description: 'Dedicated focus time',
              durationMinutes: 50,
              colorId: '7' // Cyan for focus
            }
          },
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 2 * 60 * 60000).toISOString()
        };

        this.addSuggestion(suggestion);
      }
    }
  }

  /**
   * Add a suggestion to the list
   */
  private addSuggestion(suggestion: PlannerSuggestion): void {
    this.suggestions.push(suggestion);

    // Trim to max suggestions
    if (this.suggestions.length > this.config.maxActiveSuggestions) {
      // Remove oldest non-high-priority dismissed suggestions first
      this.suggestions = this.suggestions
        .sort((a, b) => {
          if (a.dismissed !== b.dismissed) return a.dismissed ? -1 : 1;
          if (a.priority !== b.priority) {
            const priorityOrder = { high: 2, medium: 1, low: 0 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, this.config.maxActiveSuggestions);
    }
  }

  /**
   * Clean up expired suggestions
   */
  private cleanupSuggestions(): void {
    const now = Date.now();
    this.suggestions = this.suggestions.filter(s => {
      if (s.dismissed) return false;
      if (s.expiresAt && new Date(s.expiresAt).getTime() < now) return false;
      return true;
    });
  }

  /**
   * Dismiss a suggestion
   */
  dismissSuggestion(suggestionId: string): void {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      suggestion.dismissed = true;

      auditLog.addEntry(
        'AI_SUGGESTION',
        'info',
        `Suggestion dismissed: ${suggestion.title}`,
        { type: suggestion.type }
      );

      this.notifyListeners();
    }
  }

  /**
   * Accept a suggestion and execute its action
   */
  acceptSuggestion(suggestionId: string): PlannerSuggestion | null {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return null;

    suggestion.dismissed = true;

    auditLog.addEntry(
      'AI_INTERVENTION',
      'success',
      `Suggestion accepted: ${suggestion.title}`,
      { type: suggestion.type, action: suggestion.action }
    );

    this.notifyListeners();
    return suggestion;
  }

  /**
   * Get active suggestions
   */
  getActiveSuggestions(): PlannerSuggestion[] {
    return this.suggestions.filter(s => !s.dismissed);
  }

  /**
   * Get suggestions by priority
   */
  getSuggestionsByPriority(priority: 'low' | 'medium' | 'high'): PlannerSuggestion[] {
    return this.suggestions.filter(s => !s.dismissed && s.priority === priority);
  }

  /**
   * Subscribe to suggestion updates
   */
  subscribe(listener: (suggestions: PlannerSuggestion[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const active = this.getActiveSuggestions();
    this.listeners.forEach(listener => listener(active));
  }

  /**
   * Generate a suggested event for calendar creation
   */
  generateBreakEvent(afterTask?: string): {
    summary: string;
    description: string;
    start: Date;
    end: Date;
    colorId: string;
  } {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 5); // 5 min from now
    const end = new Date(start.getTime() + this.config.defaultBreakDuration * 60000);

    return {
      summary: '💤 Rhythm Break',
      description: afterTask
        ? `Recovery break after: ${afterTask}`
        : 'Auto-scheduled break to recharge',
      start,
      end,
      colorId: '5'
    };
  }

  /**
   * Generate a suggested focus block event
   */
  generateFocusBlock(taskName?: string, durationMinutes: number = 50): {
    summary: string;
    description: string;
    start: Date;
    end: Date;
    colorId: string;
  } {
    const start = new Date();
    // Round to next 15-min interval
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);
    start.setSeconds(0);
    start.setMilliseconds(0);

    const end = new Date(start.getTime() + durationMinutes * 60000);

    return {
      summary: taskName ? `🎯 Focus: ${taskName}` : '🎯 Focus Block',
      description: 'Dedicated focus time for deep work',
      start,
      end,
      colorId: '7'
    };
  }

  /**
   * Get AI prompt context for the planner state
   */
  getAIPromptContext(): string {
    const active = this.getActiveSuggestions();
    let context = `Rhythm Planner State:\n`;
    context += `- Active Suggestions: ${active.length}\n`;

    if (active.length > 0) {
      context += `- Top Priority: ${active[0].title}\n`;
      context += `- Types: ${active.map(s => s.type).join(', ')}\n`;
    }

    if (this.lastFocusStart) {
      const focusDuration = (Date.now() - this.lastFocusStart.getTime()) / 60000;
      context += `- Current focus duration: ${Math.round(focusDuration)} minutes\n`;
    }

    return context;
  }
}

/**
 * Factory function to create a rhythm planner
 */
export function createRhythmPlanner(config?: Partial<PlannerConfig>): RhythmPlanner {
  return new RhythmPlanner(config);
}

export default RhythmPlanner;
