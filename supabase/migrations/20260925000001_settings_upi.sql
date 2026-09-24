-- UPI payment details for the GST invoice's "Scan & Pay" QR. Additive, nullable, and seeded with the
-- business's real values the owner gave for this feature (not placeholder/invented data).
alter table public.settings add column upi_id text;
alter table public.settings add column upi_payee_name text;

update public.settings set upi_id = '9324928066@uboi', upi_payee_name = 'K.N AND ANTIC BAGS' where id = true;
