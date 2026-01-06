// components/AiPromptModal.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/Button";

type AiPromptModalProps = {
    open: boolean;
    onClose: () => void;
    aiPrompt: string;
    setAiPrompt: (value: string) => void;
    aiLoading: boolean;
    onSubmit: () => void;
};

type SendTypePreference = "auto" | "SMS" | "MMS" | "RCS_MMS" | "RCS_CAROUSEL";
type AdTypePreference = "광고" | "비광고" | "auto";

const EXAMPLE_PROMPTS = [
    "연말 KT VIP 고객 대상으로 데이터 쿠폰 증정 이벤트를 알리는 메시지를 만들고 싶어. 광고 문자고, RCS Carousel + 대체 MMS 조합으로 카드 3장 구성해 줘.",
    "미납 요금 납부 기한 안내 문자를 보낼 건데, 비광고성 안내 톤으로 SMS나 간단한 MMS가 좋을 것 같아.",
    "신규 요금제 출시 프로모션을 하루 동안 진행하는데, 버튼이 들어간 RCS + 대체 MMS 기반의 광고성 메시지를 만들고 싶어.",
];

const AiPromptModal: React.FC<AiPromptModalProps> = ({
                                                         open,
                                                         onClose,
                                                         aiPrompt,
                                                         setAiPrompt,
                                                         aiLoading,
                                                         onSubmit,
                                                     }) => {
    if (!open) return null;

    // ───────────────── 1~6 단계 답변 상태 ─────────────────
    const [step, setStep] = useState<number>(1);

    // 1단계: 캠페인 / 상황
    const [campaignName, setCampaignName] = useState("");
    const [campaignGoal, setCampaignGoal] = useState(""); // 예: VIP 감사, 연체 안내 등

    // 2단계: 대상 & 규모
    const [targetDesc, setTargetDesc] = useState(""); // 예: KT VIP, 20대, 해지고객 등
    const [expectedVolume, setExpectedVolume] = useState("");

    // 3단계: 광고 여부 / 발송 목적
    const [adPref, setAdPref] = useState<AdTypePreference>("auto");
    const [purpose, setPurpose] = useState<
        "" | "공지" | "이벤트" | "알림" | "기타"
    >("");

    // 4단계: 메시지 타입 선호
    const [sendTypePref, setSendTypePref] = useState<SendTypePreference>("auto");
    const [slideCountHint, setSlideCountHint] = useState<"" | "2" | "3" | "4" | "5">("");

    // 5단계: 언어 / 톤
    const [langsHint, setLangsHint] = useState("ko"); // 예: ko, ko,en
    const [tone, setTone] = useState(""); // 예: 정중하지만 너무 딱딱하진 않게, 등

    // 6단계: 필수 포함 요소
    const [mustInclude, setMustInclude] = useState(
        "혜택 요약, 상세 안내, 유의사항, 문의처를 꼭 넣어줘."
    );
    const [legalNote, setLegalNote] = useState(
        "(광고) 태그와 무료수신거부 번호 문구도 빠뜨리지 말고 넣어줘."
    );

    const totalSteps = 6;

    const goNext = () => {
        setStep((prev) => Math.min(totalSteps, prev + 1));
    };

    const goPrev = () => {
        setStep((prev) => Math.max(1, prev - 1));
    };

    // ───────────────── 프롬프트 자동 생성 ─────────────────
    const builtPrompt = useMemo(() => {
        const lines: string[] = [];

        // 1. 기본 상황
        lines.push("[캠페인 개요]");
        if (campaignName) lines.push(`- 캠페인/행사명: ${campaignName}`);
        if (campaignGoal) lines.push(`- 목적/상황: ${campaignGoal}`);

        // 2. 대상
        lines.push("\n[대상/규모]");
        if (targetDesc) lines.push(`- 발송 대상: ${targetDesc}`);
        if (expectedVolume) lines.push(`- 예상 발송량: ${expectedVolume}명`);

        // 3. 광고 여부 / 발송 목적
        lines.push("\n[광고 여부 & 발송 목적]");
        if (adPref !== "auto") lines.push(`- 광고 여부: ${adPref}로 작성`);
        else lines.push("- 광고 여부는 내용상 자연스럽게 판단해서 설정해 줘.");
        if (purpose) lines.push(`- 발송 목적: ${purpose}`);

        // 4. 메시지 타입
        lines.push("\n[메시지 타입]");
        if (sendTypePref === "auto") {
            lines.push(
                "- 메시지 타입(SMS/MMS/RCS_MMS/RCS_CAROUSEL)은 상황을 보고 너가 가장 적절한 것으로 추천해서 작성해 줘."
            );
        } else {
            lines.push(`- 선호 메시지 타입: ${sendTypePref}`);
        }
        if (slideCountHint && sendTypePref === "RCS_CAROUSEL") {
            lines.push(`- RCS 캐러셀 카드 수 희망: 약 ${slideCountHint}장`);
        }

        // 5. 언어/톤
        lines.push("\n[언어/톤]");
        if (langsHint) {
            lines.push(
                `- 사용할 언어 코드: ${langsHint} (콤마 구분, 예: ko 또는 ko,en 등)`
            );
        }
        if (tone) {
            lines.push(`- 메시지 톤 & 스타일: ${tone}`);
        }

        // 6. 필수 포함 요소
        lines.push("\n[내용 구성 요청]");
        if (mustInclude) lines.push(`- 필수 포함 요소: ${mustInclude}`);
        if (legalNote) lines.push(`- 준수해야 할 문구/규칙: ${legalNote}`);

        lines.push(
            "\n위 정보를 바탕으로, 실제 발송 가능한 수준의 SMS/MMS/RCS 메시지 초안을 만들어 줘."
        );
        lines.push(
            "특히, RCS 타입을 선택할 경우 RCS 본문과 대체 MMS 본문을 모두 꽉 찬 내용으로 작성해 줘."
        );

        return lines.join("\n");
    }, [
        campaignName,
        campaignGoal,
        targetDesc,
        expectedVolume,
        adPref,
        purpose,
        sendTypePref,
        slideCountHint,
        langsHint,
        tone,
        mustInclude,
        legalNote,
    ]);

    const handleApplyBuiltPrompt = () => {
        setAiPrompt(builtPrompt);
    };

    const handleSubmitClick = () => {
        // 혹시 사용자가 직접 수정 안 했더라도, builtPrompt를 기본값으로 보장
        if (!aiPrompt.trim()) {
            setAiPrompt(builtPrompt);
        }
        onSubmit();
    };

    // ───────────────── 렌더: 단계별 폼 ─────────────────

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                            1단계. 어떤 상황/캠페인에 쓰는 메시지인가요?
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            예) 연말 VIP 고객 감사, 미납요금 안내, 신규 요금제 런칭 등
                        </p>
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-slate-700">
                                캠페인/행사명 (선택)
                            </label>
                            <input
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예: 2025 연말 VIP 감사 데이터 쿠폰 이벤트"
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-slate-700">
                                목적/상황 (필수)
                            </label>
                            <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예) 연말을 맞아 KT VIP 고객에게 감사 인사와 함께 데이터 쿠폰을 증정하는 이벤트를 안내하려고 해."
                                value={campaignGoal}
                                onChange={(e) => setCampaignGoal(e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                            2단계. 누구에게, 어느 정도 규모로 보내나요?
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            대상 특징과 대략적인 발송량을 알려주면 톤과 구성에 도움이 돼요.
                        </p>
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-slate-700">
                                발송 대상 (필수)
                            </label>
                            <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예) 최근 1년간 데이터 사용량 상위 5% VIP 고객, 20~40대 직장인 중심"
                                value={targetDesc}
                                onChange={(e) => setTargetDesc(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-slate-700">
                                예상 발송량 (선택)
                            </label>
                            <input
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예: 100,000"
                                value={expectedVolume}
                                onChange={(e) => setExpectedVolume(e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                            3단계. 광고성인가요, 안내성인가요?
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            광고 여부와 발송 목적에 따라 문구 구성과 필수 표현이 달라져요.
                        </p>
                        <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-700">
                광고 여부
              </span>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {[
                                    { code: "auto", label: "상황에 맞게 알아서" },
                                    { code: "광고", label: "광고" },
                                    { code: "비광고", label: "비광고" },
                                ].map((opt) => (
                                    <button
                                        key={opt.code}
                                        type="button"
                                        onClick={() => setAdPref(opt.code as AdTypePreference)}
                                        className={`h-8 px-3 rounded-full border transition ${
                                            adPref === opt.code
                                                ? "bg-teal-500 text-white border-teal-500"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-700">
                발송 목적
              </span>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {["공지", "이벤트", "알림", "기타"].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPurpose(p as typeof purpose)}
                                        className={`h-8 px-3 rounded-full border transition ${
                                            purpose === p
                                                ? "bg-teal-500 text-white border-teal-500"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                            4단계. 어떤 메시지 타입이 더 좋을까요?
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            대략 선호하는 형태가 있다면 알려주고, 애매하면 &quot;상황에 맞게
                            알아서&quot;를 선택해 주세요.
                        </p>
                        <div className="space-y-2">
              <span className="text-[11px] font-medium text-slate-700">
                타입 선호
              </span>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {[
                                    { code: "auto", label: "상황에 맞게 알아서" },
                                    { code: "SMS", label: "SMS" },
                                    { code: "MMS", label: "MMS" },
                                    { code: "RCS_MMS", label: "RCS + 대체 MMS" },
                                    { code: "RCS_CAROUSEL", label: "RCS Carousel + 대체 MMS" },
                                ].map((opt) => (
                                    <button
                                        key={opt.code}
                                        type="button"
                                        onClick={() =>
                                            setSendTypePref(opt.code as SendTypePreference)
                                        }
                                        className={`h-8 px-3 rounded-full border transition ${
                                            sendTypePref === opt.code
                                                ? "bg-teal-500 text-white border-teal-500"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {sendTypePref === "RCS_CAROUSEL" && (
                            <div className="space-y-2">
                <span className="text-[11px] font-medium text-slate-700">
                  RCS 캐러셀 카드 수 (선택)
                </span>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    {["2", "3", "4", "5"].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setSlideCountHint(n as typeof slideCountHint)}
                                            className={`h-8 px-3 rounded-full border transition ${
                                                slideCountHint === n
                                                    ? "bg-teal-500 text-white border-teal-500"
                                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                            }`}
                                        >
                                            {n}장 정도
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                            5단계. 언어와 톤을 어떻게 할까요?
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            언어 코드는 콤마로 구분해서 적어주세요. (예: ko 또는 ko,en)
                        </p>
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-slate-700">
                                사용할 언어 코드
                            </label>
                            <input
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예: ko 또는 ko,en"
                                value={langsHint}
                                onChange={(e) => setLangsHint(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-slate-700">
                                메시지 톤 & 스타일
                            </label>
                            <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예) VIP 대상이라 너무 가볍지 않게, 정중하지만 따뜻한 느낌으로 써줘."
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 6:
            default:
                return (
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-900">
                            6단계. 꼭 들어가야 하는 내용이 있다면 알려주세요.
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            혜택/유의사항/수신거부 문구 등 빠지면 안 되는 요소를 적어 두면
                            좋아요.
                        </p>
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-slate-700">
                                필수 포함 요소
                            </label>
                            <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예) 혜택 요약, 상세 안내, 유의사항, 문의처를 꼭 넣어줘."
                                value={mustInclude}
                                onChange={(e) => setMustInclude(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-medium text-slate-700">
                                준수해야 할 문구/규칙
                            </label>
                            <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예) (광고) 태그와 무료수신거부 번호 문구도 빠뜨리지 말고 넣어줘."
                                value={legalNote}
                                onChange={(e) => setLegalNote(e.target.value)}
                            />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl px-8 py-6 space-y-6">
                {/* 헤더 */}
                <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-xl">
                            ✨
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                AI로 메시지 자동 작성
                            </h3>
                            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                                간단한 질문에만 답하면 캠페인 목적·대상·타입까지 반영한 프롬프트를
                                자동으로 만들어 드릴게요. 필요하면 마지막에 직접 문장을 더 고쳐
                                쓸 수도 있어요.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="text-sm text-slate-400 hover:text-slate-600"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* 상단: 진행 단계 인디케이터 */}
                <div className="flex items-center gap-2 text-[11px]">
                    {Array.from({ length: totalSteps }).map((_, idx) => {
                        const current = idx + 1;
                        const active = current === step;
                        const done = current < step;
                        return (
                            <div
                                key={current}
                                className={`flex-1 h-1.5 rounded-full ${
                                    active
                                        ? "bg-teal-500"
                                        : done
                                            ? "bg-teal-200"
                                            : "bg-slate-200"
                                }`}
                            />
                        );
                    })}
                    <span className="ml-2 text-slate-500">
            {step} / {totalSteps}
          </span>
                </div>

                {/* 가운데: 단계별 질문 영역 */}
                <div className="border rounded-xl border-slate-200 bg-slate-50/60 px-4 py-4">
                    {renderStep()}
                </div>

                {/* 예시 프롬프트 (빠르게 한 방에 쓰고 싶을 때) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">
              예시 프롬프트로 바로 시작하기
            </span>
                        <span className="text-[10px] text-slate-400">
              아래 예시를 누르면 프롬프트 영역에 바로 채워집니다.
            </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                        {EXAMPLE_PROMPTS.map((example, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setAiPrompt(example)}
                                className={`rounded-full px-4 py-1.5 border text-xs ${
                                    aiPrompt === example
                                        ? "bg-teal-500 border-teal-500 text-white"
                                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                            >
                                예시 {idx + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 프롬프트 미리보기 & 직접 편집 */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                                최종 프롬프트
                            </label>
                            <button
                                type="button"
                                className="rounded-full border border-teal-500 px-2 py-0.5 text-[10px] text-teal-700 hover:bg-teal-50"
                                onClick={handleApplyBuiltPrompt}
                            >
                                위 1~6단계 답변으로 채우기
                            </button>
                        </div>
                        <span className="text-[11px] text-slate-400">
              {aiPrompt.length}자
            </span>
                    </div>
                    <textarea
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[140px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="위 질문에 답하면 이 영역에 자동으로 프롬프트가 채워지고, 여기서 세부 문장을 직접 다듬을 수 있어요."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                    />
                </div>

                {/* 하단: 네비게이션 + 생성 버튼 */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 sm:max-w-xs">
            <span>
              AI가 결정한 메시지 타입과 대체 MMS 설정까지 화면에 바로 반영됩니다.
              실제 발송 전에는 반드시 한 번 더 검토해 주세요.
            </span>
                    </div>
                    <div className="flex justify-end gap-2 text-xs">
                        <Button
                            type="button"
                            variant="outline"
                            className="px-3"
                            onClick={goPrev}
                            disabled={step === 1}
                        >
                            이전
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="px-3"
                            onClick={goNext}
                            disabled={step === totalSteps}
                        >
                            다음
                        </Button>
                        <Button
                            type="button"
                            className="px-4"
                            onClick={handleSubmitClick}
                            disabled={aiLoading}
                        >
                            {aiLoading ? "작성 중..." : "이 프롬프트로 메시지 만들기"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiPromptModal;
