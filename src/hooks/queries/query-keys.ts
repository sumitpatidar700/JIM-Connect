export const queryKeys = {
  announcements: ['announcements'] as const,
  eventById: (id: string) => ['events', 'detail', id] as const,
  eventRegistrations: (eventId?: string | null) => ['registrations', 'event', eventId ?? 'none'] as const,
  eventSearch: (query: string, options?: { committees?: string[]; clubs?: string[] }) => ['events', 'search', query, JSON.stringify(options ?? {})] as const,
  registrationCounts: (eventIds: string[]) => ['registrations', 'counts', [...eventIds].sort().join(',')] as const,
  registeredEvents: (userId?: string | null) => ['events', 'registered', userId ?? 'guest'] as const,
  repository: ['repository'] as const,
  upcomingEvents: (limit = 6) => ['events', 'upcoming', limit] as const,
  userRegistrations: (userId?: string | null) => ['registrations', 'user', userId ?? 'guest'] as const,
  winners: ['winners'] as const,
  users: ['users'] as const,
  supportTickets: (userId?: string | null) => ['support', userId ?? 'all'] as const,
};

