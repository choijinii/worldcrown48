# Lite Spec — #11 Crown Card 생성 + 미리보기 + 공유

## 컴포넌트 트리

```
<CrownCardModal isOpen={...} winner={candidate} tournament={t}>
  <CrownCardCanvas ref={canvasRef} />      # HTML Canvas 렌더링
  <CardPreview src={previewUrl} />         # canvas.toDataURL() 이미지
  <ShareActions>
    <DownloadButton />                     # PNG 다운로드 (로그인 필요)
    <TwitterShareButton />                 # 트윗 창 열기 (로그인 필요)
    <InstagramGuideButton />              # 다운로드 후 업로드 안내
  </ShareActions>
  {!user && <LoginPromptBanner reason="share" />}
```

## Canvas 렌더링 (1080×1080)

```js
function renderCrownCard(canvas, { winner, tournament }) {
  const ctx = canvas.getContext('2d')
  canvas.width = 1080
  canvas.height = 1080

  // 배경
  ctx.fillStyle = '#05070A'
  ctx.fillRect(0, 0, 1080, 1080)

  // 골드 테두리
  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth = 8
  ctx.strokeRect(24, 24, 1032, 1032)

  // 골드 글로우 효과
  ctx.shadowColor = '#FFD700'
  ctx.shadowBlur = 40

  // 우승자 이미지 (center crop)
  const img = await loadImage(winner.image_url)
  ctx.drawImage(img, 140, 120, 800, 700)

  // 우승자 이름 (Playfair Display Italic)
  ctx.font = 'italic 72px Playfair Display'
  ctx.fillStyle = '#FFD700'
  ctx.textAlign = 'center'
  ctx.fillText(winner.name.toUpperCase(), 540, 900)

  // 토너먼트 제목
  ctx.font = 'bold 28px Inter'
  ctx.fillStyle = '#F8FAFC'
  ctx.fillText(tournament.title, 540, 960)

  // 워터마크
  ctx.font = 'bold 20px Inter'
  ctx.fillStyle = '#64748B'
  ctx.fillText('WORLD CROWN 48 · worldcrown48.com', 540, 1040)
}
```

## 공유 흐름

```js
function handleShare(platform) {
  if (!user) {
    openLoginModal({ reason: 'share', onSuccess: () => handleShare(platform) })
    return
  }
  if (platform === 'twitter') {
    const text = `나의 Crown은 ${winner.name}! 너의 Crown은? 👑`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=worldcrown48.com`
    window.open(url, '_blank')
  }
  if (platform === 'download') {
    const link = document.createElement('a')
    link.download = `crown-card-${winner.name}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }
}
```

## Props

```ts
interface CrownCardModalProps {
  isOpen: boolean
  onClose: () => void
  winner: Candidate
  tournament: Tournament
}
```

## 표시 조건

- 투표 완료 직후 자동으로 isOpen: true
- 비로그인: 카드 미리보기 ✅ / 공유·다운로드 버튼에 로그인 안내 오버레이
- 로그인: 모든 공유 기능 활성화
