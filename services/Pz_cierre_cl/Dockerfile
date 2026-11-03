FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY *.go ./
RUN go test ./... && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /worker .

FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=build /worker /usr/local/bin/worker
USER 65532:65532
ENTRYPOINT ["/usr/local/bin/worker"]
