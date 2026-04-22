FROM python:3.11-bookworm

ARG MANIMGL_VERSION=1.7.2

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH=/opt/venv/bin:$PATH \
    MPLBACKEND=Agg \
    DISPLAY=:99 \
    XDG_RUNTIME_DIR=/tmp/runtime-root \
    LIBGL_ALWAYS_SOFTWARE=1

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Linux runtime suitable for Daytona sandboxes and headless ManimGL rendering.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    ffmpeg \
    git \
    build-essential \
    pkg-config \
    xvfb \
    xauth \
    libgl1 \
    libglu1-mesa \
    libegl1 \
    libgl1-mesa-dri \
    libgles2 \
    libgbm1 \
    libglfw3 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxrandr2 \
    libxi6 \
    libxcursor1 \
    libxinerama1 \
    libsm6 \
    libice6 \
    libglib2.0-0 \
    libglib2.0-dev \
    libfreetype6 \
    libfreetype6-dev \
    libpng16-16 \
    libpng-dev \
    libcairo2 \
    libcairo2-dev \
    libpango-1.0-0 \
    libpango1.0-dev \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libgirepository1.0-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libffi-dev \
    fonts-dejavu-core \
    fonts-cmu \
    fonts-lmodern \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-latex-recommended \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-plain-generic \
    texlive-science \
    texlive-xetex \
    texlive-luatex \
    dvipng \
    dvisvgm \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip "setuptools<81" wheel \
    && /opt/venv/bin/pip install "manimgl==${MANIMGL_VERSION}" \
    && ln -sf /opt/venv/bin/manimgl /usr/local/bin/manimgl \
    && ln -sf /opt/venv/bin/manim-render /usr/local/bin/manim-render

WORKDIR /workspace

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["sleep", "infinity"]
