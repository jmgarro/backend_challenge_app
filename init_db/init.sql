-- Script SQL para crear la base de datos y la tabla Clientes

-- Crea la base de datos challenge_clients_db si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'challenge_clients_db')
BEGIN
    CREATE DATABASE challenge_clients_db;
    PRINT 'Base de datos challenge_clients_db creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La base de datos challenge_clients_db ya existe.';
END
GO

-- Usa la base de datos challenge_clients_db
USE challenge_clients_db;
GO

-- Crea la tabla Clientes si no existe dentro de challenge_clients_db
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Clientes')
BEGIN
    CREATE TABLE Clientes (
        Id INT PRIMARY KEY IDENTITY(1,1), -- Clave primaria auto-incremental
        NombreCompleto NVARCHAR(100) NOT NULL,
        DNI BIGINT NOT NULL,
        Estado VARCHAR(10) NOT NULL,
        FechaIngreso DATE  NULL,
        EsPEP BIT NOT NULL,
        EsSujetoObligado BIT NULL -- Puede ser NULL según la especificación
    );

    PRINT 'Tabla Clientes creada exitosamente en challenge_clients_db.';
END
ELSE
BEGIN
    PRINT 'La tabla Clientes ya existe en challenge_clients_db.';
END
GO