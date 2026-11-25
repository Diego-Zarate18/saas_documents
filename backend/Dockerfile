# API de SIGEDOC para producción: solo dependencias de ejecución (sin el grupo dev), usuario sin privilegios.
FROM python:3.13.18-slim

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_CACHE=1 \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Primero las dependencias, en su propia capa: se reutiliza mientras uv.lock no cambie. uv solo se monta para
# instalar; no queda en la imagen.
COPY --from=ghcr.io/astral-sh/uv:0.13.9 /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project && rm -f /usr/local/bin/uv

COPY app ./app
COPY outbox ./outbox
RUN python -m compileall -q app outbox && useradd --system --no-create-home sigedoc
USER sigedoc

EXPOSE 8000
CMD ["/opt/venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
