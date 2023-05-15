#!/bin/bash
PATH=$PATH:/home/ubuntu/.nvm/versions/node/v17.9.1/bin:/usr/bin/git
HOME=/home/ubuntu
cd /home/ubuntu/travelit-api

# Set the maximum number of iterations to perform
#max_iterations=1200
iterations=0
waiting_time=20

# Define a function to check if the process is running
function is_process_running () {
  process_count=$(yarn pm2 list | awk '/^│/ && /travelit-api/ && !/PM2.*current.*/{count++} END{print count}')
  if [[ $process_count -gt 0 ]]
  then
    result=true
  else
    result=false
  fi
}

downloadAmazonRootCA1() {
    local file="/home/ubuntu/.ssh/AmazonRootCA1.pem"
    local download_url="https://www.amazontrust.com/repository/AmazonRootCA1.pem"

    if [ ! -f "$file" ]; then
        wget "$download_url" -P /tmp/
        mv "/tmp/AmazonRootCA1.pem" "$file"
        echo "AWS Cert File downloaded and moved to $file."
    else
        echo "AWS Cert File already exists. Skipping download."
    fi
}

function run_process () {
  sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
  git checkout -f
  git checkout dev
  git pull upstream dev --no-edit
  git fetch --tags
  yarn
  yarn prisma db push
  downloadAmazonRootCA1
  # yarn build
  # yarn restart
  yarn stop
  yarn start:dev
  yarn prismastudio
}

run_process

# Wait for the process to start
while true
do
  iterations=$((iterations+1))
  sleep $waiting_time
  is_process_running

  if [[ $result == true ]]
  then
    echo "try $iterations: live yet but keep watching..."
  else
    echo "try $iterations: re-launch script"
    run_process
    iterations=0
  fi
done