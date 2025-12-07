/**
 * Rhythm Planner - AI-Assisted Scheduling (Phase 3 Complete)
 *
 * This module provides intelligent scheduling suggestions and automatic
 * interventions based on the user's rhythm state, check-in patterns, and
 * energy levels. It bridges Phase 2 (Rhythm State) with actionable schedule
 * optimization.
 *
 * Key capabilities:
 * - Auto-schedule breaks after extended focus sessions
 * - Suggest and auto-create focus blocks for tasks
 * - Detect schedule conflicts before auto-scheduling
 * - Integrate with Google Calendar for event creation
 * - Configurable user preferences for planner behavior
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
 * Google Calendar Event structure
 */
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  colorId?: string;
}

/**
 * Calendar Service Interface (for dependency injection)
 */
export interface CalendarServiceInterface {
  createEvent(event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    colorId?: string;
  }): Promise<any>;
  listEvents(timeMin: string, timeMax: string): Promise<any[]>;
  deleteEvent(eventId: string): Promise<void>;
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
  | 'FRICTION_WARNING'
  | 'AUTO_SCHEDULED';

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
    type: 'create_event' | 'snooze' | 'dismiss' | 'navigate' | 'auto_scheduled';
    payload?: any;
  };
  createdAt: string;
  expiresAt?: string;
  dismissed?: boolean;
  autoScheduled?: boolean;
  calendarEventId?: string;
}

/**
 * Time slot for scheduling
 */
export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  conflictsWith?: string[];
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
  // Auto-schedule breaks after focus sessions
  autoScheduleBreaks: boolean;
  // Auto-schedule focus blocks when suggested
  autoScheduleFocusBlocks: boolean;
  // Require confirmation for auto-scheduled events
  requireConfirmation: boolean;
  // Maximum suggestions to keep active
  maxActiveSuggestions: number;
  // Working hours for scheduling (24h format)
  workingHours: { start: number; end: number };
  // Minimum gap between events (minutes)
  minimumEventGap: number;
  // Default focus block duration (minutes)
  defaultFocusBlockDuration: number;
  // Enable friction detection and warnings
  enableFrictionDetection: boolean;
  // Number of overdue tasks to trigger friction warning
  frictionThreshold: number;
}

/**
 * User preferences for the planner (saved to storage)
 */
