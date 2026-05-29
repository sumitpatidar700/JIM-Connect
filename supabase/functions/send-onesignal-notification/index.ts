import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!

serve(async (req) => {
  try {
    const payload = await req.json()
    let title = payload.title
    let message = payload.message
    let player_ids = payload.player_ids
    let target_external_user_ids: string[] = []

    if (payload.type === 'INSERT') {
        const table = payload.table;
        const record = payload.record;
        
        if (table === 'events') {
            title = 'New Event Published! 🎉';
            message = record.title || 'Check out the new event.';
        } else if (table === 'announcements') {
            title = 'New Announcement 📢';
            message = record.title || 'Check out the new announcement.';
        } else if (table === 'winners') {
            title = 'Winners Announced! 🏆';
            message = `Congratulations to ${record.name} for the recent event!`;
        } else if (table === 'registrations' && record.team_id) {
            // Check if this is an invitation from a leader to a student
            if (record.invited_by) {
                const supabase = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )
                
                // Fetch the team name to show in the notification
                const { data: team } = await supabase
                    .from('event_teams')
                    .select('name')
                    .eq('id', record.team_id)
                    .single()
                    
                if (team && record.user_id) {
                    title = 'Team Invitation! 🤝';
                    message = `You have been invited to join the team: ${team.name}.`;
                    // Send notification to the student who was invited
                    target_external_user_ids = [record.user_id];
                } else {
                    return new Response(JSON.stringify({ message: 'No notification needed' }), { status: 200 })
                }
            } else {
                return new Response(JSON.stringify({ message: 'No notification needed' }), { status: 200 })
            }
        }
    } else if (payload.type === 'UPDATE') {
        const table = payload.table;
        const record = payload.record;
        const old_record = payload.old_record;
        
        if (table === 'registrations' && record.team_id && record.status === 'accepted' && old_record?.status !== 'accepted') {
            // A student accepted the team invite, notify the leader
            if (record.invited_by) {
                const supabase = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                )
                
                // Fetch the student's name
                const { data: student } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', record.user_id)
                    .single()
                    
                if (student) {
                    title = 'Team Invite Accepted! ✅';
                    message = `${student.name} has accepted your invitation to join the team.`;
                    // Send notification to the leader who invited them
                    target_external_user_ids = [record.invited_by];
                } else {
                    return new Response(JSON.stringify({ message: 'No notification needed' }), { status: 200 })
                }
            } else {
                 return new Response(JSON.stringify({ message: 'No notification needed' }), { status: 200 })
            }
        }
    }

    if (!title || !message) {
      return new Response(JSON.stringify({ error: 'Title and message are required' }), { status: 400 })
    }

    const body: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      android_sound: "nil", // 'nil' tells OneSignal to use the default system notification sound channel
      ios_sound: "default",  // 'default' plays the standard iOS notification alert
    }

    if (target_external_user_ids.length > 0) {
      // Send only to the specific users (e.g. team leader or invited student)
      body.include_external_user_ids = target_external_user_ids
    } else if (player_ids && player_ids.length > 0) {
      body.include_subscription_ids = player_ids
    } else {
      // Respect user notification preferences via OneSignal Tags
      const filters: any[] = [];
      
      if (payload.type === 'INSERT') {
          if (payload.table === 'events' || payload.table === 'winners') {
              filters.push({ field: 'tag', key: 'event_alerts', relation: '!=', value: 'false' });
          } else if (payload.table === 'announcements') {
              filters.push({ field: 'tag', key: 'announcement_alerts', relation: '!=', value: 'false' });
          }
      }
      
      if (filters.length > 0) {
          filters.push({ operator: 'AND' });
      }
      filters.push({ field: 'tag', key: 'push_notifications', relation: '!=', value: 'false' });
      
      body.filters = filters;
      
      // Exclude the user who created the record
      if (payload.type === 'INSERT' && payload.record?.created_by) {
        body.exclude_external_user_ids = [payload.record.created_by]
      }
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
