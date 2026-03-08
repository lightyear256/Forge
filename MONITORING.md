# Monitoring Setup with Prometheus and Grafana

This project includes comprehensive monitoring using Prometheus and Grafana to track application performance, Docker container metrics, and code execution statistics.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start All Services

```bash
# From the project root directory
docker-compose up -d
```

This will start:

- **Backend** (Port 5000)
- **Frontend** (Port 3000)
- **Redis** (Port 6379)
- **MongoDB** (Port 27017)
- **Prometheus** (Port 9090)
- **Grafana** (Port 3001)

### 3. Access Monitoring Dashboards

#### Prometheus

- URL: http://localhost:9090
- No login required
- View raw metrics and execute PromQL queries

#### Grafana

- URL: http://localhost:3001
- Default credentials:
  - **Username**: `admin`
  - **Password**: `admin123`
- Pre-configured with Prometheus datasource and backend monitoring dashboard

## 📊 Available Metrics

### HTTP Metrics

- **http_requests_total**: Total number of HTTP requests (by method, route, status)
- **http_request_duration_ms**: Request duration in milliseconds (histogram)
- **active_connections**: Current number of active connections

### Application Metrics

- **code_executions_total**: Total code executions (by language and status)
- **code_execution_duration_ms**: Code execution duration (by language)
- **queue_jobs_total**: Total queue jobs (by queue and status)
- **queue_job_duration_ms**: Queue job duration (by queue)
- **docker_containers_total**: Docker containers count (by status)

### Node.js Default Metrics

- **process_cpu_user_seconds_total**: CPU usage
- **process_resident_memory_bytes**: Memory usage
- **nodejs_heap_size_total_bytes**: Heap size
- **nodejs_heap_size_used_bytes**: Used heap
- **nodejs_active_handles_total**: Active handles
- **nodejs_active_requests_total**: Active requests
- **nodejs_eventloop_lag_seconds**: Event loop lag

## 🎯 Using the Metrics

### View Metrics Endpoint

```bash
curl http://localhost:5000/metrics
```

### Example PromQL Queries

#### Request Rate (Requests per second)

```promql
rate(http_requests_total[5m])
```

#### 95th Percentile Response Time

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le, route))
```

#### Error Rate (5xx responses)

```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
```

#### Memory Usage

```promql
process_resident_memory_bytes
```

#### Active Docker Containers

```promql
docker_containers_total{status="running"}
```

## 📈 Pre-configured Dashboard

The included Grafana dashboard displays:

1. **HTTP Request Rate** - Requests per second over time
2. **HTTP Request Duration** - p95 and p99 latency
3. **Total Request Rate Gauge** - Current request rate
4. **Error Rate Gauge** - 5xx error rate
5. **Backend Memory Usage** - Memory consumption over time
6. **Backend CPU Usage** - CPU utilization
7. **Node.js Active Handles & Requests** - Internal Node.js metrics

## 🔧 Configuration

### Prometheus Configuration

Located at: `monitoring/prometheus.yml`

- Scrape interval: 15 seconds
- Scrape timeout: 10 seconds
- Data retention: 15 days

### Grafana Configuration

Located at: `monitoring/grafana/provisioning/`

- **Datasources**: `datasources/prometheus.yml`
- **Dashboards**: `dashboards/backend-dashboard.json`

### Modifying Scrape Intervals

Edit `monitoring/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "backend"
    scrape_interval: 10s # Change this value
    static_configs:
      - targets: ["backend:5000"]
```

Then restart Prometheus:

```bash
docker-compose restart prometheus
```

## 🛠️ Custom Metrics in Your Code

### Track Code Executions

```typescript
import { trackCodeExecution } from "./middleware/metricsMiddleware.js";

const start = Date.now();
try {
  // Execute code...
  const duration = Date.now() - start;
  trackCodeExecution("python", "success", duration);
} catch (error) {
  const duration = Date.now() - start;
  trackCodeExecution("python", "error", duration);
}
```

### Track Queue Jobs

```typescript
import { trackQueueJob } from "./middleware/metricsMiddleware.js";

const start = Date.now();
try {
  // Process job...
  const duration = Date.now() - start;
  trackQueueJob("interactive", "completed", duration);
} catch (error) {
  const duration = Date.now() - start;
  trackQueueJob("interactive", "failed", duration);
}
```

### Update Docker Metrics

```typescript
import { updateDockerMetrics } from "./middleware/metricsMiddleware.js";

// Update with current container counts
updateDockerMetrics(runningContainers, stoppedContainers);
```

## 🧹 Maintenance

### View Logs

```bash
# Prometheus logs
docker logs forge-prometheus

# Grafana logs
docker logs forge-grafana
```

### Restart Services

```bash
# Restart Prometheus
docker-compose restart prometheus

# Restart Grafana
docker-compose restart grafana
```

### Clear Data

```bash
# Stop services
docker-compose down

# Remove volumes (WARNING: This deletes all monitoring data)
docker volume rm online-code-editor_prometheus_data
docker volume rm online-code-editor_grafana_data

# Start fresh
docker-compose up -d
```

## 🔐 Security Considerations

### Production Deployment

1. **Change default Grafana password**
   - Edit `docker-compose.yml`
   - Update `GF_SECURITY_ADMIN_PASSWORD` environment variable

2. **Secure Prometheus**
   - Add authentication using reverse proxy (nginx, traefik)
   - Restrict access to internal network only

3. **Use HTTPS**
   - Configure SSL/TLS certificates
   - Use reverse proxy for SSL termination

4. **Firewall Configuration**
   ```bash
   # Only expose necessary ports
   # Keep 9090 (Prometheus) and 3001 (Grafana) internal
   ```

## 📦 Data Retention

### Prometheus

- Default retention: 15 days
- Modify in `docker-compose.yml`:
  ```yaml
  command:
    - "--storage.tsdb.retention.time=30d" # Change to 30 days
  ```

### Grafana

- Dashboards and settings are persisted in `grafana_data` volume
- Export dashboards for backup: Settings → Dashboards → Export

## 🐛 Troubleshooting

### Prometheus not scraping metrics

1. Check backend is running:

   ```bash
   curl http://localhost:5000/health
   ```

2. Check metrics endpoint:

   ```bash
   curl http://localhost:5000/metrics
   ```

3. Check Prometheus targets:
   - Go to http://localhost:9090/targets
   - Ensure backend target is "UP"

### Grafana shows "No Data"

1. Verify Prometheus datasource:
   - Grafana → Configuration → Data Sources
   - Test the connection

2. Check time range in dashboard
   - Ensure you're viewing recent data

3. Generate some traffic:
   ```bash
   # Hit the backend multiple times
   for i in {1..10}; do curl http://localhost:5000/health; done
   ```

### High Memory Usage

- Reduce Prometheus retention time
- Reduce scrape intervals
- Limit dashboard queries to shorter time ranges

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [prom-client (Node.js)](https://github.com/siimon/prom-client)

## 🎉 Next Steps

1. **Create custom dashboards** for specific use cases
2. **Set up alerting** in Grafana
3. **Add exporters** for Redis and MongoDB metrics
4. **Implement distributed tracing** with Jaeger or Zipkin
5. **Add log aggregation** with ELK stack or Loki
