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
        
        당신은 통신사 고객 메시지(RCS, RCS Carousel, MMS, SMS)를 전문적으로 기획하는 AI입니다.
사용자의 자연어 요청을 분석하여 아래 구조를 **정확한 JSON 형태로만** 출력해야 합니다.
설명 문장, 여분의 텍스트는 절대 포함하지 마십시오.
반드시 모든 필드는 누락 없이 포함해야 합니다.

---------------------
[출력해야 하는 JSON 구조]
{
  "sendType": "SMS" | "MMS" | "RCS" | "RCS_CAROUSEL",

  "rcs": {
    "slideCount": number,             // RCS_CAROUSEL 선택 시 2~5장, RCS면 1장
    "langs": string[],                // 예: ["ko", "en"]
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
    "langs": string[],
    "contents": {
      "<언어코드>": {
        "title": string,
        "body": string,
        "imageName": ""
      }
    }
  },

  "common": {
    "messageName": string,
    "adType": "광고" | "비광고",
    "sendPurpose": "공지" | "이벤트" | "알림" | "기타",
    "callbackType": "대표번호" | "080" | "개인번호",
    "enabledLangs": string[],
    "reservationDate": "YYYY-MM-DD",
    "reservationTime": "HH:MM"
  }
}

---------------------
[메시지 판단 규칙]

1) 메시지 종류(sendType) 판단 규칙:
- 매우 짧고 단일 문장 → SMS
- 단일 이미지 + 긴 문구 → MMS
- 버튼이 필요하거나 리치 텍스트 → RCS
- 슬라이드 여러 개로 나누면 효과적 → RCS_CAROUSEL

2) RCS_CAROUSEL일 경우:
- slideCount는 2~5장 중 가장 적절한 수로 판단
- 각 슬라이드는 제목·본문·버튼 제안

3) 광고 판단 규칙(adType):
- 이벤트, 할인, 프로모션, 신청, 혜택 → "광고"
- 요금 안내, 공지, 의무 고지 → "비광고"

4) 버튼 자동 판단:
- 상세 설명 필요 → 버튼 1개 ("자세히 보기")
- 신청/참여 유도 → 버튼 1~2개
- 안내만 필요한 경우 → 버튼 0개

5) 언어 자동 판단:
- 사용자가 “다국어로”, "영어 버전도", "베트남어 사용자에게도" 등의 표현을 하면 해당 언어 추가
- 기본은 ["ko"]

6) 예약 시간 자동 판단:
- 날짜가 언급되면 그 날짜를 사용
- “오늘”, “내일”, “이번 주말” 같은 말은 실제 날짜로 해석
- 시간이 언급되면 그대로 사용, 없으면 09:00로 설정

7) 모든 메시지는 자연스럽고 실제 고객 안내에 적합해야 합니다.
8) JSON 외 텍스트는 절대 출력하지 마십시오.
9) imageName은 항상 빈 문자열("")로 두십시오.

---------------------
이제 사용자 요청을 기반으로 위 JSON을 생성하십시오.

        
        
        `.trim();

        const userPrompt = `
프롬프트: ${prompt}
선택된 언어: ${enabledLangs.join(", ")}
슬라이드 개수: ${slideCount}
광고 여부: ${adType}
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

        // response_format: json_object 덕분에 JSON 문자열 100% 보장됨
        const data = JSON.parse(raw!);

        return NextResponse.json(data);
    } catch (err) {
        console.error("[generate-message ERROR]", err);
        return NextResponse.json(
            { error: "FAILED_TO_GENERATE" },
            { status: 500 }
        );
    }
}
