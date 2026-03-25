# SA Sales Execution Map v8.2

> 프리세일즈 SA를 위한 인터랙티브 파이프라인 관리 도구  
> GitHub Pages: https://ssgkim.github.io/sa-execution-map/

---

## 주요 기능

### 🗺️ Sales Execution Map
- 계정별 파이프라인을 **2x2 Strategic Map**으로 시각화
- X축: 파이프라인 단계 (Early Sales → Production)
- Y축: 전략적 계정 가치 (단건 금액 + 계정 총합)
- 솔루션별 고유 색상 도트 + 하단 컬러 레전드
- 🔀⬆️ **딜 계층 연결**: 크로스셀/업셀 관계를 점선 화살표로 시각화
- ⚠️ **Discovery Gap 경고**: Early Sales 완료율 50% 미만 스트림 자동 감지

### 🌳 Opportunity Hierarchy (v8.3)
- **부모-자식 구조**: 메인 프로젝트에서 파생된 후속 딜 관리
- **크로스셀(Cross-sell)**: 유관 제품으로 확장된 파이프라인
- **업셀(Upsell)**: 동일 제품의 노드 확장 또는 고도화
- **금액 롤업**: 트리 구조의 전체 딜 가치 자동 합산

### 📋 Sales Kit Manager
- 단계별 세일즈 자료(Collateral) · 활동(Engagement) 체크리스트 관리
- 항목 추가/삭제/이름변경 시 모든 계정 실시간 동기화
- Cloud Sync: 킷 변경 내용 Google Sheets 자동 저장
- 제품별 특화 킷 + 공통(Wildcard) 킷 병합

### 📜 Activity Timeline
- 체크리스트 완료 시 자동 활동 기록
- 단계별 아코디언 뷰, 수동 이력 직접 추가
- 스윔레인 캔버스로 계정 전체 활동 흐름 시각화
- **드래그 & 드롭**으로 활동 날짜 조정

### 📊 Activity Dashboard
- 총 활동건수, 이번 달 활동, 활성 딜 현황
- Top 5 액티브 계정 바 차트

---

## 데이터 소스 (v8.0 →)

| 모드 | 설명 |
|---|---|
| ☁️ **Cloud** | Google Sheets(GAS)와 실시간 동기화. 프로필로 다중 시트 관리. |
| 💾 **Local** | 브라우저 LocalStorage에 저장. 오프라인 사용 가능. |
| 🧪 **Demo** | 읽기 전용 샘플 데이터. 수정 불가. |

헤더 소스 스위처로 즉시 전환 가능.

---

## 프로필 매니저

⚙️ 설정 버튼 → 클라우드 프로필 CRUD

- 여러 Google Apps Script Web App URL을 등록해 팀 공용 / 개인 전용 시트 전환
- 프로필 이름 변경, 삭제, 활성 프로필 선택
- 설정은 브라우저 LocalStorage에 저장

---

## Cloud 연동 (Google Sheets)

**GAS Web App URL**을 프로필에 등록하면 다음 기능이 활성화됩니다:

| 기능 | GAS Action |
|---|---|
| 전체 데이터 조회 | GET `?t=<timestamp>` |
| 계정 Bulk Import | POST `bulkAppend` (Accounts 시트) |
| 활동 기록 저장 | POST `appendTimeline` (Timeline 시트) |
| 활동 날짜/메모 수정 | POST `updateTimeline` |
| 세일즈킷 동기화 | POST `overwriteKits` (Kits 시트) |

---

## CSV 포맷

**계정 데이터 (Bulk Import)**
```
산업,고객사,오퍼튜니티명,제품ID,단계(0~3),금액(만원)
금융,A은행,클라우드전환,ocp,2,50000
```

**활동 로그 (Timeline Bulk)**
```
고객사,오퍼튜니티명,제품ID,단계(0~3),날짜(YYYY-MM-DD),활동명,메모
A은행,클라우드전환,ocp,1,2026-03-01,Live Demo,PoC 사전 시연
```

---

## 지원 제품 ID

| ID | 제품명 |
|---|---|
| `ocp` | OpenShift (OCP) |
| `ocp-virt` | OCP Virtualization |
| `rhel` | RHEL |
| `rhoai` | OpenShift AI |
| `aap` | Ansible Automation |
| `acs` | ACS (Security) |
| `acm` | ACM (Multi-Cluster Mgmt) |
| `middleware` | Middleware |
| `storage` | Storage |
| `edge` | Edge |
| `migration` | Migration |

---

## 버전 히스토리

| 버전 | 날짜 | 주요 변경 |
|---|---|---|
| **v8.2** | 2026-03-25 | v8.0 init 크래시 수정, 멀티소스+Kit Manager 통합 |
| v8.1 | 2026-03-24 | Kit Manager 크래시 수정, syncGlobalKitsToStreams (로컬 only) |
| v8.0 | 2026-03-22 | Multi-Source Loader, Profile Manager (버그로 미동작) |
| v7.4 | 2026-03-20 | Kit Manager, NBA 추천, 제품별 킷 필터링 |
| v7.3 | 2026-03-15 | 스윔레인 드래그&드롭, Cloud Sync 강화 |
| v7.2 | 2026-03-10 | 계정/산업 가시성 토글, 맵 좌표 고정 |
| v7.0 | 2026-03-01 | Google Sheets Cloud Sync 통합 (Serverless DB) |
| v6.0 | 2026-02-20 | 활동 타임라인, 스윔레인, 대시보드 |

---

*Made with ❤️ by Guru (AI Assistant) for SA Team*
