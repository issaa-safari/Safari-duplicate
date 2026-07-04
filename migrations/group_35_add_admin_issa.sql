-- Authorize the workspace owner's personal account for the admin dashboard.
-- The middleware only lets emails present in admin_users through, and until
-- now the only seeded row was safariadventureriders@gmail.com, so any other
-- account was bounced back to /admin/login after a successful sign-in.
insert into admin_users (email, full_name, role)
select 'issa.alamoudy1st@gmail.com', 'Issa Alamoudy', 'owner'
where not exists (
  select 1 from admin_users where email = 'issa.alamoudy1st@gmail.com'
);
