export type LocationStatus = 'pending' | 'prompt' | 'granted' | 'denied';

export const LOCATION_STATUSES = {
  pending: 'pending',
  prompt: 'prompt',
  granted: 'granted',
  denied: 'denied',
} as const;

export type TabKey = 'list' | 'calendar' | 'map';

export const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;
