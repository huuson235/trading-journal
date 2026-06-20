// pm2 config for the backend
module.exports = {
  apps: [
    {
      name: 'backend',
      script: 'npm',
      args: 'run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
    },
  ],
}