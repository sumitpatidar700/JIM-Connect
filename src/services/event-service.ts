import { RealtimeChannel } from '@supabase/supabase-js';

import { storageService } from '@/src/services/storage-service';
import { supabase } from '@/src/lib/supabase';
import { sessionService } from '@/src/services/session-service';
import {
  EventItem,
  EventRegistration,
  EventRegistrationWithEvent,
  EventRegistrationWithUser,
} from '@/src/types/app';

type EventPayload = Pick<EventItem, 'created_by' | 'date' | 'description' | 'title' | 'venue'> & {
  imageUri?: string;
  googleDriveLink?: string | null;
  links?: { type?: 'drive' | 'custom'; title: string; url: string }[];
  pdfUri?: string | null;
  maxRegistrations?: string | null;
  registrationUntil?: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  committees?: string[];
  clubs?: string[];
  batchId?: string | null;
};

type EventUpdatePayload = Pick<EventItem, 'date' | 'description' | 'title' | 'venue'> & {
  imageUri?: string;
  googleDriveLink?: string | null;
  links?: { type?: 'drive' | 'custom'; title: string; url: string }[];
  pdfUri?: string | null;
  maxRegistrations?: string | null;
  registrationUntil?: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  committees?: string[];
  clubs?: string[];
  batchId?: string | null;
};

function normalizeEventDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Event date is required.');
  }

  const normalizedInput = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)
    ? trimmed.replace(' ', 'T')
    : trimmed;

  const parsed = new Date(normalizedInput);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Enter a valid event date like 2026-05-12 10:00 or 2026-05-12T10:00:00+05:30.');
  }

  return parsed.toISOString();
}

function normalizeOptionalDate(value?: string) {
  if (!value?.trim()) {
    return null;
  }

  return normalizeEventDate(value);
}

function validateRegistrationDeadline(eventDate: string, registrationUntil: string | null) {
  if (!registrationUntil) {
    return;
  }

  const eventTime = new Date(eventDate).getTime();
  const deadlineTime = new Date(registrationUntil).getTime();
  const now = Date.now();

  if (deadlineTime <= now) {
    throw new Error('Registration deadline must be after the current time.');
  }

  if (deadlineTime >= eventTime) {
    throw new Error('Registration deadline must be before the event date and time.');
  }
}

