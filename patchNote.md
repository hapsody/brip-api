# 패치 노트 (2024-05-22)

### 서버 버전

`SD0.2.10`

### 호환 클라이언트 버전

- `CD-a1.1.8`, `CD-i1.1.8`
- `CD-a1.1.9`, `CD-i1.1.9`

### 수정 내용

- 클라이언트 이슈로 인해 한국 관광공사 TourAPI4 이미지를 brip s3로 이관하는 스크립트 작성 [#221](https://github.com/idealbloom/TravelIt-RN/issues/221)
- 이관한 사진의 경우 IBPhotos 데이터의 url과 key를 모두 갖게 되는데 이 경우 s3 key를 우선하여 접근가능한 url로 변환후 반환하도록 함
- getNrbyPlaceListWithGeoLoc의 페이지네이션 디폴트 cursor 값 오류 수정
- 로그인시 정보 반환값에 크리에이터 정보는 심사까지 완료되어야 반환되도록 수정함
- 이하 이전 버전과 호환성 문제 없음.

---

# 패치 노트 (2024-04-18)

### 서버 버전

`SD0.2.9`

### 호환 클라이언트 버전

- `CD-a1.1.8`, `CD-i1.1.8`
- `CD-a1.1.9`, `CD-i1.1.9`

### 수정 내용

- AppleInAppPurchaseAutoHookLog의 TItransactionId unique 제약사항 삭제
- 애플 서버로부터 noti된 transactionId가 속하는 거래원점이 새로운 구독으로 대체되면 기존 originalTransactionId로는 애플서버에서 조회가 되지 않아 발생하는 Exception으로 애플 서버에 200을 주지 못하던 현상 수정
- 클라이언트의 구독 요청시에 존재하는 PurchaseLog와 아직 관계되지 않던 HookLog중 originalTransactionId가 일치하면 관계를 형성하도록 수정함
- POST /adPlace/appleSubscribeAdPlace api의 검증 로직을 마지막 구독 트랜잭션이 클라이언트 transactionId와 일치하는지 확인하는 로직에서 마지막이 아니여도 결제내역중 존재하면 구독처리하도록 수정함
- 가게 조회할때 stop 상태인것도 반환하도록 수정함
- mainTourPlaceId가 null인 경우는 포함하지 않도록 수정함(정상적인 케이스에는 mainTourPlaceId가 존재하지 않을 수 없음)
- 회원탈퇴시에 adPlace 와 apple, google purchaseLog의 onUpdate, onDelete 제약사항이 설정되어 있지않아 user삭제가 되지 않던 현상 수정(마이그레이션 필요)
- dailyBatchJob expiresDate => expireDateFormat 필드 타입 변경으로 인한 스크립트 오류 수정

---
