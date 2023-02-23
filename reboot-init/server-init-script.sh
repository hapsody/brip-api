#!/bin/bash
PATH=$PATH:/home/ubuntu/.nvm/versions/node/v17.9.1/bin:/usr/bin/git
HOME=/home/ubuntu
cd /home/ubuntu/travelit-api

# Set the maximum number of iterations to perform
max_iterations=10
iterations=0
waiting_time=60

# Define a function to check if the process is running
function is_process_running {
  process_count=$(yarn pm2 list | awk '/travelit-api/' | wc -l)
  if [[ $process_count -gt 0 ]]
  then
    return 0
  else
    return 1
  fi
}

function run_process {
  sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
  git checkout -f
  git checkout dev
  git checkout -f
  git pull upstream dev
  git fetch --tags
  yarn
  yarn prisma db push
  yarn restart
}


run_process

# Wait for the process to start
while [ $iterations -lt $max_iterations ]
do
  if is_process_running
  then
    sleep $wating_time
  else
    iterations=$((iterations+1))
    echo "try $iterations"
    sleep $wating_time
    run_process
  fi
done