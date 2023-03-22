const { execSync } = require('child_process');
const path = require('path');

const actionDirectory = path.join(__dirname, '..');
const command = `npm ci --prefix "${actionDirectory}"`;

console.log('Installing dependencies...');
execSync(command, { stdio: 'inherit' });
console.log('Dependencies installed.');
