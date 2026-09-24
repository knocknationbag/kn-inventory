-- One optional business-contact field for the GST invoice header. Additive, nullable, no default data.
alter table public.settings add column email text;
