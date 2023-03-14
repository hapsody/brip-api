#!/bin/bash
#sudo ./server-init-script.sh
sudo cp /home/ubuntu/travelit-api/reboot-init/prod/brip-api-server-init.service /etc/systemd/system/
sudo cp /home/ubuntu/travelit-api/reboot-init/prod/sys-resource-log.service /etc/systemd/system/
cd /etc/systemd/system

sudo systemctl daemon-reload

sudo systemctl disable brip-api-server-init.service
sudo systemctl enable brip-api-server-init.service
sudo systemctl start brip-api-server-init.service

sudo systemctl disable sys-resource-log.service
sudo systemctl enable sys-resource-log.service
sudo systemctl start sys-resource-log.service