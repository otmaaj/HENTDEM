FROM python:3.11-slim

WORKDIR /app

COPY Requirements.txt .
RUN pip install --no-cache -r Requirements.txt

COPY app/ ./app/
COPY static/ ./static/
COPY media/ ./media/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]