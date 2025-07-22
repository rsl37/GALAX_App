# GALAX - Beta Deployment Guide

## 🚀 Pre-Deployment Checklist

### Environment Setup
- [ ] Production server configured
- [ ] Domain name configured
- [ ] SSL certificate installed
- [ ] Environment variables set
- [ ] Data directory created with proper permissions

### Database Setup
- [ ] SQLite database file created
- [ ] All tables and indexes created
- [ ] Database permissions configured
- [ ] Backup strategy implemented
- [ ] <!-- Added 2025-07-18 21:40:07: For production scaling, consider migration to PostgreSQL/MySQL. Add migration documentation if planning to scale beyond SQLite. -->

### Security Configuration
- [ ] JWT_SECRET generated (32+ characters)
- [ ] CORS origins configured
- [ ] File upload limits set
- [ ] Rate limiting implemented (if needed)

## 🔧 Environment Variables

Create a `.env` file in production with:

```env
# Server Configuration
NODE_ENV=production
PORT=3001

# Database
DATA_DIRECTORY=/path/to/production/data

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=GALAX Support <noreply@yourdomain.com>
# <!-- Added 2025-07-18 21:40:07: For production, recommend using a transactional email provider (SendGrid, Mailgun, SES) instead of Gmail SMTP for reliability and compliance. -->

# Frontend URL (for password reset emails)
FRONTEND_URL=https://yourdomain.com
```

## 🏗️ Deployment Steps

### 1. Server Preparation
```bash
# Create application directory
mkdir -p /opt/galax
cd /opt/galax

# Create data directory
mkdir -p /opt/galax/data
mkdir -p /opt/galax/data/uploads
chmod 755 /opt/galax/data
chmod 755 /opt/galax/data/uploads

# Create logs directory
mkdir -p /opt/galax/logs
```

### 2. Code Deployment
```bash
# Copy application files
# (This depends on your deployment method)

# Install dependencies
npm ci --omit=dev

# Build the application
npm run build
```
<!-- Added 2025-07-18 21:40:07: If using Docker or another orchestrator, document container build and deployment steps here. -->

### 3. Database Initialization
```bash
# The database will be automatically created on first run
# Monitor the logs to ensure successful initialization
```

### 4. Process Management (PM2 Example)
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'galax-api',
    script: './dist/server/index.js',
    cwd: '/opt/galax',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
EOF

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```
<!-- Added 2025-07-18 21:40:07: Check that "script" path matches your actual build output. -->

### 5. Reverse Proxy (Nginx Example)
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # <!-- Added 2025-07-18 21:40:07: Recommend automating SSL certificate renewal with Let’s Encrypt (see SSL renewal section below). -->

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Serve static files
    location / {
        root /opt/galax/dist/public;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API routes
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded files
    location /uploads {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # File upload size limit
    client_max_body_size 10M;
}
```
<!-- Added 2025-07-18 21:40:07: For scaling, consider using S3/CDN for file uploads. Add integration steps as needed. -->

## 🔍 Health Checks

### Application Health
```bash
# Check if application is running
curl https://yourdomain.com/api/health

# Check database connection
curl https://yourdomain.com/api/test-db

# Check PM2 status
pm2 status
pm2 logs galax-api
```

### Database Health
```bash
# Check database file exists
ls -la /opt/galax/data/database.sqlite

# Check database tables
sqlite3 /opt/galax/data/database.sqlite "SELECT name FROM sqlite_master WHERE type='table';"
```

## 📊 Monitoring & Logging

### Log Files
- Application logs: `/opt/galax/logs/`
- PM2 logs: `pm2 logs galax-api`
- Nginx logs: `/var/log/nginx/`

### Key Metrics to Monitor
- Server response times
- Database query performance
- Memory usage
- Disk space (uploads directory)
- Active WebSocket connections
- API endpoint usage

