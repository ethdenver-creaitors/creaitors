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

# Check if there are files inside CODE_PATH apart from folders
NUM_FILES=$(find "$CODE_PATH" -maxdepth 1 -type f | wc -l)

# If find files it means that this is the main code folder
if [ "$NUM_FILES" -gt 0 ]; then
  echo "No any folder inside '$CODE_PATH'."
  FINAL_CODE_PATH="$CODE_PATH"
else
  # If doesn't find, it means that there is a folder inside and we need to access inside
  CODE_FOLDER=$(find "$CODE_PATH" -maxdepth 1 -type d -not -path "$CODE_PATH" | head -n 1)
  CODE_FOLDER_NAME=$(basename "$CODE_FOLDER")
  FINAL_CODE_PATH="$CODE_PATH/$CODE_FOLDER_NAME"
fi

wget https://raw.githubusercontent.com/Libertai/libertai-agents/refs/heads/main/deployment/$2.Dockerfile -O $DOCKERFILE_PATH -q --no-cache
docker buildx build -q "$FINAL_CODE_PATH" \
  -f $DOCKERFILE_PATH \
  -t $IMAGE_NAME \
  --build-arg PYTHON_VERSION=3.12

# Run docker image
docker run --name $CONTAINER_NAME --env-file=$ENV_FILE_PATH -p 8000:8000 -d $IMAGE_NAME $ENTRYPOINT

# Cleanup
rm -f $ZIP_PATH
rm -rf $CODE_PATH
rm -f $DOCKERFILE_PATH