export interface PlannerPreferences {
  autoScheduleEnabled: boolean;
  autoScheduleBreaks: boolean;
  autoScheduleFocusBlocks: boolean;
  requireConfirmation: boolean;
  focusBreakThreshold: number;
  defaultBreakDuration: number;
  defaultFocusBlockDuration: number;
  workingHoursStart: number;
  workingHoursEnd: number;
  enableFrictionDetection: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_CONFIG: PlannerConfig = {
  focusBreakThreshold: 90, // 90 minutes
  defaultBreakDuration: 15,
  anchorReminderLeadTime: 15,
  autoScheduleEnabled: false,
  autoScheduleBreaks: false,
  autoScheduleFocusBlocks: false,
  requireConfirmation: true,
  maxActiveSuggestions: 5,
  workingHours: { start: 9, end: 18 },
  minimumEventGap: 5,
  defaultFocusBlockDuration: 50,
  enableFrictionDetection: true,
  frictionThreshold: 3
};

export const DEFAULT_PREFERENCES: PlannerPreferences = {
  autoScheduleEnabled: false,
  autoScheduleBreaks: false,
  autoScheduleFocusBlocks: false,
  requireConfirmation: true,
  focusBreakThreshold: 90,
  defaultBreakDuration: 15,
  defaultFocusBlockDuration: 50,
  workingHoursStart: 9,
  workingHoursEnd: 18,
  enableFrictionDetection: true,
  notificationsEnabled: true
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
 * Check if two time ranges overlap
 */
const timeRangesOverlap = (
  start1: Date, end1: Date,
  start2: Date, end2: Date
): boolean => {
  return start1 < end2 && end1 > start2;
};

/**
 * Rhythm Planner
 *
 * Analyzes rhythm patterns and provides intelligent scheduling suggestions
 * with optional auto-scheduling to Google Calendar.
 */
export class RhythmPlanner {
  private config: PlannerConfig;
  private preferences: PlannerPreferences;
  private suggestions: PlannerSuggestion[] = [];
  private checkIns: CheckIn[] = [];
  private waves: Wave[] = [];
  private currentRhythmState: RhythmState = 'OPEN';
  private lastFocusStart: Date | null = null;
  private lastFocusTask: string | null = null;
  private calendarService: CalendarServiceInterface | null = null;
  private calendarEvents: CalendarEvent[] = [];
  private listeners: Set<(suggestions: PlannerSuggestion[]) => void> = new Set();
  private preferencesListeners: Set<(prefs: PlannerPreferences) => void> = new Set();
  private autoScheduledEvents: Map<string, string> = new Map(); // suggestionId -> calendarEventId

  constructor(config: Partial<PlannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.syncConfigWithPreferences();

    auditLog.addEntry(
      'SYSTEM_INIT',
      'info',
      'Rhythm planner initialized',
      { config: this.config, autoScheduleEnabled: this.config.autoScheduleEnabled }
    );
  }

  /**
   * Sync config with preferences
   */
  private syncConfigWithPreferences(): void {
    this.config.autoScheduleEnabled = this.preferences.autoScheduleEnabled;
    this.config.autoScheduleBreaks = this.preferences.autoScheduleBreaks;
    this.config.autoScheduleFocusBlocks = this.preferences.autoScheduleFocusBlocks;
    this.config.requireConfirmation = this.preferences.requireConfirmation;
    this.config.focusBreakThreshold = this.preferences.focusBreakThreshold;
    this.config.defaultBreakDuration = this.preferences.defaultBreakDuration;
    this.config.defaultFocusBlockDuration = this.preferences.defaultFocusBlockDuration;
    this.config.workingHours = {
      start: this.preferences.workingHoursStart,
      end: this.preferences.workingHoursEnd
    };
    this.config.enableFrictionDetection = this.preferences.enableFrictionDetection;
  }

  /**
   * Set calendar service for auto-scheduling
   */
  setCalendarService(service: CalendarServiceInterface | null): void {
    this.calendarService = service;
    if (service) {
      auditLog.addEntry(
        'SYSTEM_INIT',
        'info',
        'Calendar service connected to planner',
        { autoScheduleEnabled: this.config.autoScheduleEnabled }
      );
    }
  }

  /**
   * Update preferences
   */
  updatePreferences(prefs: Partial<PlannerPreferences>): void {
    const oldPrefs = { ...this.preferences };
    this.preferences = { ...this.preferences, ...prefs };
    this.syncConfigWithPreferences();

    auditLog.addEntry(
      'PROFILE_UPDATED',
      'info',
      'Planner preferences updated',
      { changed: prefs, autoScheduleEnabled: this.preferences.autoScheduleEnabled }
    );

    // Notify preference listeners
    this.preferencesListeners.forEach(listener => listener(this.preferences));

    // If auto-schedule was just enabled, run analysis
    if (!oldPrefs.autoScheduleEnabled && this.preferences.autoScheduleEnabled) {
      this.analyzeAndSuggest();
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): PlannerPreferences {
    return { ...this.preferences };
  }

  /**
   * Subscribe to preference changes
   */
  subscribeToPreferences(listener: (prefs: PlannerPreferences) => void): () => void {
    this.preferencesListeners.add(listener);
    return () => this.preferencesListeners.delete(listener);
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
   * Update cached calendar events for conflict detection
   */
  async refreshCalendarEvents(): Promise<void> {
    if (!this.calendarService) return;

    try {
      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(now);
      dayEnd.setHours(23, 59, 59, 999);

      const events = await this.calendarService.listEvents(
        dayStart.toISOString(),
        dayEnd.toISOString()
      );

      this.calendarEvents = events.map((e: any) => ({
        id: e.id,
        summary: e.summary || 'Untitled',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        colorId: e.colorId
      }));

      auditLog.addEntry(
        'GCAL_IMPORT',
        'info',
        `Refreshed ${this.calendarEvents.length} calendar events for conflict detection`,
        { eventCount: this.calendarEvents.length }
      );
    } catch (error) {
      auditLog.addEntry(
        'ERROR',
        'error',
        'Failed to refresh calendar events',
        { error: String(error) }
      );
    }
  }

  /**
   * Check for schedule conflicts at a given time slot
   */
  checkForConflicts(start: Date, end: Date): {
    hasConflict: boolean;
    conflictingEvents: CalendarEvent[];
  } {
    const conflicts: CalendarEvent[] = [];

    // Check against calendar events
    for (const event of this.calendarEvents) {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      if (timeRangesOverlap(start, end, eventStart, eventEnd)) {
        conflicts.push(event);
      }
    }

    // Check against check-ins
    for (const checkIn of this.checkIns) {
      if (checkIn.done) continue;

      const slotStart = new Date(checkIn.slot);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000); // 30 min default

      if (timeRangesOverlap(start, end, slotStart, slotEnd)) {
        conflicts.push({
          id: checkIn.id,
          summary: checkIn.task,
          start: slotStart.toISOString(),
          end: slotEnd.toISOString()
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflictingEvents: conflicts
    };
  }

  /**
   * Find the next available time slot
   */
  findNextAvailableSlot(
    durationMinutes: number,
    afterTime: Date = new Date()
  ): TimeSlot | null {
    const { start: workStart, end: workEnd } = this.config.workingHours;
    const now = new Date(afterTime);

    // Round to next 5-minute interval
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
    now.setSeconds(0);
    now.setMilliseconds(0);

    // If before working hours, start at working hours
    if (now.getHours() < workStart) {
      now.setHours(workStart, 0, 0, 0);
    }

    // Search for available slots in 15-minute increments
    const maxSearchTime = new Date(now);
    maxSearchTime.setHours(workEnd, 0, 0, 0);

    let searchTime = new Date(now);

    while (searchTime < maxSearchTime) {
      const slotEnd = new Date(searchTime.getTime() + durationMinutes * 60000);

      // Don't schedule past working hours
      if (slotEnd.getHours() > workEnd ||
          (slotEnd.getHours() === workEnd && slotEnd.getMinutes() > 0)) {
        break;
      }

      const { hasConflict, conflictingEvents } = this.checkForConflicts(searchTime, slotEnd);

      if (!hasConflict) {
        return {
          start: new Date(searchTime),
          end: slotEnd,
          available: true
        };
      }

      // Move past the conflicting event
      if (conflictingEvents.length > 0) {
        const latestConflictEnd = Math.max(
          ...conflictingEvents.map(e => new Date(e.end).getTime())
        );
        searchTime = new Date(latestConflictEnd + this.config.minimumEventGap * 60000);
      } else {
        searchTime = new Date(searchTime.getTime() + 15 * 60000);
      }
    }

    return null;
  }

  /**
   * Handle rhythm state changes
   */
  onRhythmStateChange(newState: RhythmState, trigger: string): void {
    const oldState = this.currentRhythmState;
    this.currentRhythmState = newState;

    // Track focus session start
    if (newState === 'FOCUS' && oldState !== 'FOCUS') {
      this.lastFocusStart = new Date();
      // Extract task name from trigger if available
      const taskMatch = trigger.match(/Active focus beat: (.+)/);
      this.lastFocusTask = taskMatch ? taskMatch[1] : null;
    }

    // Check for extended focus when leaving focus state
    if (oldState === 'FOCUS' && newState !== 'FOCUS' && this.lastFocusStart) {
      const focusDuration = (Date.now() - this.lastFocusStart.getTime()) / 60000;
      if (focusDuration > this.config.focusBreakThreshold) {
        this.ensureBreakAfterFocus(focusDuration, this.lastFocusTask);
      }
      this.lastFocusStart = null;
      this.lastFocusTask = null;
    }

    // Entering reflective state - suggest review
    if (newState === 'REFLECTIVE' && oldState !== 'REFLECTIVE') {
      this.suggestReflection();
    }

    this.analyzeAndSuggest();
  }

  /**
   * Ensure a break is scheduled after extended focus
   * This is the key auto-scheduling method
   */
  async ensureBreakAfterFocus(
    focusDurationMinutes: number,
    afterTask?: string | null
  ): Promise<PlannerSuggestion | null> {
    // Don't duplicate break suggestions
    const existingBreak = this.suggestions.find(
      s => s.type === 'BREAK_NEEDED' && !s.dismissed
    );
    if (existingBreak) return existingBreak;

    const breakDuration = this.config.defaultBreakDuration;
    const now = new Date();

    // Find next available slot for the break
    const slot = this.findNextAvailableSlot(breakDuration, now);

    if (!slot) {
      auditLog.addEntry(
        'AI_SUGGESTION',
        'warning',
        'Could not find available slot for break',
        { focusDuration: focusDurationMinutes }
      );
      return null;
    }

    // Check for conflicts one more time
    const { hasConflict, conflictingEvents } = this.checkForConflicts(slot.start, slot.end);

    if (hasConflict) {
      auditLog.addEntry(
        'AI_SUGGESTION',
        'warning',
        'Break slot has conflicts',
        { conflicts: conflictingEvents.map(e => e.summary) }
      );
      return null;
    }

    const suggestion: PlannerSuggestion = {
      id: generateId(),
      type: 'BREAK_NEEDED',
      priority: focusDurationMinutes > 120 ? 'high' : 'medium',
      title: '💤 Time for a Break',
      description: `You've been focused for ${Math.round(focusDurationMinutes)} minutes${afterTask ? ` on "${afterTask}"` : ''}. A ${breakDuration}-minute break will help maintain your energy.`,
      action: {
        type: this.config.autoScheduleBreaks ? 'auto_scheduled' : 'create_event',
        payload: {
          summary: '💤 Rhythm Break',
          description: afterTask
            ? `Recovery break after: ${afterTask}`
            : 'Auto-scheduled break to recharge after extended focus',
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          durationMinutes: breakDuration,
          colorId: '5' // Yellow for breaks
        }
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString()
    };

    // Auto-schedule if enabled
    if (this.config.autoScheduleBreaks && this.calendarService && !this.config.requireConfirmation) {
      try {
        const result = await this.calendarService.createEvent({
          summary: suggestion.action!.payload.summary,
          description: suggestion.action!.payload.description,
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          colorId: '5'
        });

        suggestion.autoScheduled = true;
        suggestion.calendarEventId = result?.id;
        suggestion.type = 'AUTO_SCHEDULED';
        suggestion.title = '✅ Break Auto-Scheduled';
        suggestion.description = `A ${breakDuration}-minute break has been added to your calendar at ${slot.start.toLocaleTimeString()}.`;

        this.autoScheduledEvents.set(suggestion.id, result?.id);

        auditLog.addEntry(
          'AUTO_SCHEDULE',
          'success',
          `Break auto-scheduled after ${Math.round(focusDurationMinutes)}min focus`,
          {
            focusDuration: focusDurationMinutes,
            breakDuration,
            start: slot.start.toISOString(),
            calendarEventId: result?.id
          }
        );
      } catch (error) {
        auditLog.addEntry(
          'ERROR',
          'error',
          'Failed to auto-schedule break',
          { error: String(error) }
        );
      }
    } else {
      auditLog.addEntry(
        'AI_SUGGESTION',
        'info',
        `Break suggested after ${Math.round(focusDurationMinutes)}min focus`,
        { focusDuration: focusDurationMinutes, breakDuration, autoScheduleEnabled: false }
      );
    }

    this.addSuggestion(suggestion);
    return suggestion;
  }

  /**
   * Schedule a focus block
   */
  async scheduleFocusBlock(
    taskName?: string,
    durationMinutes?: number
  ): Promise<PlannerSuggestion | null> {
    const duration = durationMinutes || this.config.defaultFocusBlockDuration;
    const now = new Date();

    // Find next available slot
    const slot = this.findNextAvailableSlot(duration, now);

    if (!slot) {
      auditLog.addEntry(
        'AI_SUGGESTION',
        'warning',
        'Could not find available slot for focus block',
        { duration }
      );
      return null;
    }

    const suggestion: PlannerSuggestion = {
      id: generateId(),
      type: 'FOCUS_BLOCK',
      priority: 'medium',
      title: taskName ? `🎯 Focus: ${taskName}` : '🎯 Focus Block',
      description: `${duration}-minute focus session${taskName ? ` for "${taskName}"` : ''} starting at ${slot.start.toLocaleTimeString()}.`,
      action: {
        type: this.config.autoScheduleFocusBlocks ? 'auto_scheduled' : 'create_event',
        payload: {
          summary: taskName ? `🎯 Focus: ${taskName}` : '🎯 Focus Block',
          description: 'Dedicated focus time for deep work',
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          durationMinutes: duration,
          colorId: '7' // Cyan for focus
        }
      },
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60000).toISOString()
    };

    // Auto-schedule if enabled
    if (this.config.autoScheduleFocusBlocks && this.calendarService && !this.config.requireConfirmation) {
      try {
        const result = await this.calendarService.createEvent({
          summary: suggestion.action!.payload.summary,
          description: suggestion.action!.payload.description,
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          colorId: '7'
        });

        suggestion.autoScheduled = true;
        suggestion.calendarEventId = result?.id;
        suggestion.type = 'AUTO_SCHEDULED';
        suggestion.title = `✅ Focus Block Scheduled`;
        suggestion.description = `A ${duration}-minute focus block has been added to your calendar at ${slot.start.toLocaleTimeString()}.`;

        this.autoScheduledEvents.set(suggestion.id, result?.id);

        auditLog.addEntry(
          'AUTO_SCHEDULE',
          'success',
          'Focus block auto-scheduled',
          {
            duration,
            start: slot.start.toISOString(),
            calendarEventId: result?.id,
            taskName
          }
        );
      } catch (error) {
        auditLog.addEntry(
          'ERROR',
          'error',
          'Failed to auto-schedule focus block',
          { error: String(error) }
        );
      }
    }

    this.addSuggestion(suggestion);
    return suggestion;
  }

  /**
   * Cancel an auto-scheduled event
   */
  async cancelAutoScheduledEvent(suggestionId: string): Promise<boolean> {
    const eventId = this.autoScheduledEvents.get(suggestionId);
    if (!eventId || !this.calendarService) return false;

    try {
      await this.calendarService.deleteEvent(eventId);
      this.autoScheduledEvents.delete(suggestionId);

      const suggestion = this.suggestions.find(s => s.id === suggestionId);
      if (suggestion) {
        suggestion.dismissed = true;
      }

      auditLog.addEntry(
        'AUTO_SCHEDULE',
        'info',
        'Auto-scheduled event cancelled',
        { suggestionId, calendarEventId: eventId }
      );

      this.notifyListeners();
      return true;
    } catch (error) {
      auditLog.addEntry(
        'ERROR',
        'error',
        'Failed to cancel auto-scheduled event',
        { error: String(error), eventId }
      );
      return false;
    }
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
        this.ensureBreakAfterFocus(focusDuration, this.lastFocusTask);
      }
    }

    // Check for upcoming anchors that need reminders
    this.checkAnchorReminders(now);

    // Check for friction patterns
    if (this.config.enableFrictionDetection) {
      this.checkFrictionPatterns(now);
    }

    // Check for unscheduled time (suggest focus blocks)
    this.checkUnscheduledTasks(now);

    // Clean up expired suggestions
    this.cleanupSuggestions();

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Suggest reflection/journaling during reflective hours
   */
  private suggestReflection(): void {
    const existingReflection = this.suggestions.find(
      s => s.type === 'REFLECTION_REMINDER' && !s.dismissed
    );
    if (existingReflection) return;

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
        expiresAt: new Date(Date.now() + 3 * 60 * 60000).toISOString()
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

    const overdueCount = todayCheckIns.filter(c => {
      if (c.done) return false;
      const slotTime = new Date(c.slot).getTime();
      return slotTime < now.getTime() - 15 * 60000;
    }).length;

    if (overdueCount >= this.config.frictionThreshold) {
      const existingWarning = this.suggestions.find(
        s => s.type === 'FRICTION_WARNING' && !s.dismissed
      );
      if (existingWarning) return;

      const slot = this.findNextAvailableSlot(10, now);

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
            start: slot?.start.toISOString(),
            end: slot?.end.toISOString(),
            durationMinutes: 10,
            colorId: '11'
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
        { overdueCount, frictionThreshold: this.config.frictionThreshold }
      );
    }
  }

  /**
   * Check for unscheduled time and suggest focus blocks
   */
  private checkUnscheduledTasks(now: Date): void {
    if (this.currentRhythmState !== 'OPEN') return;

    const hour = now.getHours();
    const { start: workStart, end: workEnd } = this.config.workingHours;

    // Only suggest during working hours
    if (hour < workStart || hour >= workEnd) return;

    const upcomingToday = this.checkIns.filter(c => {
      if (c.done) return false;
      const slotTime = new Date(c.slot);
      if (!sameDay(slotTime, now)) return false;
      return slotTime.getTime() > now.getTime();
    });

    // If there's no upcoming tasks, suggest a focus block
    if (upcomingToday.length === 0) {
      const existingSuggestion = this.suggestions.find(
        s => s.type === 'FOCUS_BLOCK' && !s.dismissed
      );
      if (existingSuggestion) return;

      const slot = this.findNextAvailableSlot(this.config.defaultFocusBlockDuration, now);
      if (!slot) return;

      const suggestion: PlannerSuggestion = {
        id: generateId(),
        type: 'FOCUS_BLOCK',
        priority: 'low',
        title: '🎯 Open Time Available',
        description: `You have unscheduled time. Consider adding a ${this.config.defaultFocusBlockDuration}-minute focus block.`,
        action: {
          type: 'create_event',
          payload: {
            summary: '🎯 Focus Block',
            description: 'Dedicated focus time',
            start: slot.start.toISOString(),
            end: slot.end.toISOString(),
            durationMinutes: this.config.defaultFocusBlockDuration,
            colorId: '7'
          }
        },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60000).toISOString()
      };

      this.addSuggestion(suggestion);
    }
  }

  /**
   * Add a suggestion to the list
   */
  private addSuggestion(suggestion: PlannerSuggestion): void {
    // Check if we already have a similar suggestion
    const existing = this.suggestions.find(s =>
      s.type === suggestion.type && !s.dismissed
    );
    if (existing && suggestion.type !== 'ANCHOR_REMINDER') return;

    this.suggestions.push(suggestion);

    // Trim to max suggestions
    if (this.suggestions.length > this.config.maxActiveSuggestions) {
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
    const slot = this.findNextAvailableSlot(this.config.defaultBreakDuration);
    const start = slot?.start || new Date(Date.now() + 5 * 60000);
    const end = slot?.end || new Date(start.getTime() + this.config.defaultBreakDuration * 60000);

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
  generateFocusBlock(taskName?: string, durationMinutes?: number): {
    summary: string;
    description: string;
    start: Date;
    end: Date;
    colorId: string;
  } {
    const duration = durationMinutes || this.config.defaultFocusBlockDuration;
    const slot = this.findNextAvailableSlot(duration);
    const start = slot?.start || new Date();
    const end = slot?.end || new Date(start.getTime() + duration * 60000);

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
    context += `- Auto-scheduling: ${this.config.autoScheduleEnabled ? 'enabled' : 'disabled'}\n`;
    context += `- Active Suggestions: ${active.length}\n`;

    if (active.length > 0) {
      context += `- Top Priority: ${active[0].title}\n`;
      context += `- Types: ${active.map(s => s.type).join(', ')}\n`;
    }

    if (this.lastFocusStart) {
      const focusDuration = (Date.now() - this.lastFocusStart.getTime()) / 60000;
      context += `- Current focus duration: ${Math.round(focusDuration)} minutes\n`;
      context += `- Break threshold: ${this.config.focusBreakThreshold} minutes\n`;
    }

    return context;
  }

  /**
   * Get config
   */
  getConfig(): PlannerConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create a rhythm planner
 */
export function createRhythmPlanner(config?: Partial<PlannerConfig>): RhythmPlanner {
  return new RhythmPlanner(config);
}

export default RhythmPlanner;
