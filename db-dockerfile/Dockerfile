FROM mcr.microsoft.com/mssql/server:2019-latest

USER root

# Instalar dependencias para agregar repositorios y certificados
RUN apt-get update && apt-get install -y curl apt-transport-https gnupg2

# Importar la clave pública de Microsoft
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -

# Registrar el repositorio oficial de Microsoft para Ubuntu 20.04
RUN curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list > /etc/apt/sources.list.d/mssql-release.list

# Actualizar e instalar mssql-tools y dependencias (msodbcsql18 y unixodbc-dev)
RUN apt-get update && ACCEPT_EULA=Y apt-get install -y msodbcsql18 mssql-tools unixodbc-dev

# Agregar sqlcmd y bcp al PATH para todos los shells
RUN echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> /etc/bash.bashrc

# Copiamos la carpeta init_db que está en la raíz del contexto
COPY init_db /init_db

# Copiamos el entrypoint.sh que está dentro de db-dockerfile/
COPY db-dockerfile/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/bin/bash", "/entrypoint.sh" ]
