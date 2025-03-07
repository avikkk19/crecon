// Create a file like supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijshfaiylidljjuvrrbo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc2hmYWl5bGlkbGpqdXZycmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjIxNDgsImV4cCI6MjA1Njg5ODE0OH0.AiIOVRQeBNuv94vGPQ26FAYUWlyH4BJ6IqbaVmYvIWA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);