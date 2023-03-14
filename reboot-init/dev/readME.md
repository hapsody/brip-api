본 경로에 있는 스크립트는 AWS EC2가 리부팅 될 경우 자동으로 서버 코드를 최신으로 업데이트 하고 pm2를 통해 node.js api 서버를 재구동하는 역할을 합니다.

### systemctl 서비스 등록 및 시작 명령 실행

~~brip-api-server-init.service 파일을 /etc/systemd/system/ 로 복사하고 아래의 커맨드를 입력하자~~

- (deprecated)

  ```bash
  $ sudo cp ./brip-api-server-init.service /etc/systemd/system/
  $ cd /etc/systemd/system

  $ sudo systemctl daemon-reload
  $ sudo systemctl enable brip-api-server-init.service

  $ sudo systemctl start brip-api-server-init.service
  ```

```
$ sudo ./reboot-init/dev/dev-deploy.sh
```

### AWS 를 이용한 시작 스크립트 배포

1. deploy.sh를 S3에 업로드한다.
2. AWS 사용자 데이터 스크립트에 해당 S3에서 스크립트를 다운로드 받아 실행하도록 사용자 데이터 스크립트를 작성해주자

   ```
    #!/bin/bash
    # Install AWS CLI
    sudo apt-get update
    sudo apt-get install -y awscli

    # Download file from S3 bucket
    aws s3 cp s3://brip-dev/init_scripts/reboot-init/dev/ /home/ubuntu/.brip_init_scripts/ --recursive

    # Make file executable
    sudo chmod +x /home/ubuntu/.brip_init_scripts/dev-deploy.sh

    # Execute script
    sudo /home/ubuntu/.brip_init_scripts/dev-deploy.sh
   ```

   아마 안될것이다. 왜냐면 S3에 접근할 권한이 없다.

3. 이때 명령을 실행할 주체(오토스케일링 그룹, EC2 등등..) 해당 S3에 접근할 권한을 줘야 하는데 이를 위해 AWS Console > IAM 에 들어가서 IAM Role을 하나 생성한다.
4. S3FullAccess 권한을 해당 IAM Role에 부여한다.
5. 아마 오토스케일링을 운영중이라면 오토스케일링 템플릿을 기존에 만들어놨을것이다. 해당 템플릿에 들어가서 수정(버전 생성)을 해주고 고급 세부정보쪽에서 IAM 인스턴스 프로파일에 생성한 IAM Role을 선택해주자.
6. 그 밑에 작성한 사용자 데이터 란에 2번에서 작성한 스크립트를 넣어주자.
