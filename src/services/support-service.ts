import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { SupportTicket } from "@/src/types/app";

export const supportService = {
  async createTicket(payload: {
    user_id: string;
    event_id?: string | null;
    subject: string;
    message: string;
    image_url?: string | null;
  }): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from("support_tickets")
      .insert([payload])
      .select(`
        *,
        events ( title ),
        users ( name, email, avatar_url )
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  },

  async listUserTickets(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from("support_tickets")
      .select(`
        *,
        events ( title ),
        users ( name, email, avatar_url )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    return data ?? [];
  },

  async listAllTickets(): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from("support_tickets")
      .select(`
        *,
        events ( title ),
        users ( name, email, avatar_url )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }
    return data ?? [];
  },

  async replyTicket(ticketId: string, reply: string, replyImageUrl?: string | null): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from("support_tickets")
      .update({
        admin_reply: reply,
        admin_reply_image_url: replyImageUrl,
        status: "resolved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .select(`
        *,
        events ( title ),
        users ( name, email, avatar_url )
      `)
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data;
  },

  subscribeToTickets(onChange: () => void): RealtimeChannel {
    return supabase
      .channel(`support_tickets-feed-${Date.now()}-${Math.random()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, onChange)
      .subscribe();
  },

  unsubscribe(channel: RealtimeChannel) {
    supabase.removeChannel(channel).catch(() => undefined);
  },
};

