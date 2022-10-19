import { PrismaClient } from '@prisma/client';

// import { getAllTextSearchPages } from '@src/routes/schedule/schedule';
// import { TextSearchReqParams } from '@src/routes/schedule/types/schduleTypes';
import { getAllTextSearchPages } from '../routes/schedule/schedule';
import { TextSearchReqParams } from '../routes/schedule/types/schduleTypes';

const prisma = new PrismaClient();
const locationTitle = 'jeju';
const textSearchReqParams: TextSearchReqParams[] = [
  {
    /// 육지 액티비티 > 테마파크
    keyword: `recreation forest in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 육지 액티비티 > 카트장
    keyword: `카트 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 육지 액티비티 > 육지 레포츠
    keyword: `leisure in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 육지 액티비티 > 패러 글라이딩
    keyword: `paragliding in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 육지 액티비티 > 패러 글라이딩
    keyword: `paragliding in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 골프 > 골프 cc
    keyword: `golf cc in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 골프 > 골프 클럽
    keyword: `golfclub in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 휴양 > 휴양림
    keyword: `recreation forest in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 휴양 > 숲길
    keyword: `숲길 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 휴양 > 요트
    keyword: `yacht tour in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 휴양 > 오름
    keyword: `오름 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 휴양 > 자연경관
    keyword: `natural landscape in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 휴양 > 해안선
    keyword: `shoreline trail in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 바다 액티비티 > 해양 레포츠
    keyword: `해양 레포츠 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 바다 액티비티 > 서핑
    keyword: `surf in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 바다 액티비티 > 해양 스포츠
    keyword: `해양스포츠 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 바다 액티비티 > 보트
    keyword: `boat in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 그룹 액티비티 > 골프
    keyword: `golf in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 그룹 액티비티 > 체험
    keyword: `activity in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 그룹 액티비티 > 오름
    keyword: `oruem in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 그룹 액티비티 > 단체 체험
    keyword: `체험 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 방문 > 제주 방문지
    keyword: `방문지 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 방문 > 제주 관광명소
    keyword: `관광명소 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 방문 > 제주 테마파크
    keyword: `theme park in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 방문 > 제주 숲길
    keyword: `숲길 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 방문 > 제주 오름
    keyword: `oruem in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 방문 > 자연경관
    keyword: `natural landscape in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 방문 > 해안선
    keyword: `shoreline trail in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 명소 > 관광명소
    keyword: `관광명소 in ${locationTitle}`,
    loadAll: true,
  },
  {
    /// 명소 > 관광명소
    keyword: `관광명소 in ${locationTitle}`,
    loadAll: true,
  },
];

async function batchJob() {
  const lastOne = await prisma.batchQueryParams.findFirst({
    orderBy: { id: 'desc' },
  });

  const results: google.maps.places.IBPlaceResult[][] = [];
  // eslint-disable-next-line no-restricted-syntax
  for await (const v of textSearchReqParams) {
    const result = await getAllTextSearchPages({
      textSearchReqParams: v,
      batchJobId: lastOne ? Number(lastOne.id) + 1 : 1,
      loopLoadAll: v.loadAll,
    });
    results.push(result);
  }
  console.log(JSON.stringify(results, null, 2));

  // const promises = textSearchReqParams.map(v => {
  //   return getAllTextSearchPages({
  //     textSearchReqParams: v,
  //     batchJobNo: lastOne?.batchJobNo ?? 1,
  //     loopLoadAll: v.loadAll,
  //   });
  // });

  // const batchRes = await prisma.$transaction(promises);
  // console.log(batchRes);
}

function wrapper(func: () => Promise<void>): () => void {
  return () => {
    func().catch(e => console.error(e));
  };
}

batchJob()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(
    wrapper(async () => {
      await prisma.$disconnect();
    }),
  );
