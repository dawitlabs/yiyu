FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /api ./cmd/api
RUN CGO_ENABLED=0 go build -o /worker ./cmd/worker

FROM alpine:3.21
RUN apk add --no-cache ffmpeg
COPY --from=build /api /usr/local/bin/api
COPY --from=build /worker /usr/local/bin/worker
COPY migrations /migrations
CMD ["api"]
