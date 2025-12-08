// app/api/generate-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
    try {
        const { prompt, enabledLangs, slideCount, adType } = await req.json();

        const systemPrompt = `
당신은 통신사 고객 메시지(SMS, MMS, RCS, RCS Carousel)를 전문적으로 기획하는 AI입니다.
사용자의 자연어 요청을 분석하여 아래 구조를 **정확한 JSON 형태로만** 출력해야 합니다.
설명 문장, 여분의 텍스트는 절대 포함하지 마십시오.
반드시 모든 최상위 필드는 누락 없이 포함해야 합니다.

---------------------
[출력해야 하는 JSON 구조]

{
  "sendType": "SMS" | "MMS" | "RCS_MMS" | "RCS_CAROUSEL",

  "common": {
    "messageName": string,
    "adType": "광고" | "비광고",
    "sendPurpose": "공지" | "이벤트" | "알림" | "기타",
    "callbackType": "대표번호" | "080" | "개인번호",
    "enabledLangs": string[],            // 예: ["ko"], ["ko","en"]
    "reservationDate": "YYYY-MM-DD",     // 예: "2025-12-31"
    "reservationTime": "HH:MM"           // 예: "14:30"
  },

  "rcs": {
    "slideCount": number,                // RCS_MMS면 1 이상, RCS_CAROUSEL이면 2~5장. SMS/MMS 타입이면 0으로 설정.
    "langs": string[],                   // RCS를 사용하는 언어 목록 (없으면 빈 배열)
    "contents": {
      "<언어코드>": {
        "slides": [
          {
            "title": string,
            "body": string,
            "imageName": "",
            "buttonCount": 0 | 1 | 2,
            "button1Label": string,
            "button1Url": string,
            "button2Label": string,
            "button2Url": string
          }
        ]
      }
    }
  },

  "mms": {
    "langs": string[],                   // MMS를 사용하는 언어 목록 (없으면 빈 배열)
    "contents": {
      "<언어코드>": {
        "title": string,
        "body": string,
        "imageName": ""
      }
    }
  },

  "mmsConfig": {
    "myktLink": "포함" | "미포함",
    "closingRemark": "포함" | "미포함",
    "imagePosition": "위" | "아래"
  }
}

---------------------
[메시지 타입(sendType) 판단 규칙]

- "SMS" :
  - 짧은 단일 안내 문구 위주
  - 이미지 없음
  - RCS와 MMS는 사용하지 않으므로:
    - rcs.slideCount = 0
    - rcs.langs = []
    - rcs.contents = {}
    - mms.langs = []
    - mms.contents = {}

- "MMS" :
  - 단일 이미지 + 비교적 긴 본문
  - mms.langs / mms.contents에만 내용을 채움
  - rcs는 사용하지 않으므로:
    - rcs.slideCount = 0
    - rcs.langs = []
    - rcs.contents = {}

- "RCS_MMS" :
  - RCS 메시지 화면 1장 + 대체 발송용 MMS 필요
  - rcs.slideCount는 1로 설정
  - rcs.langs, rcs.contents를 채움
  - mms.langs, mms.contents도 반드시 채움 (대체 발송용)
  - mmsConfig도 반드시 의미 있게 설정

- "RCS_CAROUSEL" :
  - RCS 캐러셀(슬라이드 여러 장) + 대체 발송용 MMS 필요
  - rcs.slideCount는 2~5장 중 적절한 값으로 설정
  - 각 슬라이드에 제목/본문/버튼을 구성
  - mms.langs, mms.contents도 반드시 채움 (대체 발송용)
  - mmsConfig도 반드시 의미 있게 설정

---------------------
[RCS 관련 규칙]

1) RCS 사용(sendType이 RCS_MMS 또는 RCS_CAROUSEL)일 경우:
   - rcs.slideCount >= 1
   - rcs.langs는 common.enabledLangs와 동일하거나 그 부분집합
   - 각 언어별 slides 배열 길이는 rcs.slideCount와 동일

2) 버튼 자동 판단:
   - 상세 설명 페이지, 신청/참여가 있다면 buttonCount 1~2개 활용
   - 단순 안내라면 buttonCount 0
   - URL이 불명확하면 "https://example.com" 같은 더미 URL을 넣되, 실제 URL은 사용자가 수정할 수 있음을 전제로 작성

---------------------
[광고/비광고(adType) 판단 규칙]

- "광고":
  - 이벤트, 할인, 프로모션, 쿠폰, 신청, 혜택, 가입 유도 등
- "비광고":
  - 요금 안내, 공지, 장애/점검 안내, 필수 고지, 단순 안내 등

사용자 요청에 "광고", "프로모션", "이벤트" 등의 표현이 있으면 "광고"를 우선 고려합니다.

---------------------
[언어(enabledLangs, langs) 판단 규칙]

- 기본값은 ["ko"]
- 사용자가 "영어 버전도", "영문 안내도", "중국어/베트남어 고객" 등의 표현을 사용하면 해당 언어를 enabledLangs에 추가
  - 예: 한국어 + 영어 → ["ko","en"]
- rcs.langs, mms.langs는 enabledLangs와 동일하게 설정하는 것을 기본으로 합니다.

---------------------
[예약일/시간(reservationDate, reservationTime) 판단 규칙]

- 날짜가 명시되면 그대로 사용
- "오늘", "내일", "이번 주말" 등 상대 표현은 요청 시점 기준으로 구체적인 YYYY-MM-DD로 변환해야 하지만,
  실제 날짜를 정확히 알 수 없으므로 대략적인 예시 날짜를 설정해도 됩니다.
  (예: "2025-12-31")
- 시간이 명시되지 않았다면 기본값으로 "09:00" 사용

---------------------
[대체 발송용 MMS 설정(mmsConfig) 규칙]

- myktLink:
  - "마이KT앱에서 확인", "앱에서 보기" 등 앱 유도 문구가 있으면 "포함"
  - 그렇지 않으면 "미포함"을 기본값으로 하되, 프로모션/이벤트는 "포함"도 고려

- closingRemark:
  - 광고/이벤트 안내인 경우 일반적으로 "포함"
  - 순수 업무/시스템 안내(SMS 성격)는 "미포함"도 가능

- imagePosition:
  - 프로모션/이벤트 이미지는 보통 "위"
  - 단순 안내형 이미지는 "아래"도 가능하지만, 기본은 "위"

---------------------
[기타 규칙]

- common.messageName은 사용자가 의도한 캠페인을 한눈에 알 수 있도록 짧게 요약합니다.
- 모든 본문/body는 실제 고객에게 발송 가능한 자연스러운 어조로 작성합니다.
- imageName은 항상 빈 문자열("")로 둡니다. 실제 파일명/경로는 사용자가 별도로 설정합니다.
- JSON 외 텍스트는 절대 출력하지 마십시오.
    `.trim();

        const userPrompt = `
사용자 요청(자연어):

${prompt}

추가 힌트(화면에서 현재 선택된 값, 없으면 무시해도 됨):
- 현재 enabledLangs: ${enabledLangs?.join(", ") || "(없음)"}
- 현재 slideCount: ${slideCount ?? "(미지정)"}
- 현재 adType: ${adType ?? "(미지정)"}
`.trim();

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        const raw = completion.choices[0].message.content;
        const data = JSON.parse(raw!);

        return NextResponse.json(data);
    } catch (err) {
        console.error("[generate-message ERROR]", err);
        return NextResponse.json(
            { error: "FAILED_TO_GENERATE" },
            { status: 500 },
        );
    }
}
