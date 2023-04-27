## TourAPI 4.0 서비스분류코드표

```plainText

example)
서비스분류코드
0 depth
http://apis.data.go.kr/B551011/KorService1/categoryCode1?serviceKey=X8y0Ez971%2Bd6sSsaP%2BFCxWKqEWcEEykxgLB14eyTfqUQxCWxMO5imBd17Az7xY7aMp40RpLgfQgvvzmvPrxGgw%3D%3D&numOfRows=50&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json

1 depth A04
http://apis.data.go.kr/B551011/KorService1/categoryCode1?serviceKey=X8y0Ez971%2Bd6sSsaP%2BFCxWKqEWcEEykxgLB14eyTfqUQxCWxMO5imBd17Az7xY7aMp40RpLgfQgvvzmvPrxGgw%3D%3D&numOfRows=50&pageNo=1&MobileOS=ETC&MobileApp=AppTest&_type=json&cat1=A0101
```

    tourPlace는 여행일정의 방문지가 되는 데이터들로 여러 데이터 소스로부터 수집되었습니다.<br> 다음은 한국관광공사로부터 취한 데이터로 tourAPI 4.0 의 국문관광정보서비스 > 서비스분류코드에 요청하여 응답받은 관광공사 서비스 분류표입니다.<br> 한국관광공사 데이터는 이 분류체계를 바탕으로 자사 분류체계인 iBTravelTag로 매칭합니다.

