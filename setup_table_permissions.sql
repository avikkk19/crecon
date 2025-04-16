-- Enable Row Level Security on all tables
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Blog Posts Policies
-- Allow users to read all blog posts
CREATE POLICY blog_posts_select_policy ON blog_posts 
FOR SELECT USING (true);

-- Allow users to insert their own blog posts
CREATE POLICY blog_posts_insert_policy ON blog_posts 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update only their own blog posts
CREATE POLICY blog_posts_update_policy ON blog_posts 
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete only their own blog posts
CREATE POLICY blog_posts_delete_policy ON blog_posts 
FOR DELETE USING (auth.uid() = user_id);

-- Connections Policies
-- Allow users to read connections they're involved in
CREATE POLICY connections_select_policy ON connections 
FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Allow users to create connections where they are the follower
CREATE POLICY connections_insert_policy ON connections 
FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Allow users to delete connections where they are the follower
CREATE POLICY connections_delete_policy ON connections 
FOR DELETE USING (auth.uid() = follower_id);

-- Connection Requests Policies
-- Allow users to read requests they're involved in
CREATE POLICY requests_select_policy ON connection_requests 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Allow users to create requests where they are the sender
CREATE POLICY requests_insert_policy ON connection_requests 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Allow users to update requests they received
CREATE POLICY requests_update_policy ON connection_requests 
FOR UPDATE USING (auth.uid() = receiver_id);

-- Allow users to delete requests they're involved in
CREATE POLICY requests_delete_policy ON connection_requests 
FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id); 