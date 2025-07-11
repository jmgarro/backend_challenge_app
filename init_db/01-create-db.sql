IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'challenge_clients_db')
BEGIN
    CREATE DATABASE [challenge_clients_db];
END
