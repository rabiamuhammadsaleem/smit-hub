import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = 'https://qclwmmygyzcajhelinby.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbHdtbXlneXpjYWpoZWxpbmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTI5OTIsImV4cCI6MjA4MzUyODk5Mn0.m8ZJke9vmJTahYoOCkGn9Hgcmz0vS8CZ2IVkY8MV-lo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
console.log('✅ Supabase connected')