---
name: Bug report
about: Create a report to help us improve
title: "[Error] title"
labels: bug, priority:p2
assignees: ''

---

발생일시:
-------
2021-09-23 15:00경

재현환경:
------
OS version: N/A
node version: N/A
android api version : N/A
ios api version : N/A


재현경로: 
--------
android 실 기기에서 pineapple 앱 실행 > Ranking으로 보이는 아무 챌린지나 탭 > 플레이어 셔플창 올라오고 play 버튼 탭 > progress bar 드래깅

기대결과: 
---
재생중 원하는 곳으로 점프 또는 되돌리기 가능해야함.

현상: 
-----
progress bar를 탭해서 특정 지점으로 점프하거나 드래깅해서 fast forward / rewind 시도시 progress bar 100%로 이동하고 
탭을 다시시도해도 무감현상이 일어남.

첨부 화면: 
------
![Screenshot_20210923-152415](https://user-images.githubusercontent.com/87967403/134462780-2a411225-e6b9-402e-995b-de7e843241e2.png)

첨부 로그: 
-----
<details>
<summary>log</summary>
```
Remote debugger is in a background tab which may cause apps to perform slowly. Fix this by
```
</details>
