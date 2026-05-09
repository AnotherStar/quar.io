const appName = 'quar'
const deployHost = process.env.PM2_DEPLOY_HOST || 'quar.io'
const deployRepo = process.env.PM2_DEPLOY_REPO || 'git@github.com:AnotherStar/quar.io.git'
const deployRef = process.env.PM2_DEPLOY_REF || 'origin/main'

module.exports = {
  apps: [
    {
      name: appName,
      cwd: '/var/www/quar/deploy/current',
      script: 'node',
      args: '--env-file=.env .output/server/index.mjs',
      exec_mode: 'fork',
      instances: 1,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '4200',
        NITRO_HOST: '127.0.0.1',
        NITRO_PORT: '4200'
      }
    }
  ],

  deploy: {
    production: {
      user: 'quar',
      host: deployHost,
      ref: deployRef,
      repo: deployRepo,
      path: '/var/www/quar/deploy',
      'post-setup': 'mkdir -p /var/www/quar/shared',
      'post-deploy': [
        'ln -sfn /var/www/quar/shared/.env .env',
        'corepack enable',
        'corepack prepare pnpm@10.33.0 --activate',
        'pnpm install --frozen-lockfile',
        'pnpm db:push',
        'pnpm db:seed',
        'pnpm build',
        'pm2 startOrReload ecosystem.config.cjs --env production',
        'pm2 save'
      ].join(' && ')
    }
  }
}
