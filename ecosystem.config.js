module.exports = {
  apps: [
    {
      name: 'travelit-api',
      script: 'ts-node -r tsconfig-paths/register ./src/server.ts --watch',
      time: true,
      watch: true,
      // TZ: 'Asia/Seoul',
      // restart_delay: 5000,
      max_restarts: 5,
      min_uptime: 5000,
      instance_var: 'INSTANCE_ID',
      env: {
        PORT: 80,
        NODE_ENV: 'development',
      },
      env_production: {
        PORT: 3100,
        NODE_ENV: 'production',
      },
      env_local: {
        PORT: 3200,
        NODE_ENV: 'local',
      },
      env_test: {
        PORT: 3300,
        NODE_ENV: 'test',
      },
    },
  ],
};
