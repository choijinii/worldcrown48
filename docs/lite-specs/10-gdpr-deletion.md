# Lite Spec — #10 GDPR 데이터 삭제 요청

## 컴포넌트 트리

```
<UserSettingsDropdown>           # Navbar 아바타 클릭 시
  <SettingsMenuItem label="계정 설정" />
  <SettingsMenuItem label="내 데이터 삭제 요청" onClick={openDeleteModal} />
  <SettingsMenuItem label="로그아웃" />

<DeleteAccountModal isOpen={...}>
  <WarningMessage />             # "삭제하면 복구할 수 없습니다"
  <ConfirmInput />               # "DELETE" 직접 입력 확인
  <DeleteButton />               # 최종 삭제 요청
```

## 삭제 Cloud Function

```js
// functions/src/deleteUserData.js
exports.deleteUserData = onCall(async (_, context) => {
  const uid = context.auth.uid
  const batch = writeBatch(db)

  // 1. Firestore 사용자 데이터 삭제
  batch.delete(doc(db, 'users', uid))
  const votes = await getDocs(query(collection(db, 'votes'), where('uid', '==', uid)))
  votes.forEach(v => batch.delete(v.ref))

  // 2. 삭제 로그 보존 (3년 — 법적 요건)
  batch.set(doc(collection(db, 'deletion_logs')), {
    uid_hash: hashUid(uid),
    requested_at: serverTimestamp(),
    completed_at: serverTimestamp(),
  })

  await batch.commit()

  // 3. Firebase Auth 계정 삭제
  await admin.auth().deleteUser(uid)

  // vote_stats 집계 데이터는 보존 (익명, 개인식별 불가)
})
```

## 흐름

```
아바타 클릭 → 드롭다운 → "내 데이터 삭제 요청"
→ 확인 모달 (경고 + "DELETE" 입력)
→ Cloud Function 호출
→ 자동 로그아웃 + 홈 이동
→ 토스트: "30일 이내에 처리됩니다"
```

## Props

```ts
interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}
```
