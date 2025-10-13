---
layout: home

hero:
  name: "GitHub Repository Management API"
  text: "Sync, Search, and Analyze GitHub Repositories"
  tagline: A RESTful API built with NestJS, Prisma, and PostgreSQL
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: View on GitHub
      link: https://github.com/gguilhermepires/desafio_blue_otter

features:
  - icon: 🔄
    title: Repository Synchronization
    details: Sync all public repositories from any GitHub user to a local database with automatic updates

  - icon: 🔍
    title: Advanced Search
    details: Search repositories by keywords across name, description, and programming language with full-text capabilities

  - icon: 📊
    title: Statistical Insights
    details: Generate comprehensive statistics including language distribution, timeline analysis, and top users rankings

  - icon: 🐳
    title: Docker Ready
    details: Full Docker Compose setup with PostgreSQL and automatic migrations for easy deployment

  - icon: 🔒
    title: Enterprise Security
    details: Rate limiting, CORS configuration, Helmet middleware, and comprehensive input validation

  - icon: 📝
    title: Production Logging
    details: Async database logging with correlation IDs, structured JSON format, and 30-day retention

  - icon: ✅
    title: Well Tested
    details: 73% test coverage with unit, integration, and E2E tests using Jest and Supertest

  - icon: 📖
    title: Complete Documentation
    details: Interactive Swagger/OpenAPI docs and comprehensive VitePress documentation
---

## Quick Example

```bash
# Sync repositories for a GitHub user
curl -X POST http://localhost:3000/api/repositories/sync/octocat

# List repositories with pagination
curl http://localhost:3000/api/repositories/list/octocat?page=1&limit=10

# Search repositories by keywords
curl "http://localhost:3000/api/repositories/search?q=typescript+react"

# Get statistics
curl "http://localhost:3000/api/statistics?topN=10"
```

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Framework:** NestJS
- **Database:** PostgreSQL 16
- **ORM:** Prisma
- **Containers:** Docker + Docker Compose
- **Testing:** Jest + Supertest
- **Documentation:** Swagger/OpenAPI + VitePress

## Why This API?

This API serves as a powerful intermediary layer between GitHub's public API and your applications, offering:

- **Persistent Storage**: Keep repository data local for faster access and offline analysis
- **Advanced Search**: Full-text search capabilities not available in GitHub's native API
- **Analytics**: Pre-computed statistics and insights for better decision-making
- **Rate Limit Management**: Reduce GitHub API calls by caching data locally
- **Historical Tracking**: Monitor repository trends and changes over time

## Get Started

Get up and running in minutes:

1. **Clone the repository**
   ```bash
   git clone https://github.com/gguilhermepires/desafio_blue_otter.git
   cd desafio_blue_otter
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the API**
   - API: `http://localhost:3000`
   - Swagger Docs: `http://localhost:3000/api/docs`

That's it! The database will be automatically set up and migrations will run.

## Learn More

- [Getting Started Guide](/getting-started)
- [API Reference](/api/)
- [Architecture Overview](/architecture)
- [Development Guide](/development)
- [Deployment Instructions](/deployment)
