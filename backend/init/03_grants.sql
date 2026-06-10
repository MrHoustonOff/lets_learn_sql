-- Права llpg_user на northwind
GRANT CONNECT ON DATABASE northwind TO llpg_user;
GRANT USAGE ON SCHEMA public TO llpg_user;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON ALL TABLES IN SCHEMA public TO llpg_user;
GRANT USAGE, SELECT
    ON ALL SEQUENCES IN SCHEMA public TO llpg_user;
