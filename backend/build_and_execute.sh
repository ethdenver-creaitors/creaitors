#!/bin/bash

IMAGE_NAME="creaitors-backend"
CONTAINER_NAME="creaitor-backend"

echo "Building Docker image '$IMAGE_NAME'..."
docker build -t $IMAGE_NAME .
if [ $? -ne 0 ]; then
  echo "Error building Docker image."
  exit 1
fi
echo "Docker Image '$IMAGE_NAME' build successfully."

docker run --network ip6net --name $IMAGE_NAME --env-file=./.env -p 8000:8000 -d $CONTAINER_NAME
if [ $? -ne 0 ]; then
  echo "Error executing IPv6 $CONTAINER_NAME container."
  exit 1
fi
echo "Docker container '$CONTAINER_NAME' successfully executed."
