export const queryKeys = {
  announcements: (batchId?: string | null) => ['announcements', batchId ?? 'all'] as const,
  eventById: (id: string) => ['events', 'detail', id] as const,
  eventRegistrations: (eventId?: string | null) => ['registrations', 'event', eventId ?? 'none'] as const,
  eventSearch: (query: string, options?: { committees?: string[]; clubs?: string[]; batchId?: string | null }) => ['events', 'search', query, JSON.stringify(options ?? {})] as const,
  registrationCounts: (eventIds: string[]) => ['registrations', 'counts', [...eventIds].sort().join(',')] as const,
  registeredEvents: (userId?: string | null) => ['events', 'registered', userId ?? 'guest'] as const,
  repository: ['repository'] as const,
  upcomingEvents: (limit = 6, batchId?: string | null) => ['events', 'upcoming', limit, batchId ?? 'all'] as const,
  userRegistrations: (userId?: string | null) => ['registrations', 'user', userId ?? 'guest'] as const,
  winners: (batchId?: string | null) => ['winners', batchId ?? 'all'] as const,
  users: ['users'] as const,
  supportTickets: (userId?: string | null) => ['support', userId ?? 'all'] as const,
};

