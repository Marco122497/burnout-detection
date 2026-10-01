-- Forgot-password switch. Only superadmin@school.edu can change it in Guidance Settings.
-- Missing row means the feature stays on.

INSERT INTO public.app_settings (key, value)
VALUES ('forgot_password_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
