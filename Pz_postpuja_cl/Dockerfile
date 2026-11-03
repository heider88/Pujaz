FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias (capa aparte: solo se rehace si cambia requirements.txt)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY src/ /app/src/

# No correr como root dentro del contenedor
RUN useradd --create-home postpuja
USER postpuja

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
