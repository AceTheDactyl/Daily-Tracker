/**
 * Notification Service
 *
 * Handles browser and mobile notifications for:
 * - Anchor reminders
 * - Focus break alerts
 * - Rhythm state changes
 * - Auto-scheduled event notifications
 *
 * Supports:
 * - Desktop browsers (Chrome, Firefox, Safari, Edge)
 * - iOS Safari (with PWA support)
 * - Android Chrome/Firefox
 */

import { auditLog } from './auditLog';

/**
 * Notification types
 */
export type NotificationType =
  | 'anchor_reminder'
  | 'break_reminder'
  | 'focus_start'
  | 'focus_end'
  | 'friction_warning'
  | 'auto_scheduled'
  | 'rhythm_state_change'
  | 'daily_summary'
  | 'music_reminder'
  | 'music_session_start';

/**
 * Notification payload
 */
export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

/**
 * Notification action button
 */
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Permission status
 */
export type PermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Platform detection
 */
export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isPWA: boolean;
  supportsNotifications: boolean;
  supportsPush: boolean;
}

/**
 * Notification preferences (persisted)
 */
export interface NotificationPreferences {
  enabled: boolean;
  anchorReminders: boolean;
  breakReminders: boolean;
  focusAlerts: boolean;
  frictionWarnings: boolean;
  autoScheduledAlerts: boolean;
  rhythmStateChanges: boolean;
  dailySummary: boolean;
  musicReminders: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: number; // 24h format
  quietHoursEnd: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  anchorReminders: true,
  breakReminders: true,
  focusAlerts: true,
  frictionWarnings: true,
  autoScheduledAlerts: true,
  rhythmStateChanges: false, // Off by default to avoid spam
  dailySummary: true,
  musicReminders: true,
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  soundEnabled: true,
  vibrationEnabled: true
};

const STORAGE_KEY = 'pulse-notification-prefs';

/**
 * Detect platform capabilities
 */
function detectPlatform(): PlatformInfo {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua);
  const isChrome = /chrome/.test(ua) && !/edge/.test(ua);
  const isFirefox = /firefox/.test(ua);

  // Check if running as PWA (standalone mode)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // Check notification support
  const supportsNotifications = 'Notification' in window;

  // Check push support (service worker + push manager)
  const supportsPush = 'serviceWorker' in navigator && 'PushManager' in window;

  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    isPWA,
    supportsNotifications,
    supportsPush
  };
}

/**
 * Generate unique notification ID
 */
