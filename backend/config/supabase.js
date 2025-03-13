const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
