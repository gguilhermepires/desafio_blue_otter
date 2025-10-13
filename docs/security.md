# Security

Security guidelines and best practices for the GitHub Repository Management API.

## Security Features

The API implements multiple layers of security:

### 1. HTTP Security Headers (Helmet)

Helmet middleware sets secure HTTP headers:

```typescript
app.use(helmet());
```

**Headers Applied:**
- `Content-Security-Policy` - Prevents XSS attacks
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: SAMEORIGIN` - Prevents clickjacking
- `X-XSS-Protection: 1; mode=block` - Enables XSS filter
- `Strict-Transport-Security` - Enforces HTTPS
- `Referrer-Policy: no-referrer` - Controls referrer information

### 2. CORS (Cross-Origin Resource Sharing)

Configurable origin whitelist:

```typescript
app.enableCors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Configuration:**
```env
CORS_ORIGINS="https://trusted-domain.com,https://app.example.com"
```

### 3. Rate Limiting

Protects against DoS and brute force attacks:

```env
THROTTLE_TTL=60        # 60 seconds
THROTTLE_LIMIT=100     # 100 requests
```

**Implementation:**
- Per-IP address tracking
- Sliding window algorithm
- Returns 429 Too Many Requests

### 4. Input Validation

All inputs validated with class-validator:

```typescript
class SearchDto {
  @IsString()
  @IsNotEmpty()
  q: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number;
}
```

**Protection Against:**
- SQL injection (via Prisma parameterized queries)
- NoSQL injection (not applicable)
- Command injection
- XSS attacks

### 5. Error Handling

Secure error responses:

**Production:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "correlationId": "uuid"
}
```

**Development:**
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "DatabaseConnectionError",
  "stack": "Error: ...",
  "correlationId": "uuid"
}
```

## Security Best Practices

### Environment Variables

**Never commit sensitive data:**

```bash
# .gitignore (already configured)
.env
.env.local
.env.production
*.pem
*.key
```

**Required for production:**
- Strong database passwords
- GitHub tokens with minimal scopes
- Unique secret keys

### Database Security

**Connection Security:**
```env
# Use SSL in production
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**User Permissions:**
```sql
-- Create application user with limited privileges
CREATE USER api_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Repository" TO api_user;
GRANT SELECT, INSERT ON TABLE "Log" TO api_user;
```

**Password Requirements:**
- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, symbols
- Rotate every 90 days

### API Security

**Rate Limiting:**
```env
# Production settings
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

**CORS Configuration:**
```env
# Restrict to known origins
CORS_ORIGINS="https://yourdomain.com,https://api.yourdomain.com"
```

**Request Validation:**
- All DTOs use class-validator
- Whitelist known properties
- Forbid non-whitelisted properties

### GitHub Token Security

**Token Scopes:**
```
public_repo  # Read-only access to public repositories
```

**Token Storage:**
```env
# Store in environment variable
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# Never log tokens
logger.debug('Fetching from GitHub', { token: '[REDACTED]' });
```

**Token Rotation:**
- Rotate every 90 days
- Revoke immediately if compromised
- Use separate tokens for dev/staging/prod

### Logging Security

**Safe Logging:**
```typescript
// Good - No sensitive data
logger.log('User synced', { username: 'octocat' });

// Bad - Sensitive data logged
logger.log('Auth token', { token: token }); // Never do this
```

**Log Access:**
- Restrict database log access
- Implement log retention policy
- Monitor for suspicious patterns

## Security Checklist

### Development

- [ ] `.env` file in `.gitignore`
- [ ] Input validation on all endpoints
- [ ] Parameterized database queries (Prisma)
- [ ] Error messages don't expose internals
- [ ] Dependencies up to date
- [ ] No hardcoded secrets in code

### Deployment

- [ ] Strong database password
- [ ] CORS restricted to known origins
- [ ] Rate limiting enabled
- [ ] Helmet middleware configured
- [ ] HTTPS/TLS enabled
- [ ] GitHub token with minimal scopes
- [ ] Environment variables secured
- [ ] Log retention configured

