# Symmetry Puzzle (대칭 퍼즐)

《데블스 플랜: 데드 어게인》 유배지 매치에서 영감을 받은 실시간 기하학 분할 조합 퍼즐 웹 게임입니다.
주어진 **3개의 자유 다각형 조각**을 이동 및 회전(반전 불가)하여 **선대칭(축대칭) 도형(내부 구멍 포함)**을 가장 먼저 완성하세요.

## 주요 기능
- **순수 기하학 및 대칭 판정 엔진 (`src/engine/`):**
  - 2D 폴리곤 불리언 연산(`polygon-clipping`), 변/꼭짓점 자석 스냅, 미세 틈새 마이크로 웰딩
  - 외곽선과 내부 구멍 집합 전체에 대한 임의 각도 선대칭 정밀 판정 (순수 180° 점대칭 제외)
- **난이도별 절차적 퍼즐 생성기:**
  - **Easy:** 6~8꼭짓점, 30°/45°/60° 사선 분할 (구멍 없음)
  - **Normal:** 8~10꼭짓점, 오목 다각형, 50% 확률 선대칭 구멍 1개
  - **Hard:** 10~14꼭짓점, 깊은 오목 홈·2단 꺾임 절단선, 80% 확률 1~2개 선대칭 구멍 (방사형 브릿지 3분할)
- **해답 보기 (Show Solution):** 확인 모달 후 정답 배치 자동 정렬 애니메이션 및 대칭축 시각화
- **최대 3인 WebRTC P2P 멀티플레이어 (`PeerJS`):** 방 코드(`SYM-XXXX`) 및 초대 링크 공유, 실시간 진행 배지 동기화
- **다국어 & 효과음:** 한국어(`ko`), 영어(`en`), 일본어(`ja`) 지원 및 Web Audio API 효과음

## 로컬 실행 및 테스트

```bash
npm install
npm run dev      # 개발 서버 실행
npm test         # Vitest 단위 테스트 실행
npm run build    # TypeScript 검사 및 프로덕션 빌드
npm run preview  # 빌드 결과 로컬 프리뷰 (/symmetry-Puzzle/)
```

## Cloudflare Pages 배포
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Subpath:** `/symmetry-Puzzle/` (`vite.config.ts`의 `base` 및 `public/_redirects` 설정 포함)
