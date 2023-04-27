module.exports = {
  apps: [
    {
      name: 'travelit-api-dev',
      script:
        'ts-node -r tsconfig-paths/register ./src/server.ts  --ignore-watch=category_result.txt',
      ignore_watch: ['category_result.txt', 'node_modules'],
      time: true,
      watch: true,
      // TZ: 'Asia/Seoul',
      // restart_delay: 5000,
      max_restarts: 3,
      min_uptime: 5000,
      instance_var: 'INSTANCE_ID',
      env: {
        PORT: 3000,
        NODE_ENV: 'development',
      },
      // env_production: {
      //   PORT: 3000,
      //   NODE_ENV: 'production',
      // },
      // env_local: {
      //   PORT: 3000,
      //   NODE_ENV: 'local',
      // },
      // env_test: {
      //   PORT: 3000,
      //   NODE_ENV: 'test',
      // },
    },
    {
      name: 'travelit-api-dev-multicore',
      script: './src/server.ts',
      ignore_watch: ['category_result.txt', 'node_modules'],
      time: true,
      watch: true,
      // TZ: 'Asia/Seoul',
      // restart_delay: 5000,
      max_restarts: 3,
      min_uptime: 5000,
      instance_var: 'INSTANCE_ID',
      env: {
        PORT: 3000,
        NODE_ENV: 'development',
      },
      exec_mode: 'cluster',
      // exec_iterpreter: 'ts-node',
      interpreter_args: '-r tsconfig-paths/register',
      instances: -1,
    },
    {
      name: 'travelit-api-prod',
      script:
        'node -r ts-node/register/transpile-only -r tsconfig-paths/register dist/server.js',
      time: true,
      watch: false,
      // TZ: 'Asia/Seoul',
      // restart_delay: 5000,
      max_restarts: 3,
      min_uptime: 5000,
      instance_var: 'INSTANCE_ID',
      // env: {
      //   PORT: 3000,
      //   NODE_ENV: 'development',
      // },
      env_production: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
      // env_local: {
      //   PORT: 3000,
      //   NODE_ENV: 'local',
      // },
      // env_test: {
      //   PORT: 3000,
      //   NODE_ENV: 'test',
      // },
    },
    {
      name: 'travelit-api-prod-multicore',
      script: 'dist/server.js',
      time: true,
      watch: false,
      // TZ: 'Asia/Seoul',
      // restart_delay: 5000,
      max_restarts: 3,
      min_uptime: 5000,
      instance_var: 'INSTANCE_ID',
      env_production: {
        PORT: 3000,
        NODE_ENV: 'production',
      },
      exec_mode: 'cluster',
      interpreter_args:
        '-r ts-node/register/transpile-only -r tsconfig-paths/register',
      // exec_iterpreter: 'node',
      instances: 2,
    },
    {
      name: 'prismastudio',
      script: 'prisma studio --browser none',
      time: true,
      watch: true,
    },
  ],
};
