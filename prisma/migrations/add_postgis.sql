-- PostGIS extension for geographic queries.
--
-- This file is a manual reference; the canonical declaration lives in
-- prisma/schema.prisma (datasource.extensions = [postgis]) and is applied by
-- `prisma db push` or the next `prisma migrate dev`.
--
-- Heads-up for local dev: Homebrew's `postgis` formula is currently built
-- against PostgreSQL 17/18. If you're running PostgreSQL 16 the extension
-- files won't be found and the CREATE EXTENSION statement below will fail
-- with "extension postgis is not available". Upgrade to PostgreSQL 17 (or
-- compile postgis from source against your active PG version) before
-- enabling.
--
-- Without PostGIS, lib/geo.ts still works — its Haversine helper only
-- needs the float lat/lng columns on `User`.

CREATE EXTENSION IF NOT EXISTS postgis;
