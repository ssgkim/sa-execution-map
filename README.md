# SA Sales Execution Map v7.3

Red Hat SA 세일즈 파이프라인 시각화 & 실행 전략 도구

## 프로젝트 구조

```
sa-execution-map/
├── index.html          # HTML 구조 (레이아웃)
├── css/
│   └── style.css       # 스타일 (테마, 레이아웃, 컴포넌트)
├── js/
│   ├── data.js         # 설정 데이터 (솔루션, 킷, 색상)
│   ├── state.js        # 상태 관리 (accounts, filters, CRUD)
│   ├── render.js       # UI 렌더링 (list, map, kit, filter)
│   └── app.js          # 이벤트 바인딩 & 초기화
└── README.md
```

## 수정 가이드

| 변경 사항 | 파일 |
|-----------|------|
| 솔루션 추가/변경 | `js/data.js` → `solutions` 배열 |
| 세일즈킷 기본값 변경 | `js/data.js` → `kits` 객체 |
| 색상/테마 변경 | `css/style.css` → `:root` 변수 |
| 비즈니스 로직 추가 | `js/state.js` |
| 시각화 변경 | `js/render.js` → `renderMap()` |
| 새 UI 컴포넌트 | `index.html` + `css/style.css` + `js/render.js` |

## 기능

- 📊 매직 쿼드런트 스타일 파이프라인 시각화
- 🍩 도넛 게이지로 Effort(활동 투입률) 시각화
- ✅ 단계별 세일즈 활동 체크리스트
- 📋 세일즈킷 항목 추가/수정/삭제
- 📥 CSV Bulk Import (Google Sheets Cloud 자동 전송)
- ☁️ Google Sheets 기반 Cloud Sync 자동화
- 🔧 솔루션/어카운트/인더스트리 양방향 가시성 필터 (Visibility Toggles)
- 🏊 스윔레인(Swimlane) 시간 축(X-Axis) 및 날짜 조정 Drag & Drop
- 🌗 Dark/Light 테마

## 배포

GitHub Pages: https://ssgkim.github.io/sa-execution-map/
