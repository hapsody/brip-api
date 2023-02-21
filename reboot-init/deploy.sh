#!/bin/bash
sudo cp ./brip-api-server-init.service /etc/systemd/system/
cd /etc/systemd/system

sudo systemctl daemon-reload
sudo systemctl enable brip-api-server-init.service

sudo systemctl start brip-api-server-init.service