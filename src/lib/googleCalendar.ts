// Google Calendar API Configuration
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

interface GoogleCalendarConfig {
  apiKey: string;
  clientId: string;
  calendarId: string;
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export class GoogleCalendarService {
  private tokenClient: any;
  private config: GoogleCalendarConfig;

  constructor(config: GoogleCalendarConfig) {
    this.config = config;
  }

  async initialize() {
    await this.loadGoogleScripts();
    await this.initializeGapi();
    this.initializeGis();
  }

  private loadGoogleScripts(): Promise<void> {
    return new Promise((resolve) => {
      let gapiLoaded = false;
      let gisLoaded = false;

      const checkBothLoaded = () => {
        if (gapiLoaded && gisLoaded) {
          resolve();
        }
      };

      // Load Google API script
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => {
        window.gapi.load('client', async () => {
          gapiLoaded = true;
          checkBothLoaded();
        });
      };
      document.body.appendChild(gapiScript);

      // Load Google Identity Services script
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => {
        gisLoaded = true;
        checkBothLoaded();
      };
      document.body.appendChild(gisScript);
    });
  }

  private async initializeGapi() {
    await window.gapi.client.init({
      apiKey: this.config.apiKey,
      discoveryDocs: [DISCOVERY_DOC],
    });
  }

  private initializeGis() {
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.config.clientId,
      scope: SCOPES,
      callback: '', // defined later
    });
  }

  async authenticate(): Promise<boolean> {
    return new Promise((resolve) => {
      this.tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
          resolve(false);
          return;
        }
        resolve(true);
      };

      if (window.gapi.client.getToken() === null) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  async createEvent(event: {
    summary: string;
    description?: string;
    start: string; // ISO datetime
    end: string; // ISO datetime
    colorId?: string;
  }) {
    const response = await window.gapi.client.calendar.events.insert({
      calendarId: this.config.calendarId,
      resource: {
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.start,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.end,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: event.colorId || '1',
      },
    });
    return response.result;
  }

  async listEvents(timeMin: string, timeMax: string) {
    const response = await window.gapi.client.calendar.events.list({
      calendarId: this.config.calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return response.result.items || [];
  }

  async deleteEvent(eventId: string) {
    await window.gapi.client.calendar.events.delete({
      calendarId: this.config.calendarId,
      eventId: eventId,
    });
  }

  async updateEvent(eventId: string, updates: any) {
    const response = await window.gapi.client.calendar.events.patch({
      calendarId: this.config.calendarId,
      eventId: eventId,
      resource: updates,
    });
    return response.result;
  }
}
