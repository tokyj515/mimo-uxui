// app/api/generate-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

type SendType = "SMS" | "MMS" | "RCS_MMS" | "RCS_CAROUSEL";

/**
 * 프롬프트에서 메시지 타입을 읽어오기
 * - "[메시지 타입]" 섹션 형태를 우선 파싱
 * - 없으면 본문 내 "SMS/MMS/RCS..." 단어로 보조 파싱
 */
function extractSendTypeFromPrompt(prompt: string): SendType | undefined {
    const p = (prompt ?? "").toString();

    // 1) 섹션 기반 파싱: [메시지 타입] ... 다음 줄/구간
    const sectionMatch = p.match(/\[\s*메시지\s*타입\s*\]\s*([\s\S]*?)(\n\s*\[|$)/i);
    if (sectionMatch?.[1]) {
        const block = sectionMatch[1].trim();

        if (/RCS\s*[_-]?\s*CAROUSEL|RCS\s*캐러셀|캐러셀/i.test(block)) return "RCS_CAROUSEL";
        if (/RCS\s*[_-]?\s*MMS|RCS\s*MMS/i.test(block)) return "RCS_MMS";
        if (/\bMMS\b/i.test(block)) return "MMS";
        if (/\bSMS\b/i.test(block)) return "SMS";
    }

    // 2) 보조 파싱: 섹션이 없으면 전체 텍스트에서 키워드 탐색(우선순위)
    if (/RCS\s*[_-]?\s*CAROUSEL|RCS\s*캐러셀|캐러셀/i.test(p)) return "RCS_CAROUSEL";
    if (/RCS\s*[_-]?\s*MMS|RCS\s*MMS/i.test(p)) return "RCS_MMS";
    if (/\bMMS\b/i.test(p)) return "MMS";
    if (/\bSMS\b/i.test(p)) return "SMS";

    return undefined;
}

/** 비어있는 객체인지 간단 체크 */
function isEmptyObject(v: unknown): boolean {
    return !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v as any).length === 0;
}

