const config = {
  apiUrl: process.env.REACT_APP_API_URL || "http://localhost:3000",
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
  supabaseKey: process.env.REACT_APP_SUPABASE_ANON_KEY,
};

export default config;
