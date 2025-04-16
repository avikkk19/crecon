// Database schema for the crecon application
// Export SQL statements to create tables

export const profilesTableSQL = `
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE
);
`;

export const blogPostsTableSQL = `
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

export const connectionsTableSQL = `
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) NOT NULL,
  following_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (follower_id, following_id)
);
`;

export const connectionRequestsTableSQL = `
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  receiver_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (sender_id, receiver_id)
);
`;

// All tables as a single SQL script
export const completeSchemaSQL = `
${profilesTableSQL}
${blogPostsTableSQL}
${connectionsTableSQL}
${connectionRequestsTableSQL}
`;

// Indexes for better query performance
export const indexesSQL = `
CREATE INDEX IF NOT EXISTS blog_posts_user_id_idx ON blog_posts (user_id);
CREATE INDEX IF NOT EXISTS connections_follower_id_idx ON connections (follower_id);
CREATE INDEX IF NOT EXISTS connections_following_id_idx ON connections (following_id);
CREATE INDEX IF NOT EXISTS connection_requests_sender_id_idx ON connection_requests (sender_id);
CREATE INDEX IF NOT EXISTS connection_requests_receiver_id_idx ON connection_requests (receiver_id);
`;

// Sample data for testing
export const sampleDataSQL = `
-- Sample blog posts (replace USER_ID with actual user ID)
INSERT INTO blog_posts (title, content, user_id) 
VALUES 
  ('Getting Started with React', 'React is a popular JavaScript library for building user interfaces...', 'USER_ID'),
  ('Understanding State Management', 'State management is a crucial concept in modern web applications...', 'USER_ID'),
  ('CSS-in-JS: Benefits and Drawbacks', 'CSS-in-JS libraries like styled-components and Emotion have gained popularity...', 'USER_ID')
ON CONFLICT DO NOTHING;
`;