/** YYYY-MM-DD 형식인지 간단 검증 */
function isYmd(s: unknown): s is string {
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** HH:MM 형식인지 간단 검증 */
function isHm(s: unknown): s is string {
    return typeof s === "string" && /^\d{2}:\d{2}$/.test(s);
}

/**
 * ✅ Asia/Seoul 기준 "오늘/내일/2주뒤"를 '절대값(YYYY-MM-DD)'로 계산
 * - LLM이 날짜를 추측/계산하지 않게 만들기 위한 서버 계산값
 */
function getSeoulYMDParts(date = new Date()): { y: number; m: number; d: number } {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const y = Number(parts.find((p) => p.type === "year")?.value);
    const m = Number(parts.find((p) => p.type === "month")?.value);
    const d = Number(parts.find((p) => p.type === "day")?.value);
    return { y, m, d };
}

function ymdToDateUTC(y: number, m: number, d: number): Date {
    // UTC 00:00로 고정 (KST는 DST 없음)
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

function addDaysUTC(dateUTC: Date, days: number): Date {
    const d = new Date(dateUTC.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

function formatSeoulYMD(dateUTC: Date): string {
    // en-CA는 YYYY-MM-DD로 출력됨
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(dateUTC);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const prompt: string = String(body?.prompt ?? "");
        const enabledLangs: string[] = Array.isArray(body?.enabledLangs) ? body.enabledLangs : ["ko"];
        const slideCountRaw = body?.slideCount;
        const adType: "비광고" | "광고" = body?.adType === "광고" ? "광고" : "비광고";

        /**
         * ✅ 핵심 정책:
         * - 유저 프롬프트에 "메시지 타입" 언급이 있으면 그 타입을 사용
         * - 없으면 무조건 MMS
         */
        const promptSendType = extractSendTypeFromPrompt(prompt);
        const chosenSendType: SendType = promptSendType ?? "MMS";

        // 캐러셀일 때만 slideCount 정규화 (2~5)
        const normalizedSlideCount =
            typeof slideCountRaw === "number" && Number.isFinite(slideCountRaw)
                ? Math.min(Math.max(slideCountRaw, 2), 5)
                : 3;

        const langsText = Array.isArray(enabledLangs) && enabledLangs.length > 0 ? enabledLangs.join(", ") : "ko";

        // ✅ 날짜 절대값(서울 기준) 계산
        const { y, m, d } = getSeoulYMDParts(new Date());
        const todayUTC = ymdToDateUTC(y, m, d);
        const tomorrowUTC = addDaysUTC(todayUTC, 1);
        const twoWeeksLaterUTC = addDaysUTC(todayUTC, 14);

        const TODAY_STR = formatSeoulYMD(todayUTC);
        const TOMORROW_STR = formatSeoulYMD(tomorrowUTC);
        const TWO_WEEKS_LATER_STR = formatSeoulYMD(twoWeeksLaterUTC);

        // 🔧 시스템 프롬프트 (선택된 타입 고정 + RCS면 mms 필수 + 가독성 하드룰 + 빈 contents 금지)
        // ✅ 예약일 규칙을 "절대값 기반"으로 강화 (LLM이 계산하지 않게)
        const systemPrompt = `
당신은 통신사(KT)·공공기관·금융사·쇼핑몰 등에서 고객에게 발송하는 실제 문자(SMS/MMS/RCS) 메시지를 쓰는 전문 카피라이터입니다.

목표: 운영 환경에 바로 넣어도 될 정도로 완성된 메시지를, 아래 규칙과 JSON 스키마에 맞춰 생성하세요.

[이번 요청의 sendType 고정 - 절대 변경 금지]
- 이번 응답의 sendType은 반드시 "${chosenSendType}" 입니다.
- 절대 다른 타입으로 바꾸지 마세요.

[타입별 필수 채움 규칙(중요)]
- sendType="SMS"         → sms.contents는 반드시 채움 (mms/rcs는 비워도 됨)
- sendType="MMS"         → mms.contents는 반드시 채움 (sms/rcs는 비워도 됨)
- sendType="RCS_MMS"     → rcs.contents(슬라이드 1장) + mms.contents 둘 다 반드시 채움
- sendType="RCS_CAROUSEL"→ rcs.contents(슬라이드 2~5장) + mms.contents 둘 다 반드시 채움
- 어떤 경우에도 선택된 타입의 contents를 비워두면 실패입니다.

[가독성/성의 하드룰(중요)]
- 문단 구분 필수(줄바꿈/섹션헤더/불릿)
- 두세 줄짜리 성의 없는 문장 금지
- 문자 내용에 마크다운 문법 사용 금지
- 최소 조건:
  * SMS: 6줄 이상 + 문의/유의사항 포함
  * MMS: body 9줄 이상 + 섹션 헤더(대괄호) 2개 이상 + 불릿 4개 이상
  * RCS_MMS: RCS body 5줄 이상 + MMS body 10줄 이상
  * RCS_CAROUSEL: 각 카드 body 4줄 이상 + 카드 간 중복 금지 + MMS body 12줄 이상
- 다국어 요청 시 절대 누락 금지

[광고/비광고 규칙]
- 광고(adType="광고"):
  * 첫 줄 "(광고)[KT안내]" 형태 권장
  * 혜택/조건 리스트(불릿)
  * 유의사항 문단
  * 마지막 줄: "[무료수신거부] 080-451-0114" 필수
- 비광고(adType="비광고"):
  * "[KT안내]" 또는 "[안내]"로 시작
  * 인사 + 발송 사유 + 고객 행동 + 문의처 + 마무리

[recommendedCheckTypes]
- 값: "법률","정보보호","리스크","공정경쟁"
- 2개 이상 반드시 포함(절대 ["법률"]만 금지)
- 광고/프로모션이면 ["법률","공정경쟁"](+리스크) 권장

[예약값]
- common.reservationDate: "YYYY-MM-DD"
- common.reservationTime: "HH:MM"
- 절대 비우지 말고 채움

[예약일 설정 - 절대 규칙(중요)]
- 오늘 날짜는 userPrompt의 [날짜 기준 - 서버 고정값]을 사용
- reservationDate는 반드시 "${TOMORROW_STR}" 이후 날짜만 허용(과거 및 "${TODAY_STR}" 포함 금지)
- 맥락상 특정 날짜 요구가 없으면 reservationDate는 "${TWO_WEEKS_LATER_STR}" 로 고정
- 임의로 계산/추측하여 다른 날짜를 만들지 마세요(복사해서 사용)

[출력 JSON 형식]
마크다운/설명 문장 금지. JSON만 출력.

{
  "sendType": "SMS" | "MMS" | "RCS_MMS" | "RCS_CAROUSEL",
  "common": {
    "messageName": string,
    "adType": "광고" | "비광고",
    "sendPurpose": "공지" | "이벤트" | "알림" | "기타",
    "callbackType": "대표번호" | "080" | "개인번호",
    "enabledLangs": string[],
    "reservationDate": string,
    "reservationTime": string,
    "myktLink": "포함" | "미포함",
    "closingRemark": "포함" | "미포함",
    "imagePosition": "위" | "아래"
  },
  "sms": {
    "contents": {
      "<언어코드>": { "body": string }
    }
  },
  "rcs": {
    "slideCount": number,
    "contents": {
      "<언어코드>": {
        "slides": [
          {
            "title": string,
            "body": string,
            "imageName": string,
            "buttonCount": 0 | 1 | 2,
            "button1Label": string,
            "button2Label": string,
            "button1Url": string,
            "button2Url": string
          }
        ]
      }
    }
  },
  "mms": {
    "contents": {
      "<언어코드>": { "title": string, "body": string, "imageName": string }
    }
  },
  "recommendedCheckTypes": ("법률" | "정보보호" | "리스크" | "공정경쟁")[]
}
`.trim();

        const userPrompt = `
[요청 설명]
${prompt}

[날짜 기준 - 서버 고정값]
- 오늘(Asia/Seoul): ${TODAY_STR}
- 내일: ${TOMORROW_STR}
- 기본 예약일(맥락 없을 때 고정): ${TWO_WEEKS_LATER_STR}

[추가 정보]
- 기본 광고 여부(adType): ${adType}
- 사용 언어 코드(enabledLangs): ${langsText}
- 서버 적용 sendType(고정): ${chosenSendType}
${
            chosenSendType === "RCS_CAROUSEL"
                ? `- 요청된 RCS Carousel 카드 수(slideCount): ${normalizedSlideCount}`
                : ""
        }

[예약일/시간 출력 지시]
- reservationDate는 위 3개 값 중 하나를 그대로 복사해서 사용하세요.
- 임의 계산/추측으로 다른 날짜 생성 금지.
- reservationTime도 "HH:MM" 형식으로 반드시 채우세요.

반드시 JSON 스키마 그대로만 출력하세요.
선택된 타입의 contents는 절대 비우지 마세요.
`.trim();

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0.4,
            max_tokens: 1400,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        });

        const raw = completion.choices[0].message.content ?? "{}";
        const data = JSON.parse(raw);

        // ✅ 서버 안전장치: sendType은 무조건 서버가 결정한 값으로 고정
        data.sendType = chosenSendType;

        // ✅ 캐러셀이면 slideCount 보정
        if (chosenSendType === "RCS_CAROUSEL") {
            data.rcs = data.rcs ?? {};
            data.rcs.slideCount = normalizedSlideCount;
        }

        // ✅ contents 누락/비어있을 때 최소 보정 (UI가 죽지 않게)
        //    - 선택된 타입에 맞는 섹션은 반드시 존재하도록 만들어줌
        const langs = enabledLangs.length ? enabledLangs : ["ko"];
        const firstLang = langs[0] ?? "ko";

        data.sms = data.sms ?? { contents: {} };
        data.rcs =
            data.rcs ?? {
                slideCount: chosenSendType === "RCS_CAROUSEL" ? normalizedSlideCount : 1,
                contents: {},
            };
        data.mms = data.mms ?? { contents: {} };

        if (chosenSendType === "SMS") {
            if (!data.sms.contents || isEmptyObject(data.sms.contents)) {
                data.sms.contents = { [firstLang]: { body: "" } };
            }
        }

        if (chosenSendType === "MMS") {
            if (!data.mms.contents || isEmptyObject(data.mms.contents)) {
                data.mms.contents = { [firstLang]: { title: "", body: "", imageName: "" } };
            }
        }

        if (chosenSendType === "RCS_MMS") {
            // rcs 1장 + mms 필수
            if (!data.rcs.contents || isEmptyObject(data.rcs.contents)) {
                data.rcs.contents = {
                    [firstLang]: {
                        slides: [
                            {
                                title: "",
                                body: "",
                                imageName: "",
                                buttonCount: 1,
                                button1Label: "",
                                button2Label: "",
                                button1Url: "https://example.com",
                                button2Url: "",
                            },
                        ],
                    },
                };
            }
            if (!data.mms.contents || isEmptyObject(data.mms.contents)) {
                data.mms.contents = { [firstLang]: { title: "", body: "", imageName: "" } };
            }
            data.rcs.slideCount = 1;
        }

        if (chosenSendType === "RCS_CAROUSEL") {
            // rcs 2~5장 + mms 필수
            if (!data.rcs.contents || isEmptyObject(data.rcs.contents)) {
                data.rcs.contents = {
                    [firstLang]: {
                        slides: Array.from({ length: normalizedSlideCount }).map(() => ({
                            title: "",
                            body: "",
                            imageName: "",
                            buttonCount: 1,
                            button1Label: "",
                            button2Label: "",
                            button1Url: "https://example.com",
                            button2Url: "",
                        })),
                    },
                };
            }
            if (!data.mms.contents || isEmptyObject(data.mms.contents)) {
                data.mms.contents = { [firstLang]: { title: "", body: "", imageName: "" } };
            }
            data.rcs.slideCount = normalizedSlideCount;
        }

        // ✅ recommendedCheckTypes 비어있으면 기본값 보정(광고면 법률+공정경쟁, 그 외 법률+리스크)
        if (!Array.isArray(data.recommendedCheckTypes) || data.recommendedCheckTypes.length < 2) {
            data.recommendedCheckTypes = adType === "광고" ? ["법률", "공정경쟁"] : ["법률", "리스크"];
        }

        // ✅ (권장) 날짜 최종 방어: 과거/형식 오류면 기본값으로 보정
        data.common = data.common ?? {};
        if (!isYmd(data.common.reservationDate)) {
            data.common.reservationDate = TWO_WEEKS_LATER_STR;
        }
        if (typeof data.common.reservationDate === "string" && data.common.reservationDate < TOMORROW_STR) {
            data.common.reservationDate = TWO_WEEKS_LATER_STR;
        }
        if (!isHm(data.common.reservationTime)) {
            data.common.reservationTime = "10:00";
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("[generate-message ERROR]", err);
        return NextResponse.json({ error: "FAILED_TO_GENERATE" }, { status: 500 });
    }
}
