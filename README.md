# 피부일지

아침·저녁 얼굴/등/가슴 사진, 클렌징·스킨케어(바른 부위까지), 운동, 뾰루지 하나하나의 경과와 처치를 기록하는 개인용 웹앱.

- 데이터는 **내 구글 드라이브의 `피부일지` 폴더**에 일반 파일로 저장 (앱이 없어져도 남음)
  - `photos/2026-11-07_AM_face.jpg` 사진
  - `days/2026-11-07.json` 날짜별 루틴·운동·메모
  - `blemishes.json` 뾰루지 기록, `settings.json` 제품 목록
- 앱은 `drive.file` 권한만 사용 → 자기가 만든 파일 말고는 드라이브를 볼 수 없음
- 쓰기는 먼저 기기 안에 보관했다가 업로드 → 연결이 끊겨도 기록이 사라지지 않음

## 개발

```bash
npm install
npm run dev
```

`main` 브랜치에 푸시하면 GitHub Actions가 GitHub Pages로 배포합니다.

## 구글 OAuth 클라이언트

`src/config.js`의 `GOOGLE_CLIENT_ID`에 넣거나, 비워두면 앱 첫 화면에서 붙여넣을 수 있습니다.
승인된 JavaScript 원본과 리디렉션 URI에 배포 주소(예: `https://<아이디>.github.io/skin-log/`)를 등록해야 합니다.
