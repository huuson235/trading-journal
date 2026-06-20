// PM2 config — .cjs because package.json has "type": "module"
const path = require('path')

module.exports = {
  apps: [
    {
      name: 'trading-journal-backend',
      cwd: __dirname,
      script: 'src/server.js',
      interpreter: 'node',
      node_args: '--env-file=.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
