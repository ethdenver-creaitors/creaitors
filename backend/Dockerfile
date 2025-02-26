FROM python:3.12

WORKDIR /app

RUN pip install hatch

COPY ./pyproject.toml ./

RUN pip install -e .

COPY . .

CMD ["hatch", "run", "backend", "--host", "0.0.0.0"]