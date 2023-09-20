.PHONY: all

build:
	docker build -t chatbot-ui .

run:
	docker compose up -d

logs:
	docker logs -f chatbot-ui

push:
	docker tag chatbot-ui:latest ${DOCKER_USER}/${DOCKER_IMAGE}:${DOCKER_TAG}
	aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin ${DOCKER_USER}
	docker push ${DOCKER_USER}/${DOCKER_IMAGE}:${DOCKER_TAG}
