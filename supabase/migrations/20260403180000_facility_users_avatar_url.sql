-- ENG-106: Per-facility profile avatar (default SVG paths or storage URLs)
ALTER TABLE public.facility_users
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN public.facility_users.avatar_url IS
  'Avatar for this user at this facility: /avatars/default-NN.svg or HTTPS storage URL.';
