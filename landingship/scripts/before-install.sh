#!/bin/bash
# logging to user-data.log
sudo bash -c 'exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1'

echo -e '\n $ sudo ln -s /home/ubuntu/.nvm/versions/node/v17.9.1/bin/yarn /usr/bin/yarn'
sudo ln -s /home/ubuntu/.nvm/versions/node/v17.9.1/bin/yarn /usr/bin/yarn
echo -e '\n $ sudo ln -s /home/ubuntu/.nvm/versions/node/v17.9.1/bin/pm2 /usr/bin/pm2'
sudo ln -s /home/ubuntu/.nvm/versions/node/v17.9.1/bin/pm2 /usr/bin/pm2
echo -e '\n $ sudo ln -s /home/ubuntu/.nvm/versions/node/v17.9.1/bin/node /usr/bin/node'
sudo ln -s /home/ubuntu/.nvm/versions/node/v17.9.1/bin/node /usr/bin/node

# source code latest fetch & build
function run_process () {
  echo -e '\n $ cd /home/ubuntu/travelit-api'
  cd /home/ubuntu/travelit-api
  echo -e '\n $ yarn stop'
  yarn stop
  echo -e '\n $ sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000'
  sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
  echo -e '\n $ git checkout -f'
  git checkout -f
  echo -e '\n $ git checkout prod'
  git checkout prod
  echo -e '\n $ git pull upstream prod --no-edit'
  git pull upstream prod --no-edit
  echo -e '\n $ git fetch --tags'
  git fetch --tags
  echo -e '\n $ yarn'
  yarn
  echo -e '\n $ yarn build'
  yarn build
  echo -e '\n $ yarn start'
  yarn start
}

run_process