const generateId = (): string =>
  `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Default notification icons
 */
const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  anchor_reminder: '⚓',
  break_reminder: '💤',
  focus_start: '🎯',
  focus_end: '✅',
  friction_warning: '⚡',
  auto_scheduled: '📅',
  rhythm_state_change: '🌊',
  daily_summary: '📊',
  music_reminder: '🎵',
  music_session_start: '🎶'
};

/**
 * Notification Service Class
 */
class NotificationService {
  private platform: PlatformInfo;
  private preferences: NotificationPreferences;
  private permissionStatus: PermissionStatus = 'default';
  private scheduledNotifications: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Set<(notification: NotificationPayload) => void> = new Set();
  private permissionListeners: Set<(status: PermissionStatus) => void> = new Set();

  constructor() {
    this.platform = detectPlatform();
    this.preferences = this.loadPreferences();
    this.checkPermissionStatus();
  }

  /**
   * Load preferences from storage
   */
  private loadPreferences(): NotificationPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load notification preferences:', e);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  /**
   * Save preferences to storage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (e) {
      console.error('Failed to save notification preferences:', e);
    }
  }

  /**
   * Check current permission status
   */
  private checkPermissionStatus(): void {
    if (!this.platform.supportsNotifications) {
      this.permissionStatus = 'unsupported';
      return;
    }

    this.permissionStatus = Notification.permission as PermissionStatus;
  }

  /**
   * Get platform info
   */
  getPlatform(): PlatformInfo {
    return { ...this.platform };
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): PermissionStatus {
    return this.permissionStatus;
  }

  /**
   * Get preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  updatePreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    this.savePreferences();

    auditLog.addEntry(
      'PROFILE_UPDATED',
      'info',
      'Notification preferences updated',
      { changed: Object.keys(prefs) }
    );
  }

  /**
   * Request notification permission
   * Handles platform-specific requirements
   */
  async requestPermission(): Promise<PermissionStatus> {
    if (!this.platform.supportsNotifications) {
      auditLog.addEntry(
        'ERROR',
        'warning',
        'Notifications not supported on this platform',
        { platform: this.platform }
      );
      return 'unsupported';
    }

    // Check if already granted
    if (Notification.permission === 'granted') {
      this.permissionStatus = 'granted';
      this.notifyPermissionListeners();
      return 'granted';
    }

    // Check if already denied (can't request again)
    if (Notification.permission === 'denied') {
      this.permissionStatus = 'denied';
      this.notifyPermissionListeners();

      auditLog.addEntry(
        'ERROR',
        'warning',
        'Notification permission previously denied',
        { platform: this.platform }
      );
      return 'denied';
    }

    try {
      // Request permission
      const result = await Notification.requestPermission();
      this.permissionStatus = result as PermissionStatus;
      this.notifyPermissionListeners();

      auditLog.addEntry(
        result === 'granted' ? 'SYSTEM_INIT' : 'ERROR',
        result === 'granted' ? 'success' : 'warning',
        `Notification permission ${result}`,
        { platform: this.platform }
      );

      return this.permissionStatus;
    } catch (error) {
      console.error('Failed to request notification permission:', error);

      auditLog.addEntry(
        'ERROR',
        'error',
        'Failed to request notification permission',
        { error: String(error) }
      );

      return 'denied';
    }
  }

  /**
   * Check if we're in quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.preferences.quietHoursEnabled) return false;

    const now = new Date();
    const hour = now.getHours();
    const { quietHoursStart, quietHoursEnd } = this.preferences;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (quietHoursStart > quietHoursEnd) {
      return hour >= quietHoursStart || hour < quietHoursEnd;
    }

    return hour >= quietHoursStart && hour < quietHoursEnd;
  }

  /**
   * Check if notification type is enabled
   */
  private isTypeEnabled(type: NotificationType): boolean {
    if (!this.preferences.enabled) return false;

    switch (type) {
      case 'anchor_reminder':
        return this.preferences.anchorReminders;
      case 'break_reminder':
        return this.preferences.breakReminders;
      case 'focus_start':
      case 'focus_end':
        return this.preferences.focusAlerts;
      case 'friction_warning':
        return this.preferences.frictionWarnings;
      case 'auto_scheduled':
        return this.preferences.autoScheduledAlerts;
      case 'rhythm_state_change':
        return this.preferences.rhythmStateChanges;
      case 'daily_summary':
        return this.preferences.dailySummary;
      case 'music_reminder':
      case 'music_session_start':
        return this.preferences.musicReminders;
      default:
        return true;
    }
  }

  /**
   * Show a notification
   */
  async show(payload: Omit<NotificationPayload, 'id'>): Promise<string | null> {
    const id = generateId();
    const fullPayload: NotificationPayload = { ...payload, id };

    // Check if notifications are enabled and type is allowed
    if (!this.isTypeEnabled(payload.type)) {
      return null;
    }

    // Check quiet hours (allow friction warnings through)
    if (this.isQuietHours() && payload.type !== 'friction_warning') {
      auditLog.addEntry(
        'AI_SUGGESTION',
        'info',
        'Notification suppressed during quiet hours',
        { type: payload.type, title: payload.title }
      );
      return null;
    }

    // Check permission
    if (this.permissionStatus !== 'granted') {
      // Notify in-app listeners even if browser notifications aren't available
      this.notifyListeners(fullPayload);
      return id;
    }

    try {
      // Create browser notification
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/badge-72.png',
        tag: payload.tag || payload.type,
        data: payload.data,
        requireInteraction: payload.requireInteraction ?? false,
        silent: payload.silent ?? !this.preferences.soundEnabled
      });

      // Handle click
      notification.onclick = () => {
        window.focus();
        notification.close();

        // Trigger any data-specific actions
        if (payload.data?.action) {
          this.handleNotificationAction(payload.data.action, payload.data);
        }
      };

      // Vibration for mobile (if supported and enabled)
      if (this.preferences.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // Log the notification
      auditLog.addEntry(
        'AI_SUGGESTION',
        'info',
        `Notification sent: ${payload.title}`,
        { type: payload.type, id }
      );

      // Notify in-app listeners
      this.notifyListeners(fullPayload);

      return id;
    } catch (error) {
      console.error('Failed to show notification:', error);

      // Still notify in-app listeners
      this.notifyListeners(fullPayload);

      return id;
    }
  }

  /**
   * Handle notification action clicks
   */
  private handleNotificationAction(action: string, data: Record<string, any>): void {
    auditLog.addEntry(
      'AI_INTERVENTION',
      'info',
      `Notification action triggered: ${action}`,
      { data }
    );

    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('notification-action', {
      detail: { action, data }
    }));
  }

  /**
   * Schedule a notification for later
   */
  scheduleNotification(
    payload: Omit<NotificationPayload, 'id'>,
    triggerAt: Date
  ): string {
    const id = generateId();
    const delay = triggerAt.getTime() - Date.now();

    if (delay <= 0) {
      // Trigger immediately
      this.show(payload);
      return id;
    }

    const timeout = setTimeout(() => {
      this.show(payload);
      this.scheduledNotifications.delete(id);
    }, delay);

    this.scheduledNotifications.set(id, timeout);

    auditLog.addEntry(
      'AI_SUGGESTION',
      'info',
      `Notification scheduled: ${payload.title}`,
      { type: payload.type, triggerAt: triggerAt.toISOString(), id }
    );

    return id;
  }

  /**
   * Cancel a scheduled notification
   */
  cancelScheduledNotification(id: string): boolean {
    const timeout = this.scheduledNotifications.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledNotifications.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Cancel all scheduled notifications
   */
  cancelAllScheduled(): void {
    this.scheduledNotifications.forEach(timeout => clearTimeout(timeout));
    this.scheduledNotifications.clear();
  }

  /**
   * Subscribe to notification events (in-app)
   */
  subscribe(listener: (notification: NotificationPayload) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to permission changes
   */
  subscribeToPermission(listener: (status: PermissionStatus) => void): () => void {
    this.permissionListeners.add(listener);
    return () => this.permissionListeners.delete(listener);
  }

  /**
   * Notify in-app listeners
   */
  private notifyListeners(notification: NotificationPayload): void {
    this.listeners.forEach(listener => listener(notification));
  }

  /**
   * Notify permission listeners
   */
  private notifyPermissionListeners(): void {
    this.permissionListeners.forEach(listener => listener(this.permissionStatus));
  }

  // ========================================
  // Convenience methods for common notifications
  // ========================================

  /**
   * Send anchor reminder
   */
  sendAnchorReminder(taskName: string, minutesUntil: number, anchorId?: string): Promise<string | null> {
    return this.show({
      type: 'anchor_reminder',
      title: `${NOTIFICATION_ICONS.anchor_reminder} Anchor Starting Soon`,
      body: `"${taskName}" starts in ${minutesUntil} minutes`,
      tag: `anchor-${anchorId || taskName}`,
      requireInteraction: true,
      data: { action: 'view_anchor', anchorId, taskName }
    });
  }

  /**
   * Send break reminder
   */
  sendBreakReminder(focusDuration: number, breakDuration: number): Promise<string | null> {
    return this.show({
      type: 'break_reminder',
      title: `${NOTIFICATION_ICONS.break_reminder} Time for a Break`,
      body: `You've been focused for ${focusDuration} minutes. Take a ${breakDuration}-minute break.`,
      tag: 'break-reminder',
      requireInteraction: true,
      data: { action: 'start_break', focusDuration, breakDuration }
    });
  }

  /**
   * Send focus start notification
   */
  sendFocusStart(taskName?: string): Promise<string | null> {
    return this.show({
      type: 'focus_start',
      title: `${NOTIFICATION_ICONS.focus_start} Focus Session Started`,
      body: taskName ? `Starting focus on: ${taskName}` : 'Entering focus mode',
      tag: 'focus-session',
      data: { action: 'view_focus', taskName }
    });
  }

  /**
   * Send focus end notification
   */
  sendFocusEnd(duration: number, taskName?: string): Promise<string | null> {
    return this.show({
      type: 'focus_end',
      title: `${NOTIFICATION_ICONS.focus_end} Focus Session Complete`,
      body: taskName
        ? `Completed ${duration} minutes on "${taskName}"`
        : `Completed ${duration} minute focus session`,
      tag: 'focus-session',
      data: { action: 'complete_focus', duration, taskName }
    });
  }

  /**
   * Send friction warning
   */
  sendFrictionWarning(overdueCount: number): Promise<string | null> {
    return this.show({
      type: 'friction_warning',
      title: `${NOTIFICATION_ICONS.friction_warning} Schedule Friction`,
      body: `${overdueCount} tasks are overdue. Consider regrouping.`,
      tag: 'friction-warning',
      requireInteraction: true,
      data: { action: 'view_overdue', overdueCount }
    });
  }

  /**
   * Send auto-scheduled notification
   */
  sendAutoScheduled(eventType: string, time: string): Promise<string | null> {
    return this.show({
      type: 'auto_scheduled',
      title: `${NOTIFICATION_ICONS.auto_scheduled} Event Auto-Scheduled`,
      body: `${eventType} added to your calendar at ${time}`,
      tag: 'auto-scheduled',
      data: { action: 'view_calendar', eventType, time }
    });
  }

  /**
   * Send daily summary with full DeltaHV metric breakdown
   */
  sendDailySummary(stats: {
    completed: number;
    total: number;
    rhythmScore: number;
    deltaHV: number;
    symbolic?: number;
    resonance?: number;
    friction?: number;
    stability?: number;
    fieldState?: string;
  }): Promise<string | null> {
    const completionRate = stats.total > 0
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

    // Build comprehensive summary with metric breakdown
    let body = `${stats.completed}/${stats.total} tasks (${completionRate}%) | ΔHV: ${stats.deltaHV}%`;

    // Add metric breakdown if available
    if (stats.symbolic !== undefined) {
      body = `✨S:${stats.symbolic} 🎯R:${stats.resonance} 🌧️δφ:${stats.friction} ⚖️H:${stats.stability}\n`;
      body += `${stats.completed}/${stats.total} beats | ${stats.fieldState || 'active'}`;
    }

    return this.show({
      type: 'daily_summary',
      title: `${NOTIFICATION_ICONS.daily_summary} Daily Rhythm Summary`,
      body,
      tag: 'daily-summary',
      data: { action: 'view_summary', stats }
    });
  }

  /**
   * Send metric alert when a specific metric crosses a threshold
   * Useful for real-time metric-driven interventions
   */
  sendMetricAlert(
    metric: 'symbolic' | 'resonance' | 'friction' | 'stability',
    value: number,
    threshold: number,
    direction: 'above' | 'below'
  ): Promise<string | null> {
    const metricLabels = {
      symbolic: { icon: '✨', name: 'Symbolic (S)', goodDirection: 'above' },
      resonance: { icon: '🎯', name: 'Resonance (R)', goodDirection: 'above' },
      friction: { icon: '🌧️', name: 'Friction (δφ)', goodDirection: 'below' },
      stability: { icon: '⚖️', name: 'Stability (H)', goodDirection: 'above' },
    };

    const info = metricLabels[metric];
    const isGood = info.goodDirection === direction;

    const title = isGood
      ? `${info.icon} ${info.name} Improving!`
      : `${info.icon} ${info.name} Alert`;

    const body = direction === 'above'
      ? `${info.name} has risen to ${value}% (threshold: ${threshold}%)`
      : `${info.name} has dropped to ${value}% (threshold: ${threshold}%)`;

    return this.show({
      type: 'rhythm_state_change',
      title,
      body,
      tag: `metric-alert-${metric}`,
      requireInteraction: !isGood,
      data: { action: 'view_metrics', metric, value, threshold, direction }
    });
  }

  /**
   * Send field state change notification
   * Triggered when the DeltaHV field state transitions
   */
  sendFieldStateChange(
    newState: 'coherent' | 'transitioning' | 'fragmented' | 'dormant',
    previousState: string,
    deltaHV: number
  ): Promise<string | null> {
    const stateInfo = {
      coherent: { emoji: '🌟', message: 'Your rhythm is coherent and aligned!' },
      transitioning: { emoji: '🌊', message: 'Your rhythm is in transition. Stay mindful.' },
      fragmented: { emoji: '⚡', message: 'Your rhythm has become fragmented. Time to recenter.' },
      dormant: { emoji: '🌙', message: 'Your rhythm field is dormant. Awaiting activation.' },
    };

    const info = stateInfo[newState];

    return this.show({
      type: 'rhythm_state_change',
      title: `${info.emoji} Rhythm Field: ${newState}`,
      body: `${info.message} (ΔHV: ${deltaHV}%)`,
      tag: 'field-state-change',
      requireInteraction: newState === 'fragmented',
      data: { action: 'view_metrics', newState, previousState, deltaHV }
    });
  }

  /**
   * Send music selection reminder
   * Triggered when a meditation beat is scheduled or when daily music not selected
   */
  sendMusicReminder(beatName?: string, scheduledTime?: string): Promise<string | null> {
    const body = beatName
      ? `Select your emotional music for "${beatName}"${scheduledTime ? ` at ${scheduledTime}` : ''}`
      : 'Choose your emotional music focus for today\'s meditation sessions';

    return this.show({
      type: 'music_reminder',
      title: `${NOTIFICATION_ICONS.music_reminder} Music Meditation`,
      body,
      tag: 'music-reminder',
      requireInteraction: true,
      data: { action: 'open_music_library', beatName, scheduledTime }
    });
  }

  /**
   * Send music session starting notification
   * Triggered when a meditation beat with music is about to start
   */
  sendMusicSessionStart(trackName: string, emotionCategory: string, minutesUntil: number): Promise<string | null> {
    return this.show({
      type: 'music_session_start',
      title: `${NOTIFICATION_ICONS.music_session_start} Music Session Starting`,
      body: `"${trackName}" (${emotionCategory}) starts in ${minutesUntil} minutes`,
      tag: 'music-session',
      requireInteraction: true,
      data: { action: 'start_music_session', trackName, emotionCategory }
    });
  }

  /**
   * Get iOS-specific permission instructions
   */
  getIOSInstructions(): string {
    if (!this.platform.isIOS) return '';

    if (this.platform.isPWA) {
      return 'Tap the notification bell to enable push notifications for this app.';
    }

    return 'To receive notifications:\n' +
      '1. Tap the Share button (square with arrow)\n' +
      '2. Select "Add to Home Screen"\n' +
      '3. Open the app from your home screen\n' +
      '4. Enable notifications when prompted';
  }

  /**
   * Get Android-specific permission instructions
   */
  getAndroidInstructions(): string {
    if (!this.platform.isAndroid) return '';

    if (this.permissionStatus === 'denied') {
      return 'Notifications were denied. To enable:\n' +
        '1. Open your device Settings\n' +
        '2. Go to Apps > Rhythm Pulse\n' +
        '3. Tap Notifications\n' +
        '4. Enable "Allow notifications"';
    }

    return 'Tap "Allow" when prompted to receive rhythm notifications.';
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export for testing
export { NotificationService, DEFAULT_PREFERENCES as DEFAULT_NOTIFICATION_PREFERENCES };
