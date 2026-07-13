# Database

PostgreSQL is the production source of truth. Migration `001_initial.sql` creates dedicated tables for users, invites, messages, devices, sessions, notifications, support tickets, audit events, QR device approvals, network configuration and cluster node registry. Documents are JSONB during the compatibility migration phase, with uniqueness and lookup indexes for important fields.

This design preserves the current API while enabling later column-by-column normalization. JSON files are not production storage.
