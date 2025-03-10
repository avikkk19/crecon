// src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = "https://ijshfaiylidljjuvrrbo.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2hmYWl5bGlkbGpqdXZycmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjIxNDgsImV4cCI6MjA1Njg5ODE0OH0.AiIOVRQeBNuv94vGPQ26FAYUWlyH4BJ6IqbaVmYvIWA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Edge Function helpers
export const supabaseEdgeFunctions = {
  // Process a new message (extract links, generate previews)
  processMessage: async (message) => {
    try {
      const { data, error } = await supabase.functions.invoke('message-processor', {
        body: { 
          type: 'process_new_message',
          message 
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error processing message:', error);
      return { error };
    }
  },
  
  // Generate a link preview
  generateLinkPreview: async (url) => {
    try {
      const { data, error } = await supabase.functions.invoke('message-processor', {
        body: { 
          type: 'generate_link_preview',
          message: { link_url: url } 
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error generating link preview:', error);
      return null;
    }
  },
  
  // Send notifications to conversation participants
  sendNotification: async (message) => {
    try {
      const { data, error } = await supabase.functions.invoke('message-processor', {
        body: { 
          type: 'send_notification',
          message 
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending notification:', error);
      return { error };
    }
  },
  
  // Update user's online status
  updateUserPresence: async (userId, status = 'online') => {
    try {
      const { data, error } = await supabase.functions.invoke('user-presence', {
        body: { 
          user_id: userId,
          status 
        }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating presence:', error);
      return { error };
    }
  }
};

// Database schema setup for the Snapchat-style Chat Application
export const setupDatabase = async () => {
  // Enable Row Level Security (RLS)
  const enableRls = async (table) => {
    await supabase.rpc('pg_enable_row_level_security', { table_name: table });
  };

  try {
    // Create tables if they don't exist
    const tables = [
      {
        name: 'users',
        query: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID REFERENCES auth.users PRIMARY KEY,
            name TEXT,
            email TEXT,
            avatar_url TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'conversations',
        query: `
          CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'conversation_participants',
        query: `
          CREATE TABLE IF NOT EXISTS conversation_participants (
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (conversation_id, user_id)
          );
        `
      },
      {
        name: 'messages',
        query: `
          CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
            content TEXT,
            message_type TEXT DEFAULT 'text',
            media_url TEXT,
            link_url TEXT,
            link_preview JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
          );
        `
      },
      {
        name: 'user_presence',
        query: `
          CREATE TABLE IF NOT EXISTS user_presence (
            user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
            status TEXT DEFAULT 'offline',
            last_seen TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'user_notification_tokens',
        query: `
          CREATE TABLE IF NOT EXISTS user_notification_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            platform TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, token)
          );
        `
      }
    ];

    // Create tables
    for (const table of tables) {
      const { error } = await supabase.rpc('pgrunner', { query: table.query });
      
      if (error) {
        console.error(`Error creating ${table.name} table:`, error);
        continue;
      }
      
      // Enable RLS on this table
      await enableRls(table.name);
      console.log(`Created table: ${table.name}`);
    }

    // Create security policies
    const policies = [
      // Users can read all user profiles
      {
        query: `
          CREATE POLICY "Public profiles are viewable by everyone" ON users
          FOR SELECT USING (true);
        `
      },
      // Users can update only their own profile
      {
        query: `
          CREATE POLICY "Users can update their own profile" ON users
          FOR UPDATE USING (auth.uid() = id);
        `
      },
      // Users can view conversations they're part of
      {
        query: `
          CREATE POLICY "Users can view their conversations" ON conversations
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM conversation_participants
              WHERE conversation_id = id AND user_id = auth.uid()
            )
          );
        `
      },
      // Users can insert new conversations
      {
        query: `
          CREATE POLICY "Users can create conversations" ON conversations
          FOR INSERT WITH CHECK (true);
        `
      },
      // Users can see participants of their conversations
      {
        query: `
          CREATE POLICY "Users can see participants of their conversations" ON conversation_participants
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM conversation_participants
              WHERE conversation_id = conversation_participants.conversation_id AND user_id = auth.uid()
            )
          );
        `
      },
      // Users can add participants to conversations
      {
        query: `
          CREATE POLICY "Users can add participants to conversations" ON conversation_participants
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM conversation_participants
              WHERE conversation_id = conversation_participants.conversation_id AND user_id = auth.uid()
            ) OR
            (conversation_participants.user_id = auth.uid())
          );
        `
      },
      // Users can see messages in their conversations
      {
        query: `
          CREATE POLICY "Users can view messages in their conversations" ON messages
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM conversation_participants
              WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
            )
          );
        `
      },
      // Users can insert messages in their conversations
      {
        query: `
          CREATE POLICY "Users can send messages to their conversations" ON messages
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM conversation_participants
              WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
            ) AND sender_id = auth.uid()
          );
        `
      },
      // Users can view online status of other users
      {
        query: `
          CREATE POLICY "Users can view others' online status" ON user_presence
          FOR SELECT USING (true);
        `
      },
      // Users can update only their own presence
      {
        query: `
          CREATE POLICY "Users can update their own presence" ON user_presence
          FOR UPDATE USING (user_id = auth.uid());
        `
      },
      // Users can register notification tokens for themselves
      {
        query: `
          CREATE POLICY "Users can register notification tokens" ON user_notification_tokens
          FOR INSERT WITH CHECK (user_id = auth.uid());
        `
      },
      // Users can delete their own tokens
      {
        query: `
          CREATE POLICY "Users can delete their notification tokens" ON user_notification_tokens
          FOR DELETE USING (user_id = auth.uid());
        `
      }
    ];

    // Create policies
    for (const policy of policies) {
      const { error } = await supabase.rpc('pgrunner', { query: policy.query });
      if (error) {
        console.error('Error creating policy:', error);
      }
    }

    console.log('Database setup completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error setting up database:', error);
    return { success: false, error };
  }
};