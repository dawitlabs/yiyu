DB_DSN := postgres://dawit:dawit@localhost:55432/yiyu?sslmode=disable

docker-up:
	docker-compose up -d postgres

docker-down:
	docker-compose down

migrate-up:
	goose -dir ./migrations postgres "$(DB_DSN)" up

migrate-down:
	goose -dir ./migrations postgres "$(DB_DSN)" down

migrate-status:
	goose -dir ./migrations postgres "$(DB_DSN)" status

setup-db:
	docker-compose up -d postgres
	sleep 3
	make migrate-up
