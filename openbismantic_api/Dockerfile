FROM python:3.11.3-slim

RUN apt-get update && apt-get install -y git
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir --upgrade -r requirements.txt

ADD . /src
WORKDIR /src

ENV PYTHONDONTWRITEBYTECODE 1
# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED 1
ENTRYPOINT ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "6", "--proxy-headers", "--reload"]
