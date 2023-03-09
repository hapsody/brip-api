#!/bin/bash
PATH=$PATH:/home/ubuntu/.nvm/versions/node/v17.9.1/bin:/usr/bin/git
HOME=/home/ubuntu
cd /home/ubuntu/travelit-api

# Set the maximum number of iterations to perform
max_iterations=1200
iterations=0
waiting_time=5

# Define a function to check if the process is running
function is_process_running () {
  process_count=$(yarn pm2 list | awk '/^│ 0\s+│ travelit-api/' | wc -l)
  if [[ $process_count -gt 0 ]]
  then
    result=true
  else
    result=false
  fi
}

function run_process () {
  sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
  git checkout -f
  git checkout dev
  git checkout -f
  git pull upstream dev
  git fetch --tags
  yarn
  yarn prisma db push
  yarn build
  yarn restart
  yarn prismastudio
}

run_process

# Wait for the process to start
while [ $iterations -lt $max_iterations ]
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