### systemctl 서비스 등록 및 시작 명령 실행

brip-api-server-init.service 파일을 /etc/systemd/system/ 로 복사하고 아래의 커맨드를 입력하자

```bash
$ sudo cp ./brip-api-server-init.service /etc/systemd/system/
$ cd /etc/systemd/system

$ sudo systemctl daemon-reload
$ sudo systemctl enable brip-api-server-init.service

$ sudo systemctl start brip-api-server-init.service
```
