// pm2 config for the backend
module.exports = {
  apps: [
    {
      name: 'trading-journal-backend',
      script: 'npm run start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
    },
  ],
}