```
[
  {
    "code": "A01",
    "name": "자연",
    "rnum": 1,
    "subCategory": [
      {
        "code": "A0101",
        "name": "자연관광지",
        "rnum": 1,
        "subCategory": [
          {
            "code": "A01010100",
            "name": "국립공원",
            "rnum": 1
          },
          {
            "code": "A01010200",
            "name": "도립공원",
            "rnum": 2
          },
          {
            "code": "A01010300",
            "name": "군립공원",
            "rnum": 3
          },
          {
            "code": "A01010400",
            "name": "산",
            "rnum": 4
          },
          {
            "code": "A01010500",
            "name": "자연생태관광지",
            "rnum": 5
          },
          {
            "code": "A01010600",
            "name": "자연휴양림",
            "rnum": 6
          },
          {
            "code": "A01010700",
            "name": "수목원",
            "rnum": 7
          },
          {
            "code": "A01010800",
            "name": "폭포",
            "rnum": 8
          },
          {
            "code": "A01010900",
            "name": "계곡",
            "rnum": 9
          },
          {
            "code": "A01011000",
            "name": "약수터",
            "rnum": 10
          },
          {
            "code": "A01011100",
            "name": "해안절경",
            "rnum": 11
          },
          {
            "code": "A01011200",
            "name": "해수욕장",
            "rnum": 12
          },
          {
            "code": "A01011300",
            "name": "섬",
            "rnum": 13
          },
          {
            "code": "A01011400",
            "name": "항구/포구",
            "rnum": 14
          },
          {
            "code": "A01011600",
            "name": "등대",
            "rnum": 15
          },
          {
            "code": "A01011700",
            "name": "호수",
            "rnum": 16
          },
          {
            "code": "A01011800",
            "name": "강",
            "rnum": 17
          },
          {
            "code": "A01011900",
            "name": "동굴",
            "rnum": 18
          }
        ]
      },
      {
        "code": "A0102",
        "name": "관광자원",
        "rnum": 2,
        "subCategory": [
          {
            "code": "A01020100",
            "name": "희귀동.식물",
            "rnum": 1
          },
          {
            "code": "A01020200",
            "name": "기암괴석",
            "rnum": 2
          }
        ]
      }
    ]
  },
  {
    "code": "A02",
    "name": "인문(문화/예술/역사)",
    "rnum": 2,
    "subCategory": [
      {
        "code": "A0201",
        "name": "역사관광지",
        "rnum": 1,
        "subCategory": [
          {
            "code": "A02010100",
            "name": "고궁",
            "rnum": 1
          },
          {
            "code": "A02010200",
            "name": "성",
            "rnum": 2
          },
          {
            "code": "A02010300",
            "name": "문",
            "rnum": 3
          },
          {
            "code": "A02010400",
            "name": "고택",
            "rnum": 4
          },
          {
            "code": "A02010500",
            "name": "생가",
            "rnum": 5
          },
          {
            "code": "A02010600",
            "name": "민속마을",
            "rnum": 6
          },
          {
            "code": "A02010700",
            "name": "유적지/사적지",
            "rnum": 7
          },
          {
            "code": "A02010800",
            "name": "사찰",
            "rnum": 8
          },
          {
            "code": "A02010900",
            "name": "종교성지",
            "rnum": 9
          },
          {
            "code": "A02011000",
            "name": "안보관광",
            "rnum": 10
          }
        ]
      },
      {
        "code": "A0202",
        "name": "휴양관광지",
        "rnum": 2,
        "subCategory": [
          {
            "code": "A02020200",
            "name": "관광단지",
            "rnum": 1
          },
          {
            "code": "A02020300",
            "name": "온천/욕장/스파",
            "rnum": 2
          },
          {
            "code": "A02020400",
            "name": "이색찜질방",
            "rnum": 3
          },
          {
            "code": "A02020500",
            "name": "헬스투어",
            "rnum": 4
          },
          {
            "code": "A02020600",
            "name": "테마공원",
            "rnum": 5
          },
          {
            "code": "A02020700",
            "name": "공원",
            "rnum": 6
          },
          {
            "code": "A02020800",
            "name": "유람선/잠수함관광",
            "rnum": 7
          }
        ]
      },
      {
        "code": "A0203",
        "name": "체험관광지",
        "rnum": 3,
        "subCategory": [
          {
            "code": "A02030100",
            "name": "농.산.어촌 체험",
            "rnum": 1
          },
          {
            "code": "A02030200",
            "name": "전통체험",
            "rnum": 2
          },
          {
            "code": "A02030300",
            "name": "산사체험",
            "rnum": 3
          },
          {
            "code": "A02030400",
            "name": "이색체험",
            "rnum": 4
          },
          {
            "code": "A02030600",
            "name": "이색거리",
            "rnum": 5
          }
        ]
      },
      {
        "code": "A0204",
        "name": "산업관광지",
        "rnum": 4,
        "subCategory": [
          {
            "code": "A02040400",
            "name": "발전소",
            "rnum": 1
          },
          {
            "code": "A02040600",
            "name": "식음료",
            "rnum": 2
          },
          {
            "code": "A02040800",
            "name": "기타",
            "rnum": 3
          },
          {
            "code": "A02040900",
            "name": "전자-반도체",
            "rnum": 4
          },
          {
            "code": "A02041000",
            "name": "자동차",
            "rnum": 5
          }
        ]
      },
      {
        "code": "A0205",
        "name": "건축/조형물",
        "rnum": 5,
        "subCategory": [
          {
            "code": "A02050100",
            "name": "다리/대교",
            "rnum": 1
          },
          {
            "code": "A02050200",
            "name": "기념탑/기념비/전망대",
            "rnum": 2
          },
          {
            "code": "A02050300",
            "name": "분수",
            "rnum": 3
          },
          {
            "code": "A02050400",
            "name": "동상",
            "rnum": 4
          },
          {
            "code": "A02050500",
            "name": "터널",
            "rnum": 5
          },
          {
            "code": "A02050600",
            "name": "유명건물",
            "rnum": 6
          }
        ]
      },
      {
        "code": "A0206",
        "name": "문화시설",
        "rnum": 6,
        "subCategory": [
          {
            "code": "A02060100",
            "name": "박물관",
            "rnum": 1
          },
          {
            "code": "A02060200",
            "name": "기념관",
            "rnum": 2
          },
          {
            "code": "A02060300",
            "name": "전시관",
            "rnum": 3
          },
          {
            "code": "A02060400",
            "name": "컨벤션센터",
            "rnum": 4
          },
          {
            "code": "A02060500",
            "name": "미술관/화랑",
            "rnum": 5
          },
          {
            "code": "A02060600",
            "name": "공연장",
            "rnum": 6
          },
          {
            "code": "A02060700",
            "name": "문화원",
            "rnum": 7
          },
          {
            "code": "A02060800",
            "name": "외국문화원",
            "rnum": 8
          },
          {
            "code": "A02060900",
            "name": "도서관",
            "rnum": 9
          },
          {
            "code": "A02061000",
            "name": "대형서점",
            "rnum": 10
          },
          {
            "code": "A02061100",
            "name": "문화전수시설",
            "rnum": 11
          },
          {
            "code": "A02061200",
            "name": "영화관",
            "rnum": 12
          },
          {
            "code": "A02061300",
            "name": "어학당",
            "rnum": 13
          },
          {
            "code": "A02061400",
            "name": "학교",
            "rnum": 14
          }
        ]
      },
      {
        "code": "A0207",
        "name": "축제",
        "rnum": 7,
        "subCategory": [
          {
            "code": "A02070100",
            "name": "문화관광축제",
            "rnum": 1
          },
          {
            "code": "A02070200",
            "name": "일반축제",
            "rnum": 2
          }
        ]
      },
      {
        "code": "A0208",
        "name": "공연/행사",
        "rnum": 8,
        "subCategory": [
          {
            "code": "A02080100",
            "name": "전통공연",
            "rnum": 1
          },
          {
            "code": "A02080200",
            "name": "연극",
            "rnum": 2
          },
          {
            "code": "A02080300",
            "name": "뮤지컬",
            "rnum": 3
          },
          {
            "code": "A02080400",
            "name": "오페라",
            "rnum": 4
          },
          {
            "code": "A02080500",
            "name": "전시회",
            "rnum": 5
          },
          {
            "code": "A02080600",
            "name": "박람회",
            "rnum": 6
          },
          {
            "code": "A02080800",
            "name": "무용",
            "rnum": 7
          },
          {
            "code": "A02080900",
            "name": "클래식음악회",
            "rnum": 8
          },
          {
            "code": "A02081000",
            "name": "대중콘서트",
            "rnum": 9
          },
          {
            "code": "A02081100",
            "name": "영화",
            "rnum": 10
          },
          {
            "code": "A02081200",
            "name": "스포츠경기",
            "rnum": 11
          },
          {
            "code": "A02081300",
            "name": "기타행사",
            "rnum": 12
          }
        ]
      }
    ]
  },
  {
    "code": "A03",
    "name": "레포츠",
    "rnum": 3,
    "subCategory": [
      {
        "code": "A0301",
        "name": "레포츠소개",
        "rnum": 1,
        "subCategory": [
          {
            "code": "A03010200",
            "name": "수상레포츠",
            "rnum": 1
          },
          {
            "code": "A03010300",
            "name": "항공레포츠",
            "rnum": 2
          }
        ]
      },
      {
        "code": "A0302",
        "name": "육상 레포츠",
        "rnum": 2,
        "subCategory": [
          {
            "code": "A03020200",
            "name": "수련시설",
            "rnum": 1
          },
          {
            "code": "A03020300",
            "name": "경기장",
            "rnum": 2
          },
          {
            "code": "A03020400",
            "name": "인라인(실내 인라인 포함)",
            "rnum": 3
          },
          {
            "code": "A03020500",
            "name": "자전거하이킹",
            "rnum": 4
          },
          {
            "code": "A03020600",
            "name": "카트",
            "rnum": 5
          },
          {
            "code": "A03020700",
            "name": "골프",
            "rnum": 6
          },
          {
            "code": "A03020800",
            "name": "경마",
            "rnum": 7
          },
          {
            "code": "A03020900",
            "name": "경륜",
            "rnum": 8
          },
          {
            "code": "A03021000",
            "name": "카지노",
            "rnum": 9
          },
          {
            "code": "A03021100",
            "name": "승마",
            "rnum": 10
          },
          {
            "code": "A03021200",
            "name": "스키/스노보드",
            "rnum": 11
          },
          {
            "code": "A03021300",
            "name": "스케이트",
            "rnum": 12
          },
          {
            "code": "A03021400",
            "name": "썰매장",
            "rnum": 13
          },
          {
            "code": "A03021500",
            "name": "수렵장",
            "rnum": 14
          },
          {
            "code": "A03021600",
            "name": "사격장",
            "rnum": 15
          },
          {
            "code": "A03021700",
            "name": "야영장,오토캠핑장",
            "rnum": 16
          },
          {
            "code": "A03021800",
            "name": "암벽등반",
            "rnum": 17
          },
          {
            "code": "A03022000",
            "name": "서바이벌게임",
            "rnum": 18
          },
          {
            "code": "A03022100",
            "name": "ATV",
            "rnum": 19
          },
          {
            "code": "A03022200",
            "name": "MTB",
            "rnum": 20
          },
          {
            "code": "A03022300",
            "name": "오프로드",
            "rnum": 21
          },
          {
            "code": "A03022400",
            "name": "번지점프",
            "rnum": 22
          },
          {
            "code": "A03022600",
            "name": "스키(보드) 렌탈샵",
            "rnum": 23
          },
          {
            "code": "A03022700",
            "name": "트래킹",
            "rnum": 24
          }
        ]
      },
      {
        "code": "A0303",
        "name": "수상 레포츠",
        "rnum": 3,
        "subCategory": [
          {
            "code": "A03030100",
            "name": "윈드서핑/제트스키",
            "rnum": 1
          },
          {
            "code": "A03030200",
            "name": "카약/카누",
            "rnum": 2
          },
          {
            "code": "A03030300",
            "name": "요트",
            "rnum": 3
          },
          {
            "code": "A03030400",
            "name": "스노쿨링/스킨스쿠버다이빙",
            "rnum": 4
          },
          {
            "code": "A03030500",
            "name": "민물낚시",
            "rnum": 5
          },
          {
            "code": "A03030600",
            "name": "바다낚시",
            "rnum": 6
          },
          {
            "code": "A03030700",
            "name": "수영",
            "rnum": 7
          },
          {
            "code": "A03030800",
            "name": "래프팅",
            "rnum": 8
          }
        ]
      },
      {
        "code": "A0304",
        "name": "항공 레포츠",
        "rnum": 4,
        "subCategory": [
          {
            "code": "A03040100",
            "name": "스카이다이빙",
            "rnum": 1
          },
          {
            "code": "A03040200",
            "name": "초경량비행",
            "rnum": 2
          },
          {
            "code": "A03040300",
            "name": "헹글라이딩/패러글라이딩",
            "rnum": 3
          },
          {
            "code": "A03040400",
            "name": "열기구",
            "rnum": 4
          }
        ]
      },
      {
        "code": "A0305",
        "name": "복합 레포츠",
        "rnum": 5,
        "subCategory": [
          {
            "code": "A03050100",
            "name": "복합 레포츠",
            "rnum": 1
          }
        ]
      }
    ]
  },
  {
    "code": "A04",
    "name": "쇼핑",
    "rnum": 4,
    "subCategory": [
      {
        "code": "A0401",
        "name": "쇼핑",
        "rnum": 1,
        "subCategory": [
          {
            "code": "A04010100",
            "name": "5일장",
            "rnum": 1
          },
          {
            "code": "A04010200",
            "name": "상설시장",
            "rnum": 2
          },
          {
            "code": "A04010300",
            "name": "백화점",
            "rnum": 3
          },
          {
            "code": "A04010400",
            "name": "면세점",
            "rnum": 4
          },
          {
            "code": "A04010500",
            "name": "대형마트",
            "rnum": 5
          },
          {
            "code": "A04010600",
            "name": "전문매장/상가",
            "rnum": 6
          },
          {
            "code": "A04010700",
            "name": "공예/공방",
            "rnum": 7
          },
          {
            "code": "A04010900",
            "name": "특산물판매점",
            "rnum": 8
          },
          {
            "code": "A04011000",
            "name": "사후면세점",
            "rnum": 9
          }
        ]
      }
    ]
  },
  {
    "code": "A05",
    "name": "음식",
    "rnum": 5,
    "subCategory": [
      {
        "code": "A0502",
        "name": "음식점",
        "rnum": 1,
        "subCategory": [
          {
            "code": "A05020100",
            "name": "한식",
            "rnum": 1
          },
          {
            "code": "A05020200",
            "name": "서양식",
            "rnum": 2
          },
          {
            "code": "A05020300",
            "name": "일식",
            "rnum": 3
          },
          {
            "code": "A05020400",
            "name": "중식",
            "rnum": 4
          },
          {
            "code": "A05020700",
            "name": "이색음식점",
            "rnum": 5
          },
          {
            "code": "A05020900",
            "name": "카페/전통찻집",
            "rnum": 6
          },
          {
            "code": "A05021000",
            "name": "클럽",
            "rnum": 7
          }
        ]
      }
    ]
  },
  {
    "code": "B02",
    "name": "숙박",
    "rnum": 6,
    "subCategory": [
      {
        "code": "B0201",
        "name": "숙박시설",
        "rnum": 1,
        "subCategory": [
          {
            "code": "B02010100",
            "name": "관광호텔",
            "rnum": 1
          },
          {
            "code": "B02010500",
            "name": "콘도미니엄",
            "rnum": 2
          },
          {
            "code": "B02010600",
            "name": "유스호스텔",
            "rnum": 3
          },
          {
            "code": "B02010700",
            "name": "펜션",
            "rnum": 4
          },
          {
            "code": "B02010900",
            "name": "모텔",
            "rnum": 5
          },
          {
            "code": "B02011000",
            "name": "민박",
            "rnum": 6
          },
          {
            "code": "B02011100",
            "name": "게스트하우스",
            "rnum": 7
          },
          {
            "code": "B02011200",
            "name": "홈스테이",
            "rnum": 8
          },
          {
            "code": "B02011300",
            "name": "서비스드레지던스",
            "rnum": 9
          },
          {
            "code": "B02011600",
            "name": "한옥",
            "rnum": 10
          }
        ]
      }
    ]
  },
  {
    "code": "C01",
    "name": "추천코스",
    "rnum": 7,
    "subCategory": [
      {
        "code": "C0112",
        "name": "가족코스",
        "rnum": 1,
        "subCategory": [
          {
            "code": "C01120001",
            "name": "가족코스",
            "rnum": 1
          }
        ]
      },
      {
        "code": "C0113",
        "name": "나홀로코스",
        "rnum": 2,
        "subCategory": [
          {
            "code": "C01130001",
            "name": "나홀로코스",
            "rnum": 1
          }
        ]
      },
      {
        "code": "C0114",
        "name": "힐링코스",
        "rnum": 3,
        "subCategory": [
          {
            "code": "C01140001",
            "name": "힐링코스",
            "rnum": 1
          }
        ]
      },
      {
        "code": "C0115",
        "name": "도보코스",
        "rnum": 4,
        "subCategory": [
          {
            "code": "C01150001",
            "name": "도보코스",
            "rnum": 1
          }
        ]
      },
      {
        "code": "C0116",
        "name": "캠핑코스",
        "rnum": 5,
        "subCategory": [
          {
            "code": "C01160001",
            "name": "캠핑코스",
            "rnum": 1
          }
        ]
      },
      {
        "code": "C0117",
        "name": "맛코스",
        "rnum": 6,
        "subCategory": [
          {
            "code": "C01170001",
            "name": "맛코스",
            "rnum": 1
          }
        ]
      }
    ]
  }
]
```
