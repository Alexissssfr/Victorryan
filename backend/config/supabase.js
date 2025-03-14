require("dotenv").config({ path: "../.env" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase credentials are missing in environment variables");
}

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
