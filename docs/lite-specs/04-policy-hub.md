# Lite Spec — #4 Policy Hub 정책 페이지

## 컴포넌트 트리

```
<PolicyHub>
  <PolicyNav />                  # 정책 종류 좌측 사이드 네비
  <PolicyPage type={params.type}>
    <LanguageTabs lang={lang} onChange={setLang} />
    <PolicyContent lang={lang} type={type} />  # 마크다운 렌더링
```

## 라우팅

```
/policies/terms       → type="terms"
/policies/community   → type="community"
/policies/privacy     → type="privacy"
/policies/cookies     → type="cookies"
/notices              → NoticeList (공지사항)
```

## 콘텐츠 구조 (src/domains/policy/content/)

```
content/
  ko/
    terms.md
    community.md
    privacy.md
    cookies.md
  en/
    terms.md
    community.md
    privacy.md
    cookies.md
```

## 상태

```js
// 로컬 상태만 (전역 스토어 불필요)
const [lang, setLang] = useState('ko')  // 'ko' | 'en'
```

## 핵심 컴포넌트 Props

```ts
interface PolicyPageProps {
  type: 'terms' | 'community' | 'privacy' | 'cookies'
}

interface LanguageTabsProps {
  lang: 'ko' | 'en'
  onChange: (lang: 'ko' | 'en') => void
}
```

## UI 사양

- 레이아웃: 좌측 사이드바(정책 목록) + 우측 콘텐츠 (lg 이상)
- 모바일: 상단 드롭다운 선택
- 텍스트: `text-wc-muted`, 제목: `text-wc-text font-bold`
- 금지행위 표: 테두리 있는 테이블, 위반 수위별 배경색
- 이의신청 이메일: `policy@worldcrown48.com` 골드 링크
