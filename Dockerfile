# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV HOST=0.0.0.0

# Set work directory
WORKDIR /app

# Copy the application code to the container
COPY . /app

# Expose the port the server listens on
EXPOSE 8000

# Run the Python server
CMD ["python", "server.py"]
