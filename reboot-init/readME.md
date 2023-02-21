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
$ sudo ./reboot-init/deploy.sh
```
