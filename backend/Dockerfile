FROM python:3.12

WORKDIR /app

RUN pip install hatch

COPY . .

RUN hatch env run pip install setuptools

RUN hatch env run pip install "fastapi[standard]"

CMD ["hatch", "run", "backend", "--host", "0.0.0.0"]