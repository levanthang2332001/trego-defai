module.exports = {
  apps: [
    {
      name: 'tasmil-finance-server',
      script: 'dist/main.js',
      instances: 4, // Chỉ sử dụng 4 CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5555
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart policy
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // Watch mode (development)
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'dist',
        '.git',
        'uploads'
      ],
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Environment variables
      env_file: '.env',
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Listen timeout
      listen_timeout: 8000,
      
      // Cron restart (optional - restart every 24 hours)
      cron_restart: '0 2 * * *',
      
      // Merge logs
      merge_logs: true,
      
      // Source map support
      source_map_support: true,
      
      // Node options
      node_args: '--max-old-space-size=4096'
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/tasmil-finance.git',
      path: '/var/www/tasmil-finance',
      'pre-deploy-local': '',
      'post-deploy': 'cd server && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
}; 