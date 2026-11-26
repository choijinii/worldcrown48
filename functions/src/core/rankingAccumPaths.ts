/**
 * rankingAccumPaths — T5 서버 전용 컬렉션 이름만 둔다(가져오는 것 없음).
 *
 * 대회 삭제(`tournamentAdminStore`)는 이 이름들만 필요하다. `rankingAccumStore` 를 직접
 * 가져오면 `firebase-functions`(logger)까지 끌려와, 루트 E2E(`e2e/arena2-admin.spec.ts` ·
 * `e2e/labManage.ts`)가 functions 패키지를 설치하지 않은 CI 에서 "Cannot find module
 * 'firebase-functions'" 로 시작도 못 한다(#185 ARENA-2 검사). 이 파일에는 import 를 넣지 않는다.
 */
export const ACCUM = "ranking_accum",
  REQUESTS = "ranking_recount_requests",
  JOBS = "ranking_recount_jobs";
