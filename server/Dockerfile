# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY . .

# Expose port for Flask
EXPOSE 8080

# Default command (overridden by docker-compose if needed)
CMD ["python", "main.py"]
