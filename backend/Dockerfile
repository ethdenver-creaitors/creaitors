FROM python:3.12

WORKDIR /app

RUN mkdir downloads
RUN mkdir keys

RUN apt-get update && apt-get install iputils-ping -y

RUN pip install hatch

COPY . .

RUN hatch env run pip install setuptools

RUN hatch env run pip install "fastapi[standard]"

CMD ["hatch", "run", "backend", "--host", "::"]