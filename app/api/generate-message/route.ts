// app/api/generate-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
});

type SendType = "SMS" | "MMS" | "RCS_MMS" | "RCS_CAROUSEL";

/**
 * B) 프롬프트에서 메시지 타입을 읽어오기
 * - "[메시지 타입]" 섹션 형태를 우선 파싱
 * - 없으면 본문 내 "SMS/MMS/RCS..." 단어로 보조 파싱
 */
function extractSendTypeFromPrompt(prompt: string): SendType | undefined {
    const p = (prompt ?? "").toString();

    // 1) 섹션 기반 파싱: [메시지 타입] ... 다음 섹션 전까지
    const sectionMatch = p.match(
        /\[\s*메시지\s*타입\s*]\s*([\s\S]*?)(\n\s*\[|$)/i
    );

    const pickFromBlock = (block: string): SendType | undefined => {
        const b = block.trim();

        // 더 구체적인 것부터
        if (/RCS\s*[_-]?\s*CAROUSEL|RCS\s*캐러셀|캐러셀/i.test(b))
            return "RCS_CAROUSEL";
        if (/RCS\s*[_-]?\s*MMS|RCS\s*MMS/i.test(b)) return "RCS_MMS";
        if (/\bMMS\b/i.test(b)) return "MMS";
        if (/\bSMS\b/i.test(b)) return "SMS";
        return undefined;
    };

    if (sectionMatch?.[1]) {
        const v = pickFromBlock(sectionMatch[1]);
        if (v) return v;
    }

    // 2) 보조 파싱: 전체 텍스트에서 키워드 탐색(오탐 줄이려고 우선순위)
    const v = pickFromBlock(p);
    return v;
}

/**
 * AUTO 규칙: 타입 미지정일 때 우선순위/조건 기반 결정
 * 우선순위: MMS > RCS_CAROUSEL > RCS_MMS > SMS
 * (SMS는 '인증/OTP/단문/짧게' 같은 강한 조건일 때만 내려감)
 */
function decideSendTypeAuto(prompt: string, slideCount?: unknown): SendType {
    const p = (prompt ?? "").toString();

    // 1) SMS가 "필수"인 경우(강조건)
    const smsHard =
        /인증|otp|one[- ]?time|verification|코드|비밀번호|로그인|간단\s*공지|단문|한\s*줄|짧게/i.test(
            p
        );
    if (smsHard) return "SMS";

    // 2) RCS 필요 조건
    const wantsCarousel =
        /캐러셀|carousel|슬라이드|slide|카드\s*여러|여러\s*장|2\s*장\s*이상/i.test(p);
    const wantsRcs = /rcs|버튼|cta|바로가기|링크\s*버튼|action/i.test(p);

    const sc =
        typeof slideCount === "number" && Number.isFinite(slideCount)
            ? slideCount
            : undefined;

    // 3) 우선순위 적용 (MMS가 기본)
    // 단, carousel 강조건이 있으면 그때만 carousel 선택
    if (wantsCarousel || (typeof sc === "number" && sc >= 2)) return "RCS_CAROUSEL";
    if (wantsRcs) return "RCS_MMS";

    return "MMS";
}

function normalizeSlideCount(slideCountRaw: unknown): number {
    const n =
        typeof slideCountRaw === "number" && Number.isFinite(slideCountRaw)
            ? slideCountRaw
            : 3;
    return Math.min(Math.max(n, 2), 5);
}

// ---- 응답 검증/보정(운영 안정장치) ----
function getEnabledLangs(bodyLangs: unknown): string[] {
    const langs = Array.isArray(bodyLangs) ? bodyLangs : ["ko"];
    const cleaned = langs.map(String).filter(Boolean);
    return cleaned.length > 0 ? cleaned : ["ko"];
}

function hasSmsContents(data: any, enabledLangs: string[]): boolean {
    const c = data?.sms?.contents;
    if (!c || typeof c !== "object") return false;
    return enabledLangs.every((lang) => typeof c?.[lang]?.body === "string" && c[lang].body.trim().length > 0);
}

function hasMmsContents(data: any, enabledLangs: string[]): boolean {
    const c = data?.mms?.contents;
    if (!c || typeof c !== "object") return false;
    return enabledLangs.every(
        (lang) =>
            typeof c?.[lang]?.title === "string" &&
            c[lang].title.trim().length > 0 &&
            typeof c?.[lang]?.body === "string" &&
            c[lang].body.trim().length > 0 &&
            typeof c?.[lang]?.imageName === "string" &&
            c[lang].imageName.trim().length > 0
    );
}

function hasRcsContents(data: any, enabledLangs: string[], minSlides: number): boolean {
    const c = data?.rcs?.contents;
    if (!c || typeof c !== "object") return false;

    return enabledLangs.every((lang) => {
        const slides = c?.[lang]?.slides;
        if (!Array.isArray(slides) || slides.length < minSlides) return false;
        // 최소한 각 슬라이드에 title/body/imageName이 있어야 함
        return slides.every(
            (s: any) =>
                typeof s?.title === "string" &&
                s.title.trim().length > 0 &&
                typeof s?.body === "string" &&
                s.body.trim().length > 0 &&
                typeof s?.imageName === "string" &&
                s.imageName.trim().length > 0
        );
    });
}

function ensureCommonDefaults(data: any, enabledLangs: string[], adType: "광고" | "비광고") {
    data.common = data.common ?? {};
    data.common.enabledLangs = Array.isArray(data.common.enabledLangs) && data.common.enabledLangs.length
        ? data.common.enabledLangs
        : enabledLangs;

    // 값 비어도 최소 채움
    data.common.adType = data.common.adType ?? adType;
    data.common.sendPurpose = data.common.sendPurpose ?? "기타";
    data.common.callbackType = data.common.callbackType ?? (adType === "광고" ? "080" : "대표번호");
    data.common.myktLink = data.common.myktLink ?? "미포함";
    data.common.closingRemark = data.common.closingRemark ?? "미포함";
    data.common.imagePosition = data.common.imagePosition ?? "위";

    // 예약일/시간은 빈 값이면 예시라도 채움(서버에서 강제)
    data.common.reservationDate = data.common.reservationDate ?? "2026-01-08";
    data.common.reservationTime = data.common.reservationTime ?? "14:30";
    data.common.messageName = data.common.messageName ?? "메시지 안내";
}

function ensureRecommendedCheckTypes(data: any, adType: "광고" | "비광고") {
    // 빈 배열/없음 방지
    const arr = Array.isArray(data.recommendedCheckTypes) ? data.recommendedCheckTypes : [];
    if (arr.length >= 2) return;

    // 광고면 보통 법률+공정경쟁(+리스크)
    data.recommendedCheckTypes = adType === "광고"
        ? ["법률", "공정경쟁", "리스크"]
        : ["법률", "리스크"];
}

function stripUnusedSections(data: any, sendType: SendType) {
    // UI가 혼란스러우면 필요없는 섹션을 비워두거나 제거(선택)
    // 여기서는 "비워도 된다" 수준으로만 정리
    if (sendType === "SMS") {
        // SMS만 쓰는 경우: mms/rcs를 아예 지워도 되고, 남겨도 되는데 혼란 방지로 삭제
        delete data.mms;
        delete data.rcs;
    }
    if (sendType === "MMS") {
        delete data.sms;
        delete data.rcs;
    }
    if (sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL") {
        // RCS 타입은 sms는 굳이 필요 없으니 제거
        delete data.sms;
    }
}

async function generateOnce(systemPrompt: string, userPrompt: string) {
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
    return JSON.parse(raw);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const prompt: string = String(body?.prompt ?? "");
        const enabledLangs = getEnabledLangs(body?.enabledLangs);
        const slideCountRaw = body?.slideCount;
        const adType: "비광고" | "광고" = body?.adType === "광고" ? "광고" : "비광고";

        // ✅ 타입 결정 우선순위:
        // 1) 프롬프트에 타입 명시 > 2) body sendType > 3) AUTO 룰
        const promptSendType = extractSendTypeFromPrompt(prompt);
        const bodySendType: SendType | undefined = body?.sendType;
        const chosenSendType: SendType =
            promptSendType ?? bodySendType ?? decideSendTypeAuto(prompt, slideCountRaw);

        const normalizedSlideCount = normalizeSlideCount(slideCountRaw);
        const langsText = enabledLangs.join(", ");

        // ✅ 시스템 프롬프트: 타입 고정 + RCS면 MMS 필수 + 빈 contents 금지 + 가독성 강제
        const systemPrompt = `
당신은 통신사(KT)·공공기관·금융사·쇼핑몰 등에서 고객에게 발송하는 실제 문자(SMS/MMS/RCS) 메시지를 쓰는 전문 카피라이터입니다.
목표: 운영 환경에 바로 넣어도 될 정도로 완성된 메시지를, 아래 규칙과 JSON 스키마에 맞춰 생성하세요.

────────────────────────────────────────────────────────
[이번 요청의 sendType 고정 - 절대 변경 금지]
- 이번 응답의 sendType은 반드시 "${chosenSendType}" 입니다.
- 절대 다른 타입으로 바꾸지 마세요.

[섹션 필수 규칙]
- sendType="SMS"        : sms.contents.<언어코드>.body 반드시 채움 (mms/rcs는 출력하지 않거나 비워도 됨)
- sendType="MMS"        : mms.contents.<언어코드>.title/body/imageName 반드시 채움 (sms/rcs는 출력하지 않거나 비워도 됨)
- sendType="RCS_MMS"    : rcs.contents(슬라이드 1장) + mms.contents 둘 다 반드시 채움 (mms 누락은 실패)
- sendType="RCS_CAROUSEL": rcs.contents(슬라이드 2~5장) + mms.contents 둘 다 반드시 채움 (mms 누락은 실패)

[가독성/성의 하드룰]
- 모든 타입에서 "문단 구분"은 필수(줄바꿈/섹션헤더/불릿).
- 두세 줄짜리 성의 없는 본문은 실패.
- 최소 조건:
  * SMS: 6줄 이상 + 문의처 + 유의사항(또는 조건) 포함
  * MMS: body 9줄 이상 + 섹션헤더(대괄호) 2개 이상 + 불릿 4개 이상
  * RCS_MMS: RCS body 5줄 이상 + MMS body 10줄 이상
  * RCS_CAROUSEL: 각 카드 body 4줄 이상, 카드끼리 내용 중복 금지 + MMS body 12줄 이상

[광고 규칙]
- adType="광고"이면: 본문 상단 "(광고)[KT안내]" 형태, 혜택/조건 상세, 유의사항, 마지막 줄에 "[무료수신거부] 080-451-0114" 필수.

[recommendedCheckTypes]
- "법률","정보보호","리스크","공정경쟁" 중 2개 이상 반드시 포함.
- 광고/프로모션이면 기본적으로 "법률"+"공정경쟁"(+리스크 권장).

────────────────────────────────────────────────────────
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

[추가 정보]
- 광고 여부(adType): ${adType}
- 사용 언어(enabledLangs): ${langsText}
- 최종 적용 sendType(서버 결정/고정): ${chosenSendType}
${
            chosenSendType === "RCS_CAROUSEL"
                ? `- RCS Carousel 카드 수(slideCount): ${normalizedSlideCount}`
                : ""
        }

[주의]
- 선택된 sendType에 해당하는 contents는 절대 비우지 마세요.
- RCS 타입이면 mms.contents는 필수입니다(대체 발송).
- JSON만 출력하세요.
    `.trim();

        // 1차 생성
        let data = await generateOnce(systemPrompt, userPrompt);

        // ---- 검증/수리(재시도 1번) ----
        const needsRepair = (() => {
            if (chosenSendType === "SMS") return !hasSmsContents(data, enabledLangs);
            if (chosenSendType === "MMS") return !hasMmsContents(data, enabledLangs);
            if (chosenSendType === "RCS_MMS") {
                return !hasRcsContents(data, enabledLangs, 1) || !hasMmsContents(data, enabledLangs);
            }
            // RCS_CAROUSEL
            return !hasRcsContents(data, enabledLangs, 2) || !hasMmsContents(data, enabledLangs);
        })();

        if (needsRepair) {
            const repairPrompt = `
직전 JSON 응답에 필수 필드가 누락/비어있습니다. 아래 규칙을 만족하도록 "완성된 JSON"을 다시 출력하세요.

- sendType은 반드시 "${chosenSendType}" (변경 금지)
- enabledLangs: ${langsText} 각 언어별 contents를 모두 채우기
- RCS 타입이면 mms.contents는 필수(대체발송)이며 비어있으면 실패
- 가독성/성의 최소 조건을 반드시 만족

[원본 요청]
${prompt}

[추가 정보]
- adType: ${adType}
${
                chosenSendType === "RCS_CAROUSEL"
                    ? `- slideCount: ${normalizedSlideCount}`
                    : ""
            }

JSON만 출력.
      `.trim();

            data = await generateOnce(systemPrompt, repairPrompt);
        }

        // ---- 서버 보정(최후 안전장치) ----
        // sendType 강제 고정
        data.sendType = chosenSendType;

        // common 기본값 보정
        ensureCommonDefaults(data, enabledLangs, adType);

        // recommendedCheckTypes 보정(빈 배열 방지)
        ensureRecommendedCheckTypes(data, adType);

        // slideCount 보정
        if (chosenSendType === "RCS_CAROUSEL") {
            data.rcs = data.rcs ?? {};
            data.rcs.slideCount = normalizedSlideCount;
        } else if (chosenSendType === "RCS_MMS") {
            data.rcs = data.rcs ?? {};
            data.rcs.slideCount = 1;
        }

        // 필수 섹션 보정(아예 누락된 경우 최소 뼈대라도 넣음)
        if (chosenSendType === "SMS") {
            data.sms = data.sms ?? { contents: {} };
            for (const lang of enabledLangs) {
                data.sms.contents[lang] = data.sms.contents[lang] ?? { body: "" };
            }
        }

        if (chosenSendType === "MMS") {
            data.mms = data.mms ?? { contents: {} };
            for (const lang of enabledLangs) {
                data.mms.contents[lang] = data.mms.contents[lang] ?? {
                    title: "",
                    body: "",
                    imageName: "",
                };
            }
        }

        if (chosenSendType === "RCS_MMS" || chosenSendType === "RCS_CAROUSEL") {
            data.mms = data.mms ?? { contents: {} };
            data.rcs = data.rcs ?? { slideCount: chosenSendType === "RCS_MMS" ? 1 : normalizedSlideCount, contents: {} };
            for (const lang of enabledLangs) {
                data.mms.contents[lang] = data.mms.contents[lang] ?? {
                    title: "",
                    body: "",
                    imageName: "",
                };
                data.rcs.contents[lang] = data.rcs.contents[lang] ?? { slides: [] };
            }
        }

        // (선택) 사용하지 않는 섹션 제거(프론트 혼란 방지)
        stripUnusedSections(data, chosenSendType);

        return NextResponse.json(data);
    } catch (err) {
        console.error("[generate-message ERROR]", err);
        return NextResponse.json({ error: "FAILED_TO_GENERATE" }, { status: 500 });
    }
}
