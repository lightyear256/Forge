# Forge

Forge is a web-based code execution platform that allows users to write, compile, and run code directly from their browser. It provides a lightweight development environment with support for multiple programming languages. Code execution is handled securely using Docker containers and a queue-based job system.

Live Demo:
https://forge.ayushmaan.tech

## Features

- Web-based code editor
- Support for multiple programming languages
- Secure code execution using isolated Docker containers
- Queue-based job processing for scalable execution
- Real-time compilation and execution feedback
- Clean and minimal user interface
- **Monitoring with Prometheus and Grafana** 📊
  - Application performance metrics
  - Docker container monitoring
  - Real-time dashboards
  - Custom metrics for code executions

> 📈 **For monitoring setup and configuration**, see [MONITORING.md](MONITORING.md)

## Tech Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Monaco Editor

### Backend

- Node.js
- Express.js
- BullMQ
- Redis
- Docker

### Infrastructure

- Docker Compose
- Nginx reverse proxy
- AWS EC2
- Let's Encrypt SSL

## Architecture

User Request
|
v
Frontend (Next.js)
|
v
Backend API (Express)
|
v
Job Queue (BullMQ + Redis)
|
v
Worker
|
v
Docker Container Execution

## Project Structure

```
Forge
│
├── backend
│ ├── src
│ ├── Dockerfile
│ └── package.json
│
├── frontend
│ ├── app
│ ├── components
│ ├── Dockerfile
│ └── package.json
│
├── docker-compose.yml
├── MEMORY_LEAK_FIXES.md
└── README.md
```

## Supported Languages

The platform supports execution for several programming languages including:

- C
- C++
- Python
- JavaScript
- Java
- Rust
- Ruby

Each language runs in its own isolated Docker environment.

## Local Development Setup

### Clone the repository

```
git clone https://github.com/lightyear256/Forge.cd Forge
```

### Configure environment variables

Create a `.env` file in the project root.

Example:

```
NEXT_PUBLIC_API_URL=http://localhost:5000

NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

### Start the services

```
Frontend: http://localhost:3000

Backend: http://localhost:5000

Prometheus: http://localhost:9090

Grafana: http://localhost:3001 (admin/admin123)
```

## Production Deployment

The platform can be deployed using Docker and Nginx.

Example architecture:

```
Internet
|
v
Nginx
├── forge.domain.com -> Frontend
└── forge.api.domain.com -> Backend
```

SSL can be configured using Certbot with Let's Encrypt.

## Security

- Code execution runs inside isolated Docker containers
- Job queue prevents server overload
- Redis manages execution jobs
- Nginx handles reverse proxy and HTTPS

## Future Improvements

- User authentication
- Rate limiting
- Code sharing links
- Multi-file projects
- Collaborative coding
- Execution logs

## Author

Ayushmaan Kumar

GitHub:
https://github.com/lightyear256
