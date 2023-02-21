#!/bin/bash
PATH=$PATH:/home/ubuntu/.nvm/versions/node/v17.9.1/bin:/usr/bin/git
HOME=/home/ubuntu
cd /home/ubuntu/travelit-api

git checkout -f
git checkout dev
git checkout -f
git pull upstream dev
yarn
yarn prisma db push
yarn restart