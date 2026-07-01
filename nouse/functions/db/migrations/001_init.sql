create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists google_calendar_accounts (
  uid text not null,
  account_email text not null,
  name text,
  photo_url text,
  encrypted_refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (uid, account_email)
);

create index if not exists google_calendar_accounts_uid_idx
  on google_calendar_accounts (uid);

create table if not exists timetable_syllabus_sources (
  source_id text primary key,
  seed_url text not null,
  institution_name text not null default '',
  faculty_name text not null default '',
  department_name text not null default '',
  max_pages integer not null default 24,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists timetable_syllabus_catalog (
  id text primary key,
  source_url text not null,
  source_id text,
  institution_name text not null default '',
  department_name text not null default '',
  faculty_name text not null default '',
  title text not null,
  room text not null default '',
  teacher text not null default '',
  semester_label text not null default '',
  credits text not null default '',
  memo text not null default '',
  syllabus_url text not null default '',
  slots jsonb not null default '[]'::jsonb,
  search_text text not null default '',
  crawler_version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timetable_syllabus_catalog_source_id_idx
  on timetable_syllabus_catalog (source_id);

create index if not exists timetable_syllabus_catalog_search_text_idx
  on timetable_syllabus_catalog using gin (to_tsvector('simple', search_text));

create table if not exists timetable_syllabus_crawl_jobs (
  job_id text primary key,
  uid text,
  source_id text,
  seed_url text not null,
  institution_name text not null default '',
  faculty_name text not null default '',
  department_name text not null default '',
  scanned_page_count integer not null default 0,
  saved_course_count integer not null default 0,
  skipped_url_count integer not null default 0,
  crawler_version integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists timetable_syllabus_crawl_job_courses (
  job_id text not null references timetable_syllabus_crawl_jobs (job_id) on delete cascade,
  course_id text not null references timetable_syllabus_catalog (id) on delete cascade,
  course_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (job_id, course_id)
);
