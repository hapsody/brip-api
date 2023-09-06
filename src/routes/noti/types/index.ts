import { BookingChatActionType } from '@prisma/client';

// export type BookingChatMessageActionType =
//   | 'ASKBOOKINGWELCOME' /// 예약문의 첫 환영 인사 ex) 안녕하세요!궁금하신 내용을 보내주세요.가게에서 내용에 대한 답변을 드려요.
//   | 'NEWBOOKINGMSG' /// ex) 예약하기
//   | 'ANSNEWBOOKINGMSG' /// ex) 원하는 일자와 시간에 예약문의를 남겨주시면 가게에서 예약 가능여부를 확인해드려요!
//   | 'ASKBOOKINGAVAILABLE' /// 예약문의 고객 => 사업자 ex) 유쾌한인어님이7/3 월 14시 2명예약 가능여부를 문의했어요!
//   | 'ANSBOOKINGAVAILABLE' /// 예약문의답변 사업자 => 고객 ex) 예약이 불가능해요.같은 날짜에 예약이 꽉찼어요.
//   | 'ASKBOOKINGCANCEL' /// 예약 문의 취소 ex) 예약 취소
//   | 'ASKBOOKINGCANCELCHK' /// 예약문의 취소 system 확인 메시지 ex) 예약이 취소 되었어요.
//   | 'CONFIRMBOOKING' /// 예약확정 고객 => 사업자 ex) 네, 확정할게요
//   | 'ANSCONFIRMBOOKING' /// 예약확정 system 확인 메시지 ex) 예약 확정을 위해 연락처가 가게에 전달돼요.
//   | 'PRIVACYAGREE' /// 정보동의 고객 => 사업자 ex) 동의
//   | 'FINALBOOKINGCHECK' /// 예약 확정 system 확인 메시지 ex) 예약이 확정되었어요!확정된 예약은 마이북에서 볼 수 있어요.잊지 않고 예약일에 봬요!
//   | 'USERCANCELAFTERBOOKING' /// 예약 확정이후 유저 켄슬 ex) <유저이름>님의 <가게이름>의 9월 5일 15시 예약이 취소되었어요
//   | 'TEXT'; /// 일반 유저 채팅 메시지

export type BookingActionInputParam = {
  // askBookingAvailable
  date?: string; /// 예약일(문의일x)
  numOfPeople?: string; /// 예약 인원

  /// ansBookingAvailable
  answer?: 'APPROVE' | 'REJECT'; /// 예약문의 응답
  rejectReason?: BookingRejectReasonType; /// 예약문의가 거절일경우 거절사유

  /// askBookingCancel
  customerCancel?: 'TRUE' | 'FALSE'; /// 유저측 예약문의 취소여부

  /// confirmBooking
  confirmAnswer?: 'CONFIRM' | 'CANCEL'; /// 예약 확정 여부

  /// privacyAgree
  agreeAnswer?: 'TRUE' | 'FALSE'; /// 개인정보 이용동의

  /// finalBookingCheck
  reqUserNickname?: string; /// 예약문의를 요청한 고객
  reqUserContact: string | null; /// 고객 연락처
  /// date?: string;
  /// numOfPeople?: string;
};
export type ChatMessageType = {
  adPlaceId: string; /// 문의 업체,장소(adPlace) id, 사실상 예약문의 대화에서는 필수이다.
  from: string; /// 보내는 UserId
  to: string; /// 보낼 UserId
  createdAt: string; /// 메시지 전송된 시각
  order: string; /// 채팅방에서의 메시지 순번
  message: string; /// 메시지 본문
  bookingActionInputParams?: BookingActionInputParam;
  type: BookingChatActionType; /// 메시지 타입
};
export type BookingChatMessageType = ChatMessageType & {
  isUnread: boolean; /// 해당 메시지가 읽지 않은 새 메시지 상태인지 아닌지를 알기위한 프로퍼티. true이면 읽지 않은 새 메시지.
  customerId: string; /// 이 대화스레드의 고객 userId. 즉 문의를 시작한 사람
  companyId: string; /// 이 대화스레드의 업주 userId, 즉 문의를 받은 사람
  subjectGroupId?: string; /// 이 대화스레드가 DB에 저장된 이후 본 메시지를 해당 대화스레드에 포함시키려면 대화스레드를 대표하는 subjectGroupId를 보내줘야한다. booking 프로세스가 끝나서 DB sync가 이루어진 이후 프로세스의 sendBookingMsg 호출에 쓰임(USERCANCELAFTERBOOKING)
};

export type SysNotiActionType =
  | 'REPLYFORMYSHARETRIPMEM' /// 공유기억 게시글 댓글
  | 'REPLYFORMYREPLY' /// 대댓글
  | 'BOOKINGCOMPLETE' /// 예약완료
  | 'BOOKINGCUSTOMERCANCEL' /// 예약완료후 유저 취소
  | 'BOOKINGVISITED' /// 예약완료후 방문처리
  | 'BOOKINGCUSTOMERNOSHOW'; /// 예약완료후 고객 노쇼

export type SysNotiMessageType = {
  userId: string; /// 수신인 UserId
  userRole?: string; /// 수신인 유저의 역할( 크리에이터, 광고주, 일반유저) 추후 추가예정
  createdAt: string; /// 메시지 전송된 시각
  message: string; /// 메시지 본문
  type: SysNotiActionType; /// 메시지 타입
  // bookingActionInputParams?: BookingActionInputParam;
};

export type BookingRejectReasonType =
  | 'CLOSEDTIME'
  | 'INVALIDTIME'
  | 'FULLBOOKINGATDATE'
  | 'FULLBOOKINGONTIME'
  | 'INVALIDNUMOFPERSON';

export type RetrieveBookingMessageParamType = {
  // from: string; /// userId 기준
  // userId: string; /// userId 기준
  myRole?: 'customer' | 'company'; /// undefined인 경우는 lastMsg의 isUnread 상태를 업데이트하지 않는다.
  startOrder: string; /// redis에서 내가 받고자 하는 메시지가 삭제됐을 경우(DB sync하면 redis에서는 삭제됨.) DB에서 메시지를 찾기 위한 메시지 순번
  startCursor: string; /// redis에서 해당 인덱스를 포함한 이후의 메시지를 모두 읽는다.
  customerId: string;
  companyId: string;
};

export type LastBookingMessageType = {
  lastMsg: BookingChatMessageType;
  me: string | null;
  other: string | null;
};
