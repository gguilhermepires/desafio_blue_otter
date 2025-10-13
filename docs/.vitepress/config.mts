import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'GitHub Repository Management API',
  description: 'REST API for synchronizing, managing, and analyzing GitHub repositories',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'API', link: '/api/' },
      { text: 'Architecture', link: '/architecture' },
      { text: 'Development', link: '/development' },
      { text: 'Deployment', link: '/deployment' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quick Start', link: '/getting-started' },
          { text: 'Configuration', link: '/configuration' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Overview', link: '/api/' },
          { text: 'Repositories', link: '/api/repositories' },
          { text: 'Statistics', link: '/api/statistics' },
          { text: 'Error Handling', link: '/api/errors' }
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'System Design', link: '/architecture' },
          { text: 'Database Schema', link: '/database' },
          { text: 'Security', link: '/security' }
        ]
      },
      {
        text: 'Development',
        items: [
          { text: 'Development Guide', link: '/development' },
          { text: 'Testing', link: '/testing' },
          { text: 'Contributing', link: '/contributing' }
        ]
      },
      {
        text: 'Deployment',
        items: [
          { text: 'Docker Setup', link: '/deployment' },
          { text: 'Production', link: '/production' },
          { text: 'Troubleshooting', link: '/troubleshooting' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/gguilhermepires/desafio_blue_otter' }
    ],

    footer: {
      message: 'Built with NestJS, Prisma, and PostgreSQL',
      copyright: 'Copyright © 2025 Guilherme Pires'
    }
  }
})
