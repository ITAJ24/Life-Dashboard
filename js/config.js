// ---------------------------------------------------------------
//  Supabase connection settings
// ---------------------------------------------------------------
//  Paste the two values from your Supabase project here:
//  Supabase dashboard → Project Settings → API (or "Data API").
//
//  The "anon"/"publishable" key is safe to put in a public website:
//  your data is protected by sign-in and the database rules in
//  supabase/setup.sql. Never paste the "service_role"/"secret" key here.
//
//  Leave both empty to run in demo mode (saves on this device only).
// ---------------------------------------------------------------

export const SUPABASE_URL = "";       // e.g. "https://abcdxyz.supabase.co"
export const SUPABASE_ANON_KEY = "";  // starts with "eyJ..." or "sb_publishable_..."

// Finished tasks are cleared this many days after you complete them.
export const DONE_TASKS_KEEP_DAYS = 3;

// Seconds each Vision photo stays on screen.
export const SLIDE_SECONDS = 7;
