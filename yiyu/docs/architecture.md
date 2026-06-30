Last updated: June 30, 2026

## 1. Project goal
Build a scalable, production-grade software from scratch using Go

## 2. High level architecture
Architecture style: Clean Architecture(Hexagonal) + COQS-ready

Client -> API layer (Fiber Handler) -> Application Service(Use cases) -> Domain layer (Buisness Logic) -> Ports (interfaces) -> Adapters(PostgreSQL, MiniIO, Asynq, Redis)

## 3. Core Principles
    > Domain logic is completly independent of frameworks and databases
    > High scalablity of day 1
    > Observablity first (logging , metrics, tracing)
    > Background process for heavy tasks( video transcoding)
    > Type safety wherever possible(sqlc + Go)


## 4. Data flow examples
    > user uploads video chunks -> api
    > save metadat to PostgreSQL
    > push transcoding job to Asynq queue
    > worker processing video using FFmpeg -> generates multiple resolutions + HLS
    > Update video status + notify user

## 5. key components
API,Fiber -> "HTTP handling ->  validation"
Database -> PostgreSQL -> Persistent storage
Object Storage -> MinIO / S3 -> "Video files, thumbnails"
Queue -> Asynq + Redis -> Background jobs
Cache -> Redis -> "Hot data, sessions, feeds"
Transcoding -> FFmpeg -> Video processing

## 6. Non functional requirements
    > Hanlde high RPS
    > Honzontal scalablity
    > Graceful shutdown
    > Proper error handling and retries
    > Rate limitng per user/IP

## 7. Future Evolution
    > Split into microservices
    > Add CDN support
    > Implement proper recommendation engine
    > Add live streaming
