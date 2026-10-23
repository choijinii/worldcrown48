/**
 * deployEnv — 지금 이 화면·서버가 어느 배포인가 (OPS-FIX-1 · 원장 D-66).
 *
 * 미리보기와 실서비스가 같은 Firebase 프로젝트를 쓴다. 그래서 "시험 대회를 숨길지"는 데이터가
 * 아니라 배포 종류로 정한다 — 실서비스(Vercel production)에서만 숨기고, 미리보기·로컬에서는
 * 시험이 자기 대회를 볼 수 있게 그대로 둔다.
 *
 * 값은 빌드 때 next.config.mjs 가 Vercel 의 `VERCEL_ENV` 를 `NEXT_PUBLIC_DEPLOY_ENV` 로
 * 옮겨 심는다(브라우저 번들과 서버 둘 다 같은 값). Vercel 설정 화면을 건드리지 않는다.
 * 모르는 값은 development — 실서비스로 오인하지 않는다(시험 대회가 보이는 쪽으로 틀린다).
 */
export type DeployEnv = "production" | "preview" | "development";

export function parseDeployEnv(v: string | undefined): DeployEnv {
  return v === "production" || v === "preview" ? v : "development";
}

export function currentDeployEnv(): DeployEnv {
  return parseDeployEnv(process.env.NEXT_PUBLIC_DEPLOY_ENV);
}
