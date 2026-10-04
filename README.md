# Flight_Simulator
Large Map Flight Simulator

브라우저에서 바로 실행되는 3D 비행 시뮬레이터입니다 (Three.js). 한빛(Hanbit) 지역 140 × 120 km 맵에 공항 4곳이 있습니다.

## 실행
`index.html`을 최신 데스크톱 브라우저(Chrome 등)에서 엽니다. Three.js를 CDN에서 불러오므로 인터넷 연결이 필요합니다.
파일 로딩 문제가 있으면 로컬 서버로 여세요: `python3 -m http.server` 후 http://localhost:8000

## 구조
- `index.html` — UI(메뉴, HUD, 미니맵)와 모듈 로더
- `js/core.js` — 렌더러, 공용 헬퍼, 재질, 배칭
- `js/world-config.js` — 월드 설정(도시, 공항, 랜드마크)
- `js/terrain.js` — 지형
- `js/airports.js` — 공항
- `js/infrastructure.js` — 도로, 철도, 다리 등
- `js/cities.js` — 도시와 마을
- `js/nature.js` — 숲, 식생
- `js/landmarks.js` — 랜드마크
- `js/sim.js` — 항공기, 물리, 카메라, 날씨, 오디오, HUD

## 조작
| 키 | 동작 |
|---|---|
| W / S 또는 ↑ / ↓ | 피치 |
| A / D 또는 ← / → | 롤 |
| Q / E | 러더 |
| Shift+W / Shift+S, Z / X, 1–0 | 스로틀 (`` ` `` = 아이들) |
| Space | 휠 브레이크 |
| G | 랜딩기어 |
| F | 플랩 |
| C / V | 카메라 전환 / 조종석 시점 |
| M | 지도 |
| U | HUD 표시 전환 |
| N | 목적지 공항 전환 |
| + / - | 줌 |
| R | 리셋 |
| P | 성능 통계 |
| Esc | 일시정지 |
| 마우스 | 카메라 둘러보기 |

게임패드도 지원합니다.
