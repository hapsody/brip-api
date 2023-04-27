# AWS Codedeploy

landingship은 AWS Codedeploy agent 기능을 통해 event hook 과정중에 실행될 스크립트들을 모아놓은 문서입니다. appspec.yml에 정의되어 있는 event hook과 그에 대응되는 스크립트들에 따라 각 과정중에 스크립트들이 실행됩니다.

brip에서 실서버 배포하는 과정을 순서대로 나열하면 다음과 같습니다.

1. 오토스케일링 그룹 시작 템플릿을 통해 미리 동작하고 있는 서버 그룹이 있습니다.(실서버)
2. 오토스케일링 그룹 인스턴스들의 상태는 api 서버가 online 상태이고, reboot-init 에 있는 서비스 스크립트들이 동작하고 있는 상황입니다.
3. 오토스케일링 그룹 인스턴스들은 실서버 환경을 가정하고 있어 reboot-init/prod 에 해당하는 스크립트들이 동작하는 상태입니다.
4. before-install.sh은 새로 생성된 인스턴스(green)에서 동작하며, after-block-traffic.sh은 원본 인스턴스들(blue)에서 실행됩니다.
5. codedeploy blue/green 배포과정은 자동으로 green 인스턴스를 생성합니다.
6. green 인스턴스 부팅시에 미리 오토스케일링 그룹 템플릿에 정의된 사용자 데이터 스크립트를 실행합니다.(실행 스크립트는 reboot-init/prod/aws-asg-userdata-script.sh에 백업해두었습니다.)
7. 사용자 데이터 스크립트에서 AWS CLI 및 AWS Codedeploy agent를 설치합니다. (codedeploy agent가 before-install.sh 스크립트를 실행합니다.)
8. 오토스케일링 시작 템플릿은 pm2를 통해 node 서버가 구동되도록 하는 server-init-script.sh를 brip-api-server-init.service를 통해 시스템 데몬에 등록해 놓은 상태기 때문에, 템플릿을 통해 생성된 green 인스턴스가 부팅되면 travelit-api 서버를 pm2로 실행합니다.
9. 오토스케일링 그룹에 정의된 로드밸런서 타겟그룹(travelit-api-ELB-TG)에 green 인스턴스들이 대상 인스턴스로 등록됩니다.(ELB 연결)
10. 9번 과정을 통해 green 인스턴스들이 online 상태가 되며 blue/green 인스턴스가 모두 online인 상태가 됩니다.
11. blue 인스턴스에서 after-block-traffic event hook을 비롯한 잔여 이벤트가 진행됩니다.(현재는 스크립트에서 아무것도 실행하지 않도록 하였습니다.)
12. ELB 타겟그룹에서 blue 인스턴스들을 대상에서 drain 처리합니다.
13. blue 인스턴스들을 codedeploy 애플리케이션에서 설정한 시간만큼 pending 하였다가 종료합니다.
14. 만약 문제가 있다면 aws codedeploy에서 해당 배포를 중단하고 롤백할수 있습니다.(이 롤백이 RDS의 롤백을 의미하지는 않으며 오토스케일링 그룹에 속한 EC2 인스턴스들간의 교체입니다.)
15. 롤백을 진행하면 pending하였던 blue 인스턴스를 다시 ELB 대상그룹에 대상으로 등록하고 green 인스턴스를 대상그룹에서 제거합니다.
16. 배포가 완료됩니다.