### Production

- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] Monitor logs for suspicious activity
- [ ] Incident response plan
- [ ] Regular backups
- [ ] Credential rotation schedule

## Vulnerability Management

### Dependency Scanning

**Check for vulnerabilities:**
```bash
npm audit
```

**Fix vulnerabilities:**
```bash
npm audit fix
```

**Force update:**
```bash
npm audit fix --force
```

### Regular Updates

**Update dependencies:**
```bash
# Check outdated packages
npm outdated

# Update to latest
npm update

# Update specific package
npm install package@latest
```

**Update strategy:**
- Review changelogs before updating
- Test in staging environment
- Update regularly (monthly)
- Monitor security advisories

## Common Vulnerabilities

### SQL Injection

**Protected by Prisma:**
```typescript
// Safe - Parameterized query
await prisma.repository.findMany({
  where: { owner: userInput }
});

// Prisma generates: SELECT * FROM "Repository" WHERE owner = $1
```

### XSS (Cross-Site Scripting)

**Protected by:**
- Content-Security-Policy headers
- Input validation
- Output encoding (automatic with JSON)

### CSRF (Cross-Site Request Forgery)

**Protection:**
- CORS configuration
- SameSite cookie attributes (if using sessions)

### Authentication Bypass

**Current status:**
- No authentication required (public API)

**Future implementation:**
- JWT tokens
- API keys
- OAuth 2.0

### Denial of Service

**Protected by:**
- Rate limiting (100 req/min per IP)
- Request timeout
- Connection pooling

### Mass Assignment

**Protected by:**
```typescript
@ValidationPipe({
  whitelist: true,              // Strip unknown properties
  forbidNonWhitelisted: true,   // Reject unknown properties
})
```

## Incident Response

### Security Incident Checklist

1. **Identify**
   - Monitor logs for unusual activity
   - Check error rates
   - Review rate limit violations

2. **Contain**
   - Block malicious IPs
   - Revoke compromised tokens
   - Isolate affected systems

3. **Investigate**
   - Review logs with correlation IDs
   - Identify attack vector
   - Assess damage

4. **Remediate**
   - Patch vulnerabilities
   - Rotate credentials
   - Update security rules

5. **Document**
   - Document incident details
   - Record actions taken
   - Update procedures

### Emergency Procedures

**Revoke GitHub Token:**
```bash
# Go to GitHub Settings → Developer settings → Personal access tokens
# Find token and click "Delete"
# Update environment variable with new token
```

**Block IP Address:**
```bash
# Nginx
echo "deny 1.2.3.4;" >> /etc/nginx/blocked-ips.conf
nginx -s reload

# iptables
iptables -A INPUT -s 1.2.3.4 -j DROP
```

**Database Lockdown:**
```sql
-- Revoke all privileges
REVOKE ALL ON DATABASE github_repos FROM PUBLIC;

-- Reset password
ALTER USER api_user WITH PASSWORD 'new_secure_password';
```

## Compliance

### GDPR Considerations

**Data collected:**
- Public repository data (from GitHub)
- IP addresses (for rate limiting)
- Request logs

**User rights:**
- Right to access: Provide API endpoints
- Right to deletion: Implement data deletion
- Right to portability: JSON API responses

### Data Retention

**Logs:**
```env
LOG_RETENTION_DAYS=30
```

**Repository Data:**
- Kept indefinitely (public data)
- Can be deleted on request

## Security Resources

### Tools

- **npm audit** - Dependency vulnerability scanning
- **Snyk** - Continuous security monitoring
- **OWASP ZAP** - Security testing
- **Helmet** - Security headers

### References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NestJS Security](https://docs.nestjs.com/security/helmet)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [GitHub Token Security](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure)

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email: security@example.com (replace with your email)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (if any)

**Response time:** 48 hours for acknowledgment

## Next Steps

- [Architecture Overview](/architecture)
- [Deployment Guide](/deployment)
- [Configuration](/configuration)
- [Production Checklist](/production)
