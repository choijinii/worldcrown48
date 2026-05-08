# Lite Spec — #5 Vercel + Cloudflare 배포 파이프라인

## vercel.json

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

## Vercel 환경변수 설정

| 변수명 | Scope |
|---|---|
| VITE_FIREBASE_* | Production + Preview |
| VITE_ADMIN_UID | Production only |
| VITE_CLAUDE_FUNCTION_URL | Production + Preview |

## Cloudflare DNS 설정

```
Type   Name              Content            Proxy
A      worldcrown48.com  76.76.21.21        ✅ (Proxied)
CNAME  www               cname.vercel-dns.com ✅ (Proxied)
```

## 배포 흐름

```
git push origin main
  → Vercel 자동 감지 → npm run build → 배포
  → worldcrown48.com 반영 (평균 45초)

PR 오픈
  → preview-{branch}.worldcrown48.com 자동 생성
```

## Acceptance Criteria

- `https://worldcrown48.com` HTTPS 강제 리다이렉트
- SPA 라우팅 `/arena/123` 직접 접근 가능 (rewrites 설정)
- Cloudflare Analytics 활성화
- 배포 후 Firebase 연결 정상 확인
