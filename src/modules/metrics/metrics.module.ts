import { Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeHistogramProvider,
  makeGaugeProvider,
} from '@willsoto/nestjs-prometheus';

const metricsProviders = [
    // HTTP Metrics
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),

    // Repository Sync Metrics
    makeCounterProvider({
      name: 'repository_sync_total',
      help: 'Total number of repository sync operations',
      labelNames: ['username', 'status'],
    }),
    makeHistogramProvider({
      name: 'repository_sync_duration_seconds',
      help: 'Duration of repository sync operations in seconds',
      labelNames: ['username'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    }),
    makeGaugeProvider({
      name: 'repositories_synced',
      help: 'Number of repositories synced from GitHub',
      labelNames: ['username'],
    }),

    // GitHub API Metrics
    makeCounterProvider({
      name: 'github_api_requests_total',
      help: 'Total number of GitHub API requests',
      labelNames: ['endpoint', 'status'],
    }),
    makeHistogramProvider({
      name: 'github_api_request_duration_seconds',
      help: 'Duration of GitHub API requests in seconds',
      labelNames: ['endpoint'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    }),

    // Database Query Metrics
    makeCounterProvider({
      name: 'database_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'model'],
    }),
    makeHistogramProvider({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'model'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    }),

    // Search Metrics
    makeCounterProvider({
      name: 'repository_searches_total',
      help: 'Total number of repository searches',
      labelNames: ['has_query', 'has_language', 'has_description'],
    }),
    makeHistogramProvider({
      name: 'repository_search_duration_seconds',
      help: 'Duration of repository search operations in seconds',
      labelNames: ['has_filters'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    }),
    makeGaugeProvider({
      name: 'repository_search_results',
      help: 'Number of results returned from repository searches',
    }),

    // Statistics Metrics
    makeCounterProvider({
      name: 'statistics_calculations_total',
      help: 'Total number of statistics calculations',
      labelNames: ['username'],
    }),
    makeHistogramProvider({
      name: 'statistics_calculation_duration_seconds',
      help: 'Duration of statistics calculations in seconds',
      labelNames: ['username'],
      buckets: [0.1, 0.5, 1, 2, 5],
    }),

    // Application Health Metrics
    makeGaugeProvider({
      name: 'app_info',
      help: 'Application information',
      labelNames: ['version', 'node_version', 'environment'],
    }),
    makeGaugeProvider({
      name: 'active_connections',
      help: 'Number of active connections',
    }),
];

@Module({
  providers: metricsProviders,
  exports: metricsProviders,
})
export class MetricsModule {}
