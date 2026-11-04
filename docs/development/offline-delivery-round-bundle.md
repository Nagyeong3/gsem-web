# 폐쇄망 증분 Git bundle 반입: 지원장비 통합현황 초안

이 파일은 `release/v1.0.1-demo-readonly` 이후 `feature/delivery-round-master` 개발 커밋을 별도 Draft 작업 브랜치로 옮기기 위한 절차다. 배포나 PR 병합을 수행하지 않는다.

## 외부망

- 브랜치: `feature/delivery-round-master`
- GitHub Actions **Offline delivery-round Git bundle** 실행 결과에서 `gsem-delivery-round-incremental` 아티팩트 ZIP 다운로드
- ZIP에서 `gsem-delivery-round-incremental.bundle` 추출해 반입한다
- 번들은 Git 이력과 변경 객체만 포함하는 증분 bundle이다. `.env.local`, `node_modules` 등의 작업 파일을 포함하지 않는다
- 자동화 실행이 실패했거나 최신 커밋인지 확인되지 않으면 반입하지 않는다

수동 생성 방법(인터넷 연결된 Git 저장소):

```powershell
git fetch origin feature/delivery-round-master release/v1.0.1-demo-readonly
git switch feature/delivery-round-master
git merge-base --is-ancestor origin/release/v1.0.1-demo-readonly HEAD
git bundle create gsem-delivery-round-incremental.bundle HEAD ^origin/release/v1.0.1-demo-readonly
git bundle verify gsem-delivery-round-incremental.bundle
git bundle list-heads gsem-delivery-round-incremental.bundle
```

수동 명령에서 `HEAD`를 번들에 담으면 익명 HEAD일 수 있으므로 자동화 출력과 달리 내부망에서 `git fetch .\gsem-delivery-round-incremental.bundle HEAD:refs/heads/draft/delivery-round-master`를 사용할 수 있다. **가능하면 자동화에서 만든 번들을 사용한다.**

## 폐쇄망 (PowerShell, 현재 저장소 루트에서)

먼저 `git status --short`를 확인한다. 미커밋 변경은 `release/*`에 커밋하지 말고 보존한다.

```powershell
git status --short
git stash push -u -m "before delivery-round draft import"
git switch release/v1.0.1-demo-readonly
git rev-parse HEAD
# GitHub에 기록된 기준 SHA: 88e9dd4608c07546f95bbc371d47631ae34c4e9c
git bundle verify D:\transfer\gsem-delivery-round-incremental.bundle
git fetch D:\transfer\gsem-delivery-round-incremental.bundle refs/heads/delivery-round-transfer:refs/heads/draft/delivery-round-master
git switch draft/delivery-round-master
git log --oneline release/v1.0.1-demo-readonly..HEAD
git diff --stat release/v1.0.1-demo-readonly...HEAD
```

주의: `git stash push -u`는 추적 파일과 무시되지 않은 새 파일만 보관한다. `.env.local`처럼 .gitignore 대상 파일은 보통 그대로 남으며 별도 백업할 수 있다. `git stash pop`은 Draft 브랜치에 적용하지 말고 원래 변경이 있던 브랜치에서 되돌린다.

`git bundle verify`에 prerequisites missing 오류가 뜨면 폐쇄망 Git 저장소가 기준 커밋을 갖고 있지 않은 것이므로 중단한다. 기존 릴리스 브랜치를 덮어쓰거나 `git reset --hard`하지 않는다.

## Mock 검증

```powershell
# .env.local에 VITE_DATA_SOURCE=mock 설정
npm run dev
```

`/equipment-master-rounds`에서 가상 사업과 납품 차수, 펼침 상세를 확인한다. 고정익/회전익 버튼은 현재 UI 시안으로, 실데이터에서 실제 분류는 하지 않는다.