function normalizeGoogleDriveLink(url?: string | null): string | null {
  if (!url || !url.trim()) {
    return null;
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (!lower.includes("drive.google.com") && !lower.includes("docs.google.com")) {
    throw new Error("Invalid Google Drive link. Please enter a valid URL starting with https://drive.google.com/...");
  }

  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export const eventService = {
  async createEvent(payload: EventPayload, onProgress?: (msg: string) => void) {
    onProgress?.("Validating event data...");
    const date = normalizeEventDate(payload.date);
    const registration_until = normalizeOptionalDate(payload.registrationUntil);
    const google_drive_link = normalizeGoogleDriveLink(payload.googleDriveLink);
    validateRegistrationDeadline(date, registration_until);
    
    onProgress?.("Uploading event banner...");
    const image_url = await storageService.uploadImage('event-assets', 'events', payload.imageUri);
    
    onProgress?.("Uploading document...");
    const pdf_url = payload.pdfUri
      ? await storageService.uploadDocument('event-assets', 'documents', payload.pdfUri)
      : undefined;
      
    onProgress?.("Finalizing event...");
    const max_registrations = payload.maxRegistrations && !Number.isNaN(Number(payload.maxRegistrations))
      ? Number(payload.maxRegistrations)
      : null;
    const activeSession = await sessionService.getActiveSession();
    const { error } = await supabase.from('events').insert({
      created_by: payload.created_by,
      date,
      description: payload.description,
      image_url,
      google_drive_link,
      links: payload.links ?? [],
      pdf_url,
      max_registrations,
      min_team_size: payload.minTeamSize ?? 1,
      max_team_size: payload.maxTeamSize ?? 1,
      registration_until,
      registrations_paused: false,
      title: payload.title,
      venue: payload.venue,
      committees: payload.committees ?? [],
      clubs: payload.clubs ?? [],
      session_id: activeSession?.id ?? null,
      batch_id: payload.batchId ?? null,
    });
    if (error) {
      throw error;
    }
  },

  async deleteEvent(id: string) {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      throw error;
    }
  },

  async getEventById(id: string): Promise<EventItem | null> {
    const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
    if (error) {
      throw error;
    }
    return data;
  },

  async listRegisteredEvents(userId: string): Promise<EventRegistration[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, inviter:users!registrations_invited_by_fkey(name, email, avatar_url, phone), event_teams(id, name, leader_id, registrations(id, user_id, status, users!registrations_user_id_fkey(name, avatar_url, email)))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return data ?? [];
  },
  async listRecentRegistrations(limit = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from("registrations")
      .select("*, users!registrations_user_id_fkey(name, email, avatar_url, phone), events(title)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  async listRegistrationsForEvent(eventId: string): Promise<EventRegistrationWithUser[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, users!registrations_user_id_fkey(name, email, avatar_url, phone), event_teams(id, name, leader_id)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  async listRegistrationCounts(eventIds: string[]): Promise<Record<string, number>> {
    if (eventIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase.rpc('registration_counts_for_events', {
      event_ids: eventIds,
    });
    if (error) {
      throw error;
    }

    const rows = (data ?? []) as { event_id: string; total: number | string }[];

    return rows.reduce<Record<string, number>>((counts, registration) => {
      counts[registration.event_id] = Number(registration.total);
      return counts;
    }, {});
  },

  async listGroupCounts(eventIds: string[]): Promise<Record<string, number>> {
    if (eventIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase.rpc('group_counts_for_events', {
      event_ids: eventIds,
    });
    if (error) {
      throw error;
    }

    const rows = (data ?? []) as { event_id: string; total_groups: number | string }[];

    return rows.reduce<Record<string, number>>((counts, item) => {
      counts[item.event_id] = Number(item.total_groups);
      return counts;
    }, {});
  },

  async listUpcomingEvents({ limit = 6, batchId }: { limit?: number; batchId?: string | null } = {}): Promise<EventItem[]> {
    const activeSession = await sessionService.getActiveSession();
    let query = supabase.from('events').select('*').gte('date', new Date().toISOString());
    
    if (activeSession) {
      query = query.eq('session_id', activeSession.id);
    }

    if (batchId !== undefined) {
      if (batchId === null) {
        query = query.is('batch_id', null);
      } else {
        query = query.or(`batch_id.is.null,batch_id.eq.${batchId}`);
      }
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .limit(limit);
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  async listUserRegistrationsDetailed(userId: string): Promise<EventRegistrationWithEvent[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, inviter:users!registrations_invited_by_fkey(name, email, avatar_url, phone), events(title, date, venue, max_team_size), event_teams(id, name, leader_id, registrations(id, user_id, status, users!registrations_user_id_fkey(name, avatar_url, email)))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  async registerForEvent(userId: string, eventId: string, phone: string) {
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length !== 10) {
      throw new Error('Enter a valid 10 digit phone number.');
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('date, registration_until, registrations_paused')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) {
      throw eventError;
    }

    if (!event) {
      throw new Error('This event is no longer available.');
    }

    if (event.registrations_paused) {
      throw new Error('Registrations are paused for this event.');
    }

    const registrationClosesAt = event.registration_until ?? event.date;
    if (new Date(registrationClosesAt).getTime() <= Date.now()) {
      throw new Error('Registration has closed for this event.');
    }

    const { error } = await supabase
      .from('registrations')
      .insert({ event_id: eventId, phone: normalizedPhone, user_id: userId, status: 'accepted' });
    if (error) {
      throw error;
    }
  },

  async registerTeamForEvent(userId: string, eventId: string, teamName: string, leaderPhone: string, invitedEmailsOrPhones: string[]) {
    const normalizedPhone = leaderPhone.replace(/\D/g, '');
    if (normalizedPhone.length !== 10) {
      throw new Error('Enter a valid 10 digit phone number.');
    }

    if (!teamName || !teamName.trim()) {
      throw new Error('Team name is required.');
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('date, registration_until, registrations_paused, max_team_size, min_team_size')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) throw new Error('This event is no longer available.');
    if (event.registrations_paused) throw new Error('Registrations are paused for this event.');

    const registrationClosesAt = event.registration_until ?? event.date;
    if (new Date(registrationClosesAt).getTime() <= Date.now()) {
      throw new Error('Registration has closed for this event.');
    }

    // Insert team
    const { data: team, error: teamError } = await supabase
      .from('event_teams')
      .insert({ event_id: eventId, name: teamName.trim(), leader_id: userId })
      .select()
      .single();

    if (teamError) throw teamError;

    // Insert leader registration
    const { error: leaderError } = await supabase
      .from('registrations')
      .insert({ event_id: eventId, phone: normalizedPhone, user_id: userId, team_id: team.id, status: 'accepted' });

    if (leaderError) throw leaderError;

    // Look up peers and invite
    for (const invitee of invitedEmailsOrPhones) {
      const trimmed = invitee.trim();
      if (!trimmed) continue;

      const { data: matchedUser } = await supabase
        .from('users')
        .select('id, phone')
        .or(`email.eq.${trimmed},phone.eq.${trimmed},id.eq.${trimmed}`)
        .maybeSingle();

      if (matchedUser && matchedUser.id !== userId) {
        await supabase.from('registrations').insert({
          event_id: eventId,
          user_id: matchedUser.id,
          phone: matchedUser.phone || '0000000000',
          team_id: team.id,
          status: 'pending',
          invited_by: userId
        });
      }
    }
  },

  async respondToTeamInvite(registrationId: string, accept: boolean) {
    if (accept) {
      const { error } = await supabase.from('registrations').update({ status: 'accepted' }).eq('id', registrationId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('registrations').delete().eq('id', registrationId);
      if (error) throw error;
    }
  },

  async listPendingInvites(userId: string) {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, events(title, date, venue), event_teams(id, name, leader_id, registrations(id, user_id, status, users!registrations_user_id_fkey(name, avatar_url, email))), inviter:users!registrations_invited_by_fkey(name, email, avatar_url, phone)')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data ?? [];
  },

  async removeTeamMember(registrationId: string) {
    const { error } = await supabase.from('registrations').delete().eq('id', registrationId);
    if (error) throw error;
  },

  async addTeamMember(eventId: string, teamId: string, inviterId: string, emailOrPhone: string) {
    const trimmed = emailOrPhone.trim();
    if (!trimmed) throw new Error("Please enter a valid student email or phone number.");

    const { data: event } = await supabase.from('events').select('max_team_size').eq('id', eventId).single();
    const { data: existingRegs } = await supabase.from('registrations').select('id').eq('team_id', teamId);
    if (event && existingRegs && existingRegs.length >= event.max_team_size) {
      throw new Error(`This group has reached the maximum capacity of ${event.max_team_size} members.`);
    }

    const { data: matchedUser, error: matchError } = await supabase
      .from('users')
      .select('id, phone')
      .or(`email.eq.${trimmed},phone.eq.${trimmed}`)
      .maybeSingle();

    if (matchError || !matchedUser) {
      throw new Error("No student found matching that email or phone number.");
    }

    if (matchedUser.id === inviterId) {
      throw new Error("You cannot invite yourself.");
    }

    const { data: dupReg } = await supabase.from('registrations').select('id').eq('event_id', eventId).eq('user_id', matchedUser.id).maybeSingle();
    if (dupReg) {
      throw new Error("This student is already registered or invited to this event.");
    }

    let validPhone = matchedUser.phone;
    if (!validPhone || !/^\d{10}$/.test(validPhone)) {
      validPhone = '0000000000';
    }

    const { error } = await supabase.from('registrations').insert({
      event_id: eventId,
      user_id: matchedUser.id,
      phone: validPhone,
      team_id: teamId,
      status: 'pending',
      invited_by: inviterId
    });

    if (error) throw error;
  },

  async searchEvents(query: string, options?: { committees?: string[]; clubs?: string[]; batchId?: string | null }): Promise<EventItem[]> {
    const activeSession = await sessionService.getActiveSession();
    let builder = supabase.from('events').select('*');

    if (activeSession) {
      builder = builder.eq('session_id', activeSession.id);
    }

    if (options?.batchId !== undefined) {
      if (options.batchId === null) {
        builder = builder.is('batch_id', null);
      } else {
        builder = builder.or(`batch_id.is.null,batch_id.eq.${options.batchId}`);
      }
    }

    builder = builder.order('date', { ascending: true });

    if (query.trim()) {
      // NOTE: Be careful! Mixing .or() for query text search and batch filtering might cause issues in postgrest if not handled correctly.
      // However, Supabase/PostgREST filters are chained as AND unless grouped. Chaining or with separate clauses is fine, but double check.
      // Actually, PostgREST allows adding individual filters. We can use .or() for title/desc/venue, and the query is ANDed with batch_id filters.
      builder = builder.or(
        `title.ilike.%${query.trim()}%,description.ilike.%${query.trim()}%,venue.ilike.%${query.trim()}%`
      );
    }
    
    if (options?.committees && options.committees.length > 0) {
      builder = builder.overlaps('committees', options.committees);
    }
    
    if (options?.clubs && options.clubs.length > 0) {
      builder = builder.overlaps('clubs', options.clubs);
    }

    const { data, error } = await builder;
    if (error) {
      throw error;
    }
    return data ?? [];
  },

  subscribeToEvents(onChange: () => void): RealtimeChannel {
    return supabase
      .channel(`events-feed-${Date.now()}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onChange)
      .subscribe();
  },

  unsubscribe(channel: RealtimeChannel) {
    supabase.removeChannel(channel).catch(() => undefined);
  },

  async updateEvent(id: string, payload: EventUpdatePayload, onProgress?: (msg: string) => void) {
    onProgress?.("Validating event data...");
    const date = normalizeEventDate(payload.date);
    const registration_until = normalizeOptionalDate(payload.registrationUntil);
    const google_drive_link = normalizeGoogleDriveLink(payload.googleDriveLink);
    validateRegistrationDeadline(date, registration_until);
    
    onProgress?.("Uploading event banner...");
    const image_url = payload.imageUri && payload.imageUri !== "remove"
      ? await storageService.uploadImage('event-assets', 'events', payload.imageUri)
      : undefined;
      
    onProgress?.("Uploading document...");
    const pdf_url = payload.pdfUri && payload.pdfUri !== "remove"
      ? await storageService.uploadDocument('event-assets', 'documents', payload.pdfUri)
      : undefined;
      
    onProgress?.("Updating event data...");
    const max_registrations = payload.maxRegistrations && !Number.isNaN(Number(payload.maxRegistrations))
      ? Number(payload.maxRegistrations)
      : null;
    const { error } = await supabase
      .from('events')
      .update({
        date,
        description: payload.description,
        ...(payload.imageUri === "remove" ? { image_url: null } : image_url ? { image_url } : {}),
        ...(payload.pdfUri === "remove" ? { pdf_url: null } : pdf_url ? { pdf_url } : {}),
        ...(max_registrations !== undefined ? { max_registrations } : {}),
        google_drive_link,
        links: payload.links ?? [],
        min_team_size: payload.minTeamSize ?? 1,
        max_team_size: payload.maxTeamSize ?? 1,
        registration_until,
        title: payload.title,
        venue: payload.venue,
        committees: payload.committees ?? [],
        clubs: payload.clubs ?? [],
      })
      .eq('id', id);
    if (error) {
      throw error;
    }
  },

  async setRegistrationsPaused(id: string, registrationsPaused: boolean) {
    const { error } = await supabase
      .from('events')
      .update({ registrations_paused: registrationsPaused })
      .eq('id', id);

    if (error) {
      throw error;
    }
  },
};
