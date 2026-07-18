# StudySync Backend

Spring Boot microservices + PostgreSQL, run offline via Docker Compose.

## Run it
From this folder:

    docker compose up --build

First run downloads images + libraries (needs internet once); after that it is cached.

## Try the real endpoints (auth-service on http://localhost:8081)

Register (PowerShell):
    curl -Method POST http://localhost:8081/api/auth/register `
      -ContentType "application/json" `
      -Body '{"username":"ama","email":"ama@example.com","password":"secret12","userType":"STUDENT"}'

Login:
    curl -Method POST http://localhost:8081/api/auth/login `
      -ContentType "application/json" `
      -Body '{"usernameOrEmail":"ama","password":"secret12"}'

Other:
- Health:  http://localhost:8081/actuator/health
- Ping:    http://localhost:8081/api/auth/ping

## Stop it
Ctrl+C, then:  docker compose down   (data is kept; use -v only to wipe the DB)

## Status
Auth-service now does real registration + login (JWT access token, BCrypt hashing,
PostgreSQL). Roles: STUDENT, TUTOR, ADMIN. Refresh tokens + more services come next.
