FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng tesseract-ocr-nep && rm -rf /var/lib/apt/lists/*
COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
