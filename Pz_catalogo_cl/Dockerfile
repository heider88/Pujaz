FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY src/ /app/src/

# Exponer el puerto
EXPOSE 8000

# Comando para iniciar el microservicio
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
