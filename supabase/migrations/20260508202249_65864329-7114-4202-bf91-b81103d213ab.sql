-- Remove any prior schedules with the same name
do $$
begin
  perform cron.unschedule('daily-push-morning');
exception when others then null;
end $$;
do $$
begin
  perform cron.unschedule('daily-push-evening');
exception when others then null;
end $$;

-- 8:00 America/Sao_Paulo = 11:00 UTC
select cron.schedule(
  'daily-push-morning',
  '0 11 * * *',
  $$
  select net.http_post(
    url:='https://eolvrylgvgndinrcblem.supabase.co/functions/v1/send-daily-push',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbHZyeWxndmduZGlucmNibGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODcwMTYsImV4cCI6MjA5MzE2MzAxNn0.-P24iONIySHhFqWYIGZjAr1iNqNkMxGNR-8vDXq92xg"}'::jsonb,
    body:='{"slot":"morning"}'::jsonb
  );
  $$
);

-- 18:00 America/Sao_Paulo = 21:00 UTC
select cron.schedule(
  'daily-push-evening',
  '0 21 * * *',
  $$
  select net.http_post(
    url:='https://eolvrylgvgndinrcblem.supabase.co/functions/v1/send-daily-push',
    headers:='{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvbHZyeWxndmduZGlucmNibGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1ODcwMTYsImV4cCI6MjA5MzE2MzAxNn0.-P24iONIySHhFqWYIGZjAr1iNqNkMxGNR-8vDXq92xg"}'::jsonb,
    body:='{"slot":"evening"}'::jsonb
  );
  $$
);