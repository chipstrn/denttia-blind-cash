// Supabase Client Configuration
const SUPABASE_URL = 'https://dwlpcfmfrihjpqjvtarv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bHBjZm1mcmloanBxanZ0YXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODQ0OTQsImV4cCI6MjA4NDQ2MDQ5NH0.6FS23kEgkbFw4lwJXiXcc5ov93AqrBrCqsj_5glC6W4';

// Initialize Supabase client (using different variable name to avoid conflict with CDN global)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.supabaseClient = supabaseClient;

// Auth helper functions
const auth = {
  // Get current user
  async getUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return user;
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  },

  // Sign in with email/password
  async signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    window.location.href = '/pages/login.html';
  },

  // Check if user is admin
  async isAdmin() {
    const user = await this.getUser();
    if (!user) return false;
    return user.user_metadata?.role === 'admin';
  },

  // Require authentication - redirect to login if not authenticated
  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = '/pages/login.html';
      return null;
    }
    return session;
  }
};

window.auth = auth;
