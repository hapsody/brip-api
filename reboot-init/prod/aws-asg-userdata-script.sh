# AWS User Data 스크립트입니다. 

#!/bin/bash
# logging
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo -e '\n $ whoami'
whoami
echo -e '\n $ sudo whoami'
sudo whoami

#wait to boot
#start=`date`
#echo -e 'sleep start: ' $start
#echo -e '\n $ sleep 60'
#sleep 60
#end=`date`
#echo -e 'sleep end: ' $end

echo -e '\n $ cd /home/ubuntu'
cd /home/ubuntu

# Install AWS CLI
echo -e '\n $ sudo apt-get update'
sudo apt-get update
echo -e '\n $ sudo apt-get install -y awscli'
sudo apt-get install -y awscli

# install AWS codedeploy-agent service
echo -e '\n $ sudo wget https://aws-codedeploy-ap-northeast-2.s3.amazonaws.com/latest/install' 
sudo wget https://aws-codedeploy-ap-northeast-2.s3.amazonaws.com/latest/install

echo -e '\n $ sudo apt-get install ruby -y'
sudo apt-get install ruby -y


echo -e '\n $ ls'
ls
echo -e '\n $ sudo chmod +x ./install'
sudo chmod +x ./install
echo -e '\n $ sudo ./install auto'
sudo ./install auto

echo -e '\n $ date >> sys-resource.log && sudo service codedeploy-agent status >> sys-resource.log'
date >> sys-resource.log && sudo service codedeploy-agent status >> sys-resource.log


# Download file from S3 bucket
# echo -e '\n $ sudo aws s3 cp s3://brip-dev/init_scripts/reboot-init/prod/ /home/ubuntu/.brip_init_scripts/ --recursive'
# sudo aws s3 cp s3://brip-dev/init_scripts/reboot-init/prod/ # /home/ubuntu/.brip_init_scripts/ --recursive

# Make file executable
# echo -e '\n $ sudo chmod +x /home/ubuntu/.brip_init_scripts/deploy.sh'
# sudo chmod +x /home/ubuntu/.brip_init_scripts/deploy.sh

# Execute script
# echo -e '\n $ sudo /home/ubuntu/.brip_init_scripts/deploy.sh'
# sudo /home/ubuntu/.brip_init_scripts/deploy.sh