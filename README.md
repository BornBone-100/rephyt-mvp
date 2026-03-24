# 물리치료 SOAP 자동 생성 웹 앱 (Next.js + Supabase + OpenAI)

치료사가 환자 정보를 입력하면, AI가 근거중심(Evidence-Based) 스타일의 전문적인 **SOAP 노트**를 생성하고 **PDF로 저장**할 수 있는 웹 앱의 초기 뼈대입니다.

## 기술 스택

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth/DB)
- OpenAI API (SOAP 자동 생성)
- PDF 생성: `pdf-lib`

## 시작하기

1) 환경변수 세팅

- `.env.example`를 복사해서 `.env.local`을 만들고 값을 채우세요.

2) 개발 서버 실행

```bash
npm run dev
```

## 추천 폴더 구조

`src/` 기준 (도메인/기능 단위로 확장하기 쉬운 형태)

```text
src/
  app/
    (auth)/
      login/
      callback/
    (dashboard)/
      dashboard/
        page.tsx
        patients/
          page.tsx
          [patientId]/
            page.tsx
        soap/
          new/
            page.tsx
    api/
      soap/route.ts        # OpenAI로 SOAP 생성
      pdf/route.ts         # SOAP를 PDF로 변환
  components/
    ui/                    # 버튼/인풋 등 재사용 UI
    layout/                # 헤더/사이드바 등 레이아웃
  features/
    soap/
      schema.ts            # 입력/출력 Zod 스키마
      prompts.ts           # (선택) 프롬프트 분리
    patients/
      (future)             # 환자 관련 로직/컴포넌트
  lib/
    env.ts                 # 환경변수 검증(zod)
    openai.ts              # OpenAI 클라이언트
    supabase/
      client.ts            # 브라우저 클라이언트
      server.ts            # 서버 클라이언트
  types/
  utils/
```

## API 엔드포인트 (초기 제공)

- `POST /api/soap`: SOAP 노트 JSON 생성
- `POST /api/pdf`: SOAP 노트 PDF 생성 (다운로드)
- `POST /api/sessions/bundle`: 세션+APPI+SOAP를 한 번에 저장(RPC)

## DB 스키마 / RLS / RPC

- `supabase/schema.sql`을 Supabase SQL Editor에서 실행하면
  - 관계형 테이블(Patients / APPI_Assessments / Sessions / SOAP_Notes)
  - 치료사별 데이터 격리(RLS 정책)
  - 트랜잭션 번들 RPC(`upsert_session_bundle`)
  가 한 번에 생성됩니다.

