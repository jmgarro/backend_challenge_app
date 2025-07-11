# SETUP - Backend Challenge File Ingestion

## Requisitos Previos

- Docker y Docker Compose instalados (versiones recientes).
- Node.js (v16+ recomendado) y npm (opcional para desarrollo local).
- Clonar este repositorio.

---

## Estructura Principal del Proyecto

.
├── Dockerfile # Imagen Docker para el backend
├── docker-compose.yml # Orquesta servicios: SQL Server y backend
├── package.json # Dependencias y scripts npm
├── tsconfig.json # Configuración TypeScript
├── init_db/ # Scripts SQL para inicializar la base de datos
├── src/ # Código fuente backend
│ ├── config/ # Configuración (DB connection, variables, etc.)
│ │ └── db.ts # Conexión a la base de datos SQL Server
│ ├── controllers/ # Controladores (lógica de validación y procesamiento)
│ │ └── data_controller.ts # Procesamiento y validación de datos recibidos
│ ├── dao/ # Data Access Object (lógica de inserción en DB)
│ │ └── data_model.ts # Inserción por lotes usando transacciones
│ ├── index.ts # Lógica principal del servidor Express
│ └── generateFile.ts # Script para generar archivos de datos de prueba (provisto)
├── challenge/ # Carpeta con archivo(s) de entrada a procesar
│ └── input/
│ └── CLIENTES_IN_0425.dat # Archivo de prueba (provisto)
├── .env # Variables de entorno (no subir al repo)
├── .gitignore # Archivos y carpetas ignorados por Git
└── README.md # Esta guía


---

## Configuración inicial

1. Crear un archivo `.env` en la raíz con las siguientes variables (ajustar según necesidad):

```env
SA_PASSWORD=ContrasenaSegura2025
DB_USER=sa
DB_PASSWORD=ContrasenaSegura2025
DB_HOST=localhost
DB_DATABASE=challenge_clients_db
PORT=3000

Levantar el proyecto con Docker Compose
Ejecutar:

docker-compose up --build

Este comando:

Construye las imágenes Docker.

Levanta SQL Server y espera a que esté listo (healthcheck).

Levanta el backend y lo conecta con la base.

Expone el backend en http://localhost:3000.

Inicializar la base de datos
La base de datos se inicializa con el script SQL ubicado en:

init_db/init.sql

Probar la API
Para verificar que el backend está funcionando correctamente, consultar el endpoint health:

curl http://localhost:3000/health