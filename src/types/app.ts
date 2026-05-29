import { Session } from '@supabase/supabase-js';

export type UserRole = 'student' | 'admin';

export type UserProfile = {
  avatar_url: string | null;
  created_at: string;
  email: string;
  id: string;
  is_private: boolean;
  name: string;
  phone: string | null;
  role: UserRole;
  batch_id?: string | null;
  batch_name?: string | null;
};

export type Batch = {
  id: string;
  name: string;
  created_at: string;
};

export type Announcement = {
  created_at: string;
  description: string;
  id: string;
  title: string;
  session_id?: string | null;
  batch_id?: string | null;
};

export type EventItem = {
  created_at: string;
  created_by: string;
  date: string;
  description: string;
  id: string;
  image_url: string | null;
  google_drive_link?: string | null;
  links?: { type?: 'drive' | 'custom'; title: string; url: string }[] | null;
  pdf_url?: string | null;
  max_registrations?: number | null;
  min_team_size: number;
  max_team_size: number;
  registration_until: string | null;
  registrations_paused: boolean;
  title: string;
  venue: string;
  committees?: string[] | null;
  clubs?: string[] | null;
  session_id?: string | null;
  batch_id?: string | null;
};

export type EventTeam = {
  id: string;
  event_id: string;
  name: string;
  leader_id: string;
  created_at: string;
  registrations?: {
    id: string;
    user_id: string;
    status: 'accepted' | 'pending' | 'declined';
    users?: {
      name: string;
      avatar_url?: string | null;
      email: string;
    };
  }[];
};

export type EventRegistration = {
  created_at: string;
  event_id: string;
  id: string;
  phone: string | null;
  user_id: string;
  team_id?: string | null;
  status?: 'accepted' | 'pending' | 'declined';
  invited_by?: string | null;
  inviter?: Pick<UserProfile, 'avatar_url' | 'email' | 'name' | 'phone'> | null;
  event_teams?: EventTeam | null;
};

export type WinnerItem = {
  created_at?: string;
  event_id: string;
  events?: Pick<EventItem, 'date' | 'title' | 'venue'>;
  id: string;
  image_url: string | null;
  name: string;
  position: string;
  user_id?: string | null;
  users?: Pick<UserProfile, 'avatar_url' | 'name'> | null;
  session_id?: string | null;
  batch_id?: string | null;
};

export type RepositoryItem = {
  created_at?: string;
  description: string;
  event_id: string;
  events?: Pick<EventItem, 'date' | 'title' | 'venue'>;
  id: string;
  image_url: string | null;
};

export type EventRegistrationWithEvent = EventRegistration & {
  events?: Pick<EventItem, 'date' | 'title' | 'venue' | 'max_team_size'>;
};

export type EventRegistrationWithUser = EventRegistration & {
  users?: Pick<UserProfile, 'avatar_url' | 'email' | 'name' | 'phone'>;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  event_id?: string | null;
  subject: string;
  message: string;
  image_url?: string | null;
  admin_reply?: string | null;
  admin_reply_image_url?: string | null;
  status: 'open' | 'resolved';
  created_at: string;
  updated_at: string;
  events?: Pick<EventItem, 'title'> | null;
  users?: Pick<UserProfile, 'name' | 'email' | 'avatar_url'> | null;
};

export type AcademicSession = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

export type AuthState = {
  clearAuthState: () => void;
  isBootstrapping: boolean;
  profile: UserProfile | null;
  session: Session | null;
  activeSession: AcademicSession | null;
  batches: Batch[];
  adminSelectedBatch: Batch | null;
  setAuthState: (payload: { profile: UserProfile | null; session: Session | null }) => void;
  setBootstrapping: (value: boolean) => void;
  setActiveSession: (activeSession: AcademicSession | null) => void;
  setBatches: (batches: Batch[]) => void;
  setAdminSelectedBatch: (batch: Batch | null) => void;
  fetchBatches: () => Promise<void>;
};
