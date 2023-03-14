#!/bin/bash
#sudo ./server-init-script.sh
sudo cp /home/ubuntu/travelit-api/reboot-init/dev/brip-dev-api-server-init.service /etc/systemd/system/
sudo cp /home/ubuntu/travelit-api/reboot-init/dev/dev-sys-resource-log.service /etc/systemd/system/
cd /etc/systemd/system

sudo systemctl daemon-reload

sudo systemctl disable brip-dev-api-server-init.service
sudo systemctl enable brip-dev-api-server-init.service
sudo systemctl start brip-dev-api-server-init.service

sudo systemctl disable dev-sys-resource-log.service
sudo systemctl enable dev-sys-resource-log.service
sudo systemctl start dev-sys-resource-log.service