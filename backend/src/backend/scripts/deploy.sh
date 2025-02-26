#!/bin/bash

ZIP_PATH="/tmp/libertai-agent.zip"
CODE_PATH="/root/libertai-agent"
DOCKERFILE_PATH="/tmp/libertai-agent.Dockerfile"
ENV_FILE_PATH="/tmp/.env"
CONTAINER_NAME="libertai-agent"
IMAGE_NAME="libertai-agent"

case "$3" in
    fastapi)
        ENTRYPOINT="fastapi run src/main.py"
        ;;
    python)
        ENTRYPOINT="python -m src.main"
        ;;
esac

# Setup
export DEBIAN_FRONTEND=noninteractive # Suppress debconf warnings
apt-get update
apt-get install unzip -y
if ! command -v docker &> /dev/null; then
    # Docker installation when not already present
    curl -fsSL https://get.docker.com | sudo DEBIAN_FRONTEND=noninteractive sh 2>/dev/null
    sudo usermod -aG docker $USER  # Allow non-root usage
    sudo systemctl enable --now docker 2>/dev/null # Start Docker and enable on boot
fi

# Prepare the dependencies
unzip $ZIP_PATH -d $CODE_PATH
wget https://raw.githubusercontent.com/Libertai/libertai-agents/refs/heads/main/deployment/$2.Dockerfile -O $DOCKERFILE_PATH -q --no-cache
docker buildx build -q $CODE_PATH \
  -f $DOCKERFILE_PATH \
  -t $IMAGE_NAME \
  --build-arg PYTHON_VERSION=3.12

# Run docker image
docker run --name $CONTAINER_NAME --env-file=$ENV_FILE_PATH -p 8000:8000 -d $IMAGE_NAME $ENTRYPOINT

# Cleanup
rm -f $ZIP_PATH
rm -rf $CODE_PATH
rm -f $DOCKERFILE_PATH