### Monitoring Commands
```bash
# Check server resources
htop
df -h
du -sh /opt/galax/data/uploads

# Check application performance
pm2 monit

# Check database size
ls -lh /opt/galax/data/database.sqlite
```
<!-- Added 2025-07-18 21:40:07: Consider integrating external monitoring tools (Prometheus, Grafana, Datadog) for advanced metrics and alerting. -->

## 🔒 Security Considerations

### File Permissions
```bash
# Set proper permissions
chown -R nodejs:nodejs /opt/galax
chmod -R 755 /opt/galax
chmod -R 644 /opt/galax/data/*.sqlite
```

### Firewall Configuration
```bash
# Only allow necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### SSL Certificate Renewal
```bash
# If using Let's Encrypt
certbot renew --dry-run

# Add to crontab for automatic renewal
0 2 * * * /usr/bin/certbot renew --quiet
```

### <!-- Added 2025-07-18 21:40:07: Add WAF (Web Application Firewall) and DDoS protection for public-facing platforms. -->
- Consider solutions like Cloudflare or AWS WAF for edge security.

### <!-- Added 2025-07-18 21:40:07: Add security vulnerability scanning (npm audit, dependabot, etc), especially for web3 environments. -->
- Run `npm audit` regularly and review dependabot alerts.
- For web3, monitor smart contract vulnerabilities and node updates.

## 🔧 Maintenance Tasks

### Daily Tasks
- [ ] Check application logs for errors
- [ ] Verify disk space availability
- [ ] Monitor memory usage

### Weekly Tasks
- [ ] Database backup
- [ ] Log rotation
- [ ] Security updates
- [ ] <!-- Added 2025-07-18 21:40:07: Run vulnerability scans (npm audit, dependabot etc) -->

### Monthly Tasks
- [ ] Full system backup
- [ ] Performance review
- [ ] Dependency updates

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Session store (Redis)
- Database clustering
- File storage (S3/CDN)
- <!-- Added 2025-07-18 21:40:07: For Web3, document scaling for blockchain nodes or external services if applicable. -->

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching
- Connection pooling

## 🔍 <!-- Added 2025-07-18 21:40:07: Rollback Steps -->
### Deployment Rollback Steps
```bash
# If deployment fails, restore previous build
pm2 stop galax-api
git checkout <last-working-commit>
npm ci --omit=dev
npm run build
pm2 start ecosystem.config.js
```

## 🚨 Troubleshooting

### Common Issues

**Application Won't Start**
```bash
# Check logs
pm2 logs galax-api

# Check environment variables
pm2 show galax-api

# Check database permissions
ls -la /opt/galax/data/
```

**Database Connection Issues**
```bash
# Check database file
file /opt/galax/data/database.sqlite

# Check database integrity
sqlite3 /opt/galax/data/database.sqlite "PRAGMA integrity_check;"
```

**High Memory Usage**
```bash
# Restart application
pm2 restart galax-api

# Check for memory leaks
pm2 monit
```

**File Upload Issues**
```bash
# Check uploads directory
ls -la /opt/galax/data/uploads/
chmod 755 /opt/galax/data/uploads/

# Check disk space
df -h
```

## 📞 Support Contacts

- **Technical Lead**: [Your Contact] <!-- Added 2025-07-18 21:40:07: Replace placeholder with real contact before production. -->
- **DevOps**: [Your Contact] <!-- Added 2025-07-18 21:40:07: Replace placeholder with real contact before production. -->
- **Emergency**: [Your Contact] <!-- Added 2025-07-18 21:40:07: Replace placeholder with real contact before production. -->

## 🎯 Success Metrics

Monitor these KPIs during beta:
- User registration rate
- Help request creation rate
- Crisis alert response time
- User engagement metrics
- System uptime
- API response times
- Error rates

---

**Note**: This guide assumes a Linux-based production environment. Adjust commands and paths as needed for your specific setup.

<!-- Added 2025-07-18 21:40:07: If frontend is deployed separately (e.g., Vercel, Netlify), add deployment steps for UI assets. -->
