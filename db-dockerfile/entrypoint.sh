#!/bin/bash

# Arrancamos SQL Server en background
/opt/mssql/bin/sqlservr &

# Esperamos a que SQL Server esté listo para recibir conexiones
echo "Esperando a que SQL Server se inicie..."
until /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -Q "SELECT 1" > /dev/null 2>&1
do
  sleep 2
done

echo "SQL Server iniciado, ejecutando scripts de inicialización..."

# Ejecutamos todos los scripts .sql en /init_db, si los hay
for script in /init_db/*.sql
do
    echo "Ejecutando script: $script"
    /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "$SA_PASSWORD" -d master -i "$script"
done

echo "Scripts ejecutados. Manteniendo el proceso SQL Server en primer plano..."

# Esperamos que SQL Server siga corriendo (PID 1)
wait
