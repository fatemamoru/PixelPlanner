import { createContext, useContext } from 'react';
import type { SessionService } from '../services/sessionService';
import type { PostService } from '../services/postService';
import type { CalendarService } from '../services/calendarService';
import type { ReminderService } from '../services/reminderService';
import type { ContentRecommendationEngine } from '../core/engine';
import type { MarketingService } from '../domain/types';

export interface AppServices {
  session: SessionService;
  posts: PostService;
  calendar: CalendarService;
  reminders: ReminderService;
  engine: ContentRecommendationEngine;
  loadServices: () => Promise<MarketingService[]>;
  loadPreference: (key: string) => Promise<string | null>;
  savePreference: (key: string, value: string) => Promise<void>;
  usingFallback: boolean;
}

export const AppContext = createContext<AppServices | null>(null);

export function useServices(): AppServices {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useServices must be used within AppContext.Provider');
  return ctx;
}
