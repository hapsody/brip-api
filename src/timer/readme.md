### timer systemd 등록방법

1. /etc/systemd/system에 service파일과 timer 파일을 복사한다. .service 파일과 .timer 파일은 반드시 이름이 같아야 한다.

```sh
$ sudo cp daily.service daily.timer /etc/systemd/system/
```

2. timer를 systemd에 등록한다.

```sh
$ sudo systemctl enable daily
```

잘 등록되었는지 확인한다.

```sh
$ systemctl list-timers
```

```sh
$ sudo systemctl start daily.timer
$ sudo systemctl status daily.timer
```

잘 등록된 경우 아래와 같이 표시된다.

```sh
ubuntu@ip-172-31-45-141:/etc/systemd/system$ systemctl status daily.timer
● daily.timer - Locomotion Daily Check and Update
     Loaded: loaded (/etc/systemd/system/daily.timer; disabled; vendor preset: enabled)
     Active: active (waiting) since Wed 2022-01-19 09:29:58 UTC; 10s ago
    Trigger: Wed 2022-01-19 15:00:00 UTC; 5h 29min left
   Triggers: ● daily.service

Jan 19 09:29:58 ip-172-31-45-141 systemd[1]: Started Locomotion Daily Check and Update.
```
