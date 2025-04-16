-- Fix the profiles table to make sure it has all the required columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Create the blog_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) NOT NULL,
  following_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (follower_id, following_id)
);

-- Create the connection_requests table if it doesn't exist 
CREATE TABLE IF NOT EXISTS connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (sender_id, receiver_id)
);

-- Create the necessary indexes for better performance
CREATE INDEX IF NOT EXISTS blog_posts_user_id_idx ON blog_posts (user_id);
CREATE INDEX IF NOT EXISTS connections_follower_id_idx ON connections (follower_id);
CREATE INDEX IF NOT EXISTS connections_following_id_idx ON connections (following_id);
CREATE INDEX IF NOT EXISTS connection_requests_sender_id_idx ON connection_requests (sender_id);
CREATE INDEX IF NOT EXISTS connection_requests_receiver_id_idx ON connection_requests (receiver_id);

-- Enable Row Level Security on all tables
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Blog Posts Policies
-- Allow users to read all blog posts
CREATE POLICY IF NOT EXISTS blog_posts_select_policy ON blog_posts 
FOR SELECT USING (true);

-- Allow users to insert their own blog posts
CREATE POLICY IF NOT EXISTS blog_posts_insert_policy ON blog_posts 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own blog posts
CREATE POLICY IF NOT EXISTS blog_posts_update_policy ON blog_posts 
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete only their own blog posts
CREATE POLICY IF NOT EXISTS blog_posts_delete_policy ON blog_posts 
FOR DELETE USING (auth.uid() = user_id);

-- Connections Policies
-- Allow users to read connections they're involved in
CREATE POLICY IF NOT EXISTS connections_select_policy ON connections 
FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Allow users to create connections where they are the follower
CREATE POLICY IF NOT EXISTS connections_insert_policy ON connections 
FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Allow users to delete connections where they are the follower
CREATE POLICY IF NOT EXISTS connections_delete_policy ON connections 
FOR DELETE USING (auth.uid() = follower_id);

-- Connection Requests Policies
-- Allow users to read requests they're involved in
CREATE POLICY IF NOT EXISTS requests_select_policy ON connection_requests 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to create requests where they are the sender
CREATE POLICY IF NOT EXISTS requests_insert_policy ON connection_requests 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Allow users to update requests they received
CREATE POLICY IF NOT EXISTS requests_update_policy ON connection_requests 
FOR UPDATE USING (auth.uid() = receiver_id);

-- Allow users to delete requests they're involved in
CREATE POLICY IF NOT EXISTS requests_delete_policy ON connection_requests 
FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id); 