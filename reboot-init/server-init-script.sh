#!/bin/bash
PATH=$PATH:/home/ubuntu/.nvm/versions/node/v17.9.1/bin:/usr/bin/git
HOME=/home/ubuntu
cd /home/ubuntu/travelit-api

sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
git checkout -f
git checkout dev 
git checkout -f
git pull upstream dev
yarn
yarn prisma db push -y
yarn restart