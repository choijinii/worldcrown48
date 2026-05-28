# Lite Spec — #11 Crown Card 생성 + 미리보기 + 공유
# ✅ Step 1 업그레이드 — 2026-05-14
# 🔴 주요 수정: Candidate→Contestant, winner→champion, Canvas 크기

---

## ⛔ 절대 규칙
```
✅ Contestant, contestant, champion (❌ Candidate, candidate, winner)
✅ Crown Card 크기: 1200×630px (OG 이미지 비율) — UI 표시: max-w-[600px]
✅ "● AI-Report" 배지 표시 (AI 생성 콘텐츠 의무)
✅ Firebase Storage 업로드 후 crown_cards 컬렉션 저장
✅ 에이전트 C-2 담당 (MVP 1)
```

---

## 컴포넌트 트리

```
<CrownCardModal isOpen={...} champion={contestant} tournament={t}>  # ✅ champion
  <CrownCardCanvas ref={canvasRef} />
  <CardPreview src={previewUrl} />
  <ShareActions>
    <DownloadButton />
    <TwitterShareButton />
    <InstagramGuideButton />
  </ShareActions>
  {!user && <LoginPromptBanner reason="share" />}
```

## Canvas 렌더링 (1200×630px — OG 비율)

```ts
// ✅ 1200×630px (SNS OG 이미지 표준 비율)
// ❌ 1080×1080px (기존 정사각형 — 변경됨)

async function renderCrownCard(
  canvas: HTMLCanvasElement,
  { champion, tournament }: { champion: Contestant; tournament: Tournament }  // ✅
) {
  const ctx = canvas.getContext('2d')!
  canvas.width = 1200
  canvas.height = 630

  // 배경
  ctx.fillStyle = '#00003A'
  ctx.fillRect(0, 0, 1200, 630)

  // Gold 방사형 글로우
  const gradient = ctx.createRadialGradient(600, 315, 0, 600, 315, 400)
  gradient.addColorStop(0, 'rgba(252,208,6,0.15)')
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1200, 630)

  // Gold 테두리 프레임
  ctx.strokeStyle = '#FCD006'
  ctx.lineWidth = 6
  ctx.strokeRect(16, 16, 1168, 598)

  // Champion 이미지 (✅ champion — ❌ winner)
  const img = await loadImage(champion.imageUrl)
  ctx.drawImage(img, 100, 60, 400, 500)  // 좌측 배치

  // Champion 이름 (Playfair Display Italic)
  ctx.font = 'italic bold 64px "Playfair Display"'
  ctx.fillStyle = '#FCD006'
  ctx.textAlign = 'left'
  ctx.fillText(champion.name.toUpperCase(), 560, 240)

  // "CHAMPION" 레이블
  ctx.font = 'bold 24px Inter'
  ctx.fillStyle = '#B1B5C4'
  ctx.fillText('CHAMPION', 560, 180)

  // Tournament 제목
  ctx.font = 'bold 28px Inter'
  ctx.fillStyle = '#F2F2F5'
  ctx.fillText(tournament.title, 560, 320)

  // 워터마크
  ctx.font = 'bold 18px Inter'
  ctx.fillStyle = '#484B67'
  ctx.fillText('worldcrown48.com', 560, 580)

  // "● AI-Report" 배지 (✅ 의무 표시)
  ctx.font = '14px "JetBrains Mono"'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.textAlign = 'right'
  ctx.fillText('● AI-Report', 1180, 610)
}
```

## onCrownCardCreate Cloud Function

```ts
// functions/src/onCrownCardCreate.ts
// 트리거: advanceRound()가 결승 완료 → Firestore champion 확정 시

exports.onCrownCardCreate = onDocumentUpdated(
  'tournaments/{tournamentId}',
  async (event) => {
    const after = event.data.after.data()
    const before = event.data.before.data()

    if (before.status !== 'closed' && after.status === 'closed') {
      // Champion 이미지 생성 → Storage 업로드
      const cardBuffer = await generateCrownCardBuffer(after)
      const storageRef = ref(storage, `crown-cards/${event.params.tournamentId}.png`)
      await uploadBytes(storageRef, cardBuffer)
      const imageUrl = await getDownloadURL(storageRef)

      // crown_cards 컬렉션 저장
      await addDoc(collection(db, 'crown_cards'), {
        tournamentId: event.params.tournamentId,
        contestantId: after.championContestantId,  // ✅ (❌ winnerId)
        imageUrl,
        createdAt: serverTimestamp(),
      })
    }
  }
)
```

## 공유 흐름

```ts
function handleShare(platform: 'twitter' | 'download') {
  if (!user) {
    openLoginModal({ reason: 'share', onSuccess: () => handleShare(platform) })
    return
  }
  if (platform === 'twitter') {
    const text = `나의 Crown은 ${champion.name}! 너의 Crown은? 👑`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=worldcrown48.com`
    window.open(url, '_blank')
  }
  if (platform === 'download') {
    const link = document.createElement('a')
    link.download = `crown-card-${champion.name}.png`  // ✅ champion (❌ winner)
    link.href = canvasRef.current!.toDataURL('image/png')
    link.click()
  }
}
```

## Props

```ts
interface CrownCardModalProps {
  isOpen: boolean
  onClose: () => void
  champion: Contestant    // ✅ (❌ winner: Candidate)
  tournament: Tournament
}
```

## 표시 조건

```
Voter가 결승 완료 → advanceRound() 자동 실행 → isOpen: true 자동
비로그인: 카드 미리보기 ✅ / 공유·다운로드: 로그인 안내 오버레이
로그인:   모든 공유 기능 활성화
```
