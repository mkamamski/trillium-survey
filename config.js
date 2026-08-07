// Supabase project "Wander" (us-west-1).
//
// Both values are safe to commit and safe to put in a public repo. The
// publishable key is designed to be public, and on its own it opens nothing:
// every table has RLS enabled with no policies and no grants to `anon`, so all
// real access runs through the passphrase-checked functions in schema.sql.
// This was verified against the live project — direct table reads, direct
// writes, and calling assert_pass() all return "permission denied" for anon.
//
// The passphrase is NOT stored here. It is typed on the unlock screen.

window.TRILLIUM_CONFIG = {
  supabaseUrl:     "https://satmvoetlkmajpjfbjiv.supabase.co",
  supabaseAnonKey: "sb_publishable_tIij4qwGN27JSENFuaN0eA_OKOQ-SN0",
  surveySlug:      "trillium-1300"
};
