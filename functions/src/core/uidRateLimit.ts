/**
 * uidRateLimit — per-uid 토큰 버킷 (LAB-EV-1 §8 쿼터 방어).
 *
 * aiFillContestants가 파일 안에 직접 들고 있던 패턴을 팩토리로 뽑았다. 검수기는
 * 어드민 전용이라 남용 위험은 낮지만, 유튜브 API 쿼터는 **프로젝트 단위 일일
 * 10,000유닛**이고 실수로 검증 버튼을 연타하면 그날치가 사라진다. 시계는 주입
 * 받으므로(now) 순수하게 테스트된다.
 *
 * 인스턴스 메모리 기반(교차 인스턴스 아님) — 콜드 스타트에 초기화되는 게 정상이다.
 */
export interface UidRateLimiter {
  /** 허용되면 true. 창이 지나면 자동으로 리셋된다. */
  check(uid: string, now: number): boolean;
}

export function createUidRateLimiter(limit: number, windowMs: number): UidRateLimiter {
  const buckets = new Map<string, { count: number; windowStart: number }>();
  return {
    check(uid: string, now: number): boolean {
      const bucket = buckets.get(uid);
      if (!bucket || now - bucket.windowStart >= windowMs) {
        buckets.set(uid, { count: 1, windowStart: now });
        return true;
      }
      bucket.count += 1;
      return bucket.count <= limit;
    },
  };
}
