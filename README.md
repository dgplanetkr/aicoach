# 랜선창업선배 MVP — Vercel 배포와 RAG 연결

기존 보라색 UI와 프리텐다드를 유지한 독립 웹 프로젝트입니다. Vercel에 올리면 예시 모드로 사용할 수 있습니다. 실제 AI 답변은 서버 환경변수와 지식자료를 연결한 뒤 활성화됩니다.

## 1. 먼저 화면을 Vercel에 배포합니다

1. ZIP을 압축 해제합니다. `lanseon-founder-mvp` 안에 `package.json`, `vercel.json`, `public`, `api`, `lib`, `scripts`, `docs`, `tests`가 있는지 확인합니다.
2. [GitHub](https://github.com/new)에서 본인 계정의 새 저장소를 만듭니다. 이름은 `lanseon-founder-mvp`로 할 수 있습니다. Private 저장소를 사용할 수 있습니다.
3. GitHub의 **Add file → Upload files**에서 **프로젝트 폴더 안의 파일과 하위 폴더**를 올립니다. ZIP 자체를 올리는 방식이 아닙니다. `package.json`이 저장소 최상위에 있어야 합니다. `.gitignore`와 `.env.example`도 포함합니다.
4. [Vercel 새 프로젝트](https://vercel.com/new)에 접속합니다. GitHub를 연결하고 해당 저장소를 Import합니다.
5. 설정을 확인합니다.

| 항목 | 값 |
| --- | --- |
| Framework Preset | Other |
| Root Directory | 저장소 최상위 (`./`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | 기본값 또는 `npm install` |
| Node.js Version | 22.x |

`vercel.json`이 Build Command와 Output Directory를 지정합니다. 폴더를 통째로 업로드해 `package.json`이 하위 폴더에 있다면 Root Directory를 그 폴더로 바꿉니다.

6. **Deploy**를 누릅니다. 완료 후 Vercel에서 생성된 `.vercel.app` 주소를 엽니다.
7. 온보딩 또는 **예시로 둘러보기**로 실행계획·성장지표·채팅·주간점검을 확인합니다. 이 단계에서는 실제 AI 요금이 발생하는 호출을 하지 않습니다.

현재 구현은 브라우저의 localStorage에 사업 설정, 지표, 실행계획, 대화를 저장합니다. 같은 주소를 같은 브라우저에서 다시 열면 이어집니다. 다른 기기·브라우저·Vercel Preview 주소 사이에는 동기화되지 않습니다. 회원가입과 계정별 클라우드 데이터 저장은 아직 없습니다. 화면 하단의 **기록 삭제**로 이 브라우저의 자료를 삭제할 수 있습니다.

## 2. 지식자료를 준비합니다

1. 이용 범위를 확인한 인터뷰·심사 피드백을 텍스트로 정리합니다.
2. `docs/knowledge-template.md`를 복사하고 실제 내용을 작성합니다. 한 파일에 하나의 고민이나 주제를 담는 것을 추천합니다.
3. 영상 제목, 발언자, 날짜, 영상 URL, 발언 구간, 당시 상황, 행동과 결과, 적용 조건, 작성자 해설을 담습니다. 질문과 답변의 맥락을 함께 남깁니다.
4. 원문 발언과 안센세님의 해설을 구분합니다. 심사위원 의견을 검증된 사업 성과로 바꾸지 않습니다.
5. `source_url`에는 실제 출처 링크를 넣습니다. 해당 시간으로 이동하는 영상 링크를 넣으면 채팅의 근거 카드에서 바로 확인할 수 있습니다.
6. 실제로 해당 서비스에서 전사·저장·검색·답변에 활용할 수 있는 범위를 확인한 자료에 `permission: confirmed`를 표시합니다. 이 표시는 운영자의 확인 기록이며 이용 허락 자체를 만들어주는 기능은 아닙니다.
7. 프로젝트 최상위에 `knowledge` 폴더를 만들고 완성된 `.md` 또는 `.txt` 파일을 넣습니다. 템플릿 원본은 업로드하지 않습니다. 이 폴더와 `.env.local`은 GitHub에 올리지 않습니다.

출처 링크만 입력해서 영상이나 자막을 자동으로 가져오는 기능은 없습니다. 직접 준비한 텍스트 자료를 업로드하는 방식입니다. OpenAI가 파일을 분할하고 임베딩·색인을 생성합니다.

## 3. OpenAI API를 준비합니다

[OpenAI Platform](https://platform.openai.com/)에서 프로젝트를 만들고 API 키와 API 사용을 위한 결제·사용 한도를 설정합니다. 모델 호출과 지식 저장은 API 사용 요금이 발생할 수 있습니다. API 키를 채팅이나 GitHub에 공개하지 않습니다.

컴퓨터에 Node.js 22를 설치한 뒤 프로젝트 폴더를 VS Code 등으로 열고 터미널을 사용합니다. `.env.example`을 복사해 `.env.local` 파일을 만들고 다음 값을 입력합니다.

```dotenv
OPENAI_API_KEY=발급받은_실제_API_키
OPENAI_VECTOR_STORE_ID=
OPENAI_MODEL=gpt-4.1-mini
DEMO_ACCESS_CODE=직접_정한_16자_이상의_테스트_접근코드
```

실제 값을 `발급받은_실제_API_키` 같은 설명 문구로 저장하면 안 됩니다. 첫 업로드 전에 `OPENAI_VECTOR_STORE_ID`는 비워두며, 이미 저장소가 있는 경우 그 ID를 넣습니다. `DEMO_ACCESS_CODE`는 API 키와 다른 값이며, 테스트 참여자에게만 전달합니다. 충분히 긴 임의의 코드를 사용합니다.

터미널에서 다음 명령을 실행합니다.

```bash
npm install
npm run knowledge:upload -- knowledge
```

스크립트는 자료를 확인한 다음, 새 Vector Store를 만들거나 기존 저장소를 사용합니다. 자료 업로드와 검색 준비 완료까지 확인하고 아래 형식으로 ID를 출력합니다.

```text
OPENAI_VECTOR_STORE_ID=vs_실제로_생성된_저장소_ID
```

출력된 실제 ID를 `.env.local`에 저장합니다. API 키와 Vector Store는 동일한 OpenAI 프로젝트에서 사용해야 합니다. 같은 컴퓨터의 업로드 기록은 `knowledge-upload-manifest.json`에 남으며, 이미 완료된 동일 파일은 다시 업로드하지 않습니다. 스크립트는 기존 자료를 자동으로 삭제하거나 교체하지 않습니다. 자료를 수정해 다시 업로드한 경우 이전 자료도 남으므로, [OpenAI 저장소 관리](https://platform.openai.com/storage/vector_stores)에서 오래된 파일을 확인해 제거합니다.

`.env.local`, `knowledge` 폴더, 업로드 기록은 GitHub에 올리지 않습니다. ZIP은 이 파일들의 실제 내용 없이 제공됩니다.

## 4. Vercel에서 실제 AI를 활성화합니다

Vercel 프로젝트의 **Settings → Environment Variables** 또는 현재 대시보드의 **Environment Variables** 메뉴에서 다음 항목을 등록합니다.

| Name | Value |
| --- | --- |
| `OPENAI_API_KEY` | 실제 OpenAI API 키 |
| `OPENAI_VECTOR_STORE_ID` | 업로드 후 받은 실제 `vs_…` ID |
| `OPENAI_MODEL` | 기본 예시 `gpt-4.1-mini` |
| `DEMO_ACCESS_CODE` | 직접 만든 16자 이상의 접근코드 |

**Production**에 적용합니다. Preview 주소에서도 테스트하려면 Preview에도 적용합니다. Development는 Vercel 개발 도구에서 사용하는 별도 환경입니다. 환경변수를 추가하거나 변경한 뒤 **Deployments → 최신 배포 → Redeploy**합니다. 이전 배포에 새 값이 소급 적용되지 않습니다.

배포 주소의 **창업선배** 화면에 접근코드 입력란이 나타납니다. 테스트 접근코드를 입력하고 **AI 답변 연결**을 누릅니다. 이 연결 버튼은 코드값을 입력받는 기능이며, 실제 코드의 유효성은 질문 전송 시 서버에서 검사합니다. 질문을 보내면 등록한 자료를 검색하고 실제 AI 답변을 생성합니다.

이 접근코드는 소수 인원의 파일럿용 공유 코드입니다. 개별 계정을 식별하지 않으며 기기 간 데이터를 동기화하지 않습니다. 일반 고객에게 제공하는 정식 서비스 단계에서는 회원 인증과 사용자별 사용량 제한·데이터베이스를 연결합니다.

## 5. RAG가 작동하는 방식입니다

1. 브라우저가 질문과 현재 사업 설정·지표·실행 기록·최근 AI 대화를 `/api/chat`에 보냅니다.
2. Vercel 서버가 접근코드와 입력을 확인합니다. API 키는 서버 환경변수에서만 읽습니다.
3. 서버가 OpenAI Vector Store의 검색 API로 관련 자료를 최대 5개 검색합니다.
4. 검색한 발언과 적용 조건, 대표님의 사업 기록을 Responses API에 전달합니다.
5. 모델이 답변과 추천 행동을 JSON으로 반환합니다. 서버는 검색 결과에 실제로 있는 출처만 근거 카드에 반영합니다.
6. 대표님이 **실행계획에 추가**를 누르면 추천 행동을 저장합니다. 버튼은 같은 행동의 중복 추가를 막습니다. 과제 완료로 지표 수치가 자동 변경되지 않습니다.

공통 지식자료만 Vector Store에 업로드합니다. 대표님의 개인 사업 기록은 브라우저에서 요청에 포함하며, 지식 저장소로 업로드하지 않습니다. 채팅 생성을 위해서는 질문과 사업 기록이 OpenAI API로 전달됩니다. 현재 서버는 Responses 요청을 `store: false`로 설정하지만, 이것이 API 데이터 보관 전체를 없앤다는 의미는 아닙니다. API의 데이터 정책은 공식 문서를 확인합니다.

검색 근거가 부족하면 답변을 **일반 조언**으로 표시하도록 구성했습니다. 검색 점수 기준은 `lib/rag.mjs`의 `score_threshold: 0.35`가 초기값입니다. 실제 질문으로 검색 누락과 부적절한 매칭을 점검한 뒤 조정합니다. 근거 카드의 존재가 모든 문장의 정확성을 보장하지는 않습니다.

모델의 추천 행동·이유·결과물·예상 시간·연결할 지표는 정해진 JSON 형식으로 받습니다. 현재 지표에 없는 ID로 연결하려는 추천은 저장 후보에서 제외합니다.

## 6. 연결 후 확인할 항목입니다

- 자료에 실제로 있는 고민을 질문하고, 답변의 참고 근거와 영상 발언 구간이 일치하는지 확인합니다.
- 동일 질문이라도 사업 단계·고객·지표를 바꾸면 적절한 조언으로 달라지는지 확인합니다.
- 자료에 없는 사례나 결과를 질문하고, 없는 근거를 만들어내지 않는지 확인합니다.
- 추천 행동을 추가하고, 새로고침 후 계획이 유지되는지 확인합니다.
- 할 일을 완료해도 성과 수치가 자동으로 늘어나지 않는지 확인합니다.
- 잘못된 접근코드로는 실제 API 답변이 제공되지 않는지 확인합니다.

로컬 화면 확인은 다음 명령을 사용합니다.

```bash
npm run dev
```

`http://localhost:3000`에서 확인합니다. 프로젝트의 빌드와 모의 서버 검증은 다음 명령으로 실행합니다.

```bash
npm run build
npm test
```

배포 파일 생성, 서버 검증 6개, 데스크톱·모바일 UI의 모의 연결 흐름을 확인했습니다. 실제 Vercel 계정 배포와 유료 OpenAI 호출, 실제 지식자료의 답변 품질 검증은 아직 수행하지 않았습니다.

## 7. 오류가 발생하면 확인합니다

| 상황 | 확인할 내용 |
| --- | --- |
| 배포 화면이 404입니다. | `package.json`이 최상위인지, Root Directory와 Output Directory `dist`가 맞는지 확인합니다. |
| 실제 AI 입력란이 나타나지 않습니다. | 네 환경변수, `vs_…` ID 형식, 16자 이상의 코드, Production 적용과 Redeploy를 확인합니다. |
| 접근코드 오류입니다. | 화면에 입력한 코드와 서버의 `DEMO_ACCESS_CODE`가 같은지 확인합니다. API 키를 입력하는 칸이 아닙니다. |
| 사용량·결제 오류입니다. | OpenAI 프로젝트의 결제 설정, 사용량 한도, 호출 제한을 확인합니다. |
| 자료가 검색되지 않습니다. | 업로드 상태가 `completed`인지, 같은 프로젝트와 저장소 ID를 사용하는지 확인합니다. |
| 답변 준비 시간이 초과됩니다. | 질문을 짧게 나누고 서버 로그를 확인합니다. 모델 속도와 자료 길이를 조정합니다. |
| 다른 기기에서 기록이 보이지 않습니다. | 현재는 브라우저 저장 방식입니다. Supabase 등 계정별 DB 연결이 다음 개발 범위입니다. |

## 공식 참고 문서입니다

- [Vercel Git 저장소 배포](https://vercel.com/docs/git)
- [Vercel Node.js 서버 함수](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel 환경변수](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [OpenAI 검색·벡터 저장소](https://developers.openai.com/api/docs/guides/retrieval)
- [Vector Store 검색 API](https://developers.openai.com/api/reference/resources/vector_stores/methods/search)
- [OpenAI 구조화된 답변](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI API 데이터 정책](https://developers.openai.com/api/docs/guides/your-data)

폰트와 아이콘의 라이선스는 `public/assets/LICENSE-pretendard.txt`, `public/assets/LICENSE-lucide.txt`에 포함되어 있습니다.
