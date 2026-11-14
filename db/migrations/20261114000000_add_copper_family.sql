-- Adds the copper colour family used by the free-church lanes
-- (Anabaptist and Baptist), so they read differently from Lutheran and Reformed.
alter table public.traditions drop constraint if exists traditions_family_check;
alter table public.traditions add constraint traditions_family_check
  check (family in ('gold', 'sapphire', 'ruby', 'emerald', 'amethyst', 'copper'));
