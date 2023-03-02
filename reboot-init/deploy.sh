#!/bin/bash
#sudo ./server-init-script.sh
sudo cp ./brip-api-server-init.service /etc/systemd/system/
sudo cp ./sys-resource-log.service /etc/systemd/system/
cd /etc/systemd/system

sudo systemctl daemon-reload

sudo systemctl enable brip-api-server-init.service
sudo systemctl start brip-api-server-init.service

sudo systemctl enable sys-resource-log.service
sudo systemctl start sys-resource-log.service