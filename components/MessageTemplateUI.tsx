// components/MessageTemplateUI.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import ReservationModal from "@/components/ReservationModal";
import RcsEditor from "@/components/RcsEditor";
import RcsSingleEditor from "@/components/RcsSingleEditor";
import MmsEditor from "@/components/MmsEditor";
import SmsEditor from "@/components/SmsEditor";
import AiPromptModal from "@/components/AiPromptModal";

import {
    LANGS,
    HOURLY_CAPACITY,
    LangContent,
    MmsContent,
    CheckType,
    createInitialLangState,
    createInitialMmsState,
    formatReservationLabel,
} from "@/lib/messageTemplate";

// ─────────────────────────── 타입 정의 ───────────────────────────

type SendType = "SMS" | "MMS" | "RCS_MMS" | "RCS_CAROUSEL";
type SmsContentsState = Record<string, string>;
type VolumeVerifyStatus = null | "ok" | "fail" | "needDate";

type AiGenerateResponse = {
    sendType: SendType;
    common: {
        messageName: string;
        adType: "광고" | "비광고";
        sendPurpose: "공지" | "이벤트" | "알림" | "기타";
        callbackType: "대표번호" | "080" | "개인번호";
        enabledLangs: string[];
        reservationDate: string;
        reservationTime: string;
        myktLink: "포함" | "미포함";
        closingRemark: "포함" | "미포함";
        imagePosition: "위" | "아래";
    };

    sms?: {
        contents: Record<string, { body: string }>;
    };

    rcs?: {
        slideCount: number;
        langs?: string[];
        contents: Record<string, LangContent>;
    };

    mms?: {
        langs?: string[];
        contents: Record<string, MmsContent>;
    };
};

type GeneratePayload = {
    prompt: string;
    enabledLangs: string[];
    adType: "광고" | "비광고";
    sendType?: SendType;
    slideCount?: number;
};

// ─────────────────────────── 컴포넌트 ───────────────────────────

export default function MessageTemplateUI() {
    // 1) 메시지 타입 / 언어 상태
    const [sendType, setSendType] = useState<SendType>("SMS");
    const [activeLang, setActiveLang] = useState<string>("ko");
    const [enabledLangs, setEnabledLangs] = useState<string[]>(["ko"]);

    // ✅ 유저가 타입을 직접 눌렀는지
    const [isSendTypeUserSelected, setIsSendTypeUserSelected] = useState(false);

    // 2) 콘텐츠 상태 (RCS / MMS / SMS)
    const [rcsContents, setRcsContents] = useState<Record<string, LangContent>>(
        createInitialLangState
    );
    const [slideCount, setSlideCount] = useState<number>(3);

    const [mmsContents, setMmsContents] = useState<Record<string, MmsContent>>(
        createInitialMmsState
    );
    const [smsContents, setSmsContents] = useState<SmsContentsState>({});

    // 3) 공통 발송 조건 상태
    const [sendSystem, setSendSystem] = useState<"KOS" | "MIMO">("KOS");
    const [messageName, setMessageName] = useState("");
    const [checkTypes, setCheckTypes] = useState<CheckType[]>(["법률"]);
    const [adType, setAdType] = useState<"비광고" | "광고">("비광고");
    const [expectedVolume, setExpectedVolume] = useState("");
    const [callbackType, setCallbackType] = useState("");
    const [sendPurpose, setSendPurpose] = useState("");
    const [memo, setMemo] = useState("");

    // 4) MMS 대체 발송 관련 상태
    const [myktLink, setMyktLink] = useState<"포함" | "미포함">("포함");
    const [closingRemark, setClosingRemark] = useState<"포함" | "미포함">("미포함");
    const [imagePosition, setImagePosition] = useState<"위" | "아래">("위");

    // 향후 사용 예정 상태
    const [autoApproveOnSave, setAutoApproveOnSave] = useState(false);

    // 5) 예약 / 발송량 / 검증 상태
    const [reservationModalOpen, setReservationModalOpen] = useState(false);
    const [reservationDate, setReservationDate] = useState("");
    const [reservationTime, setReservationTime] = useState("");
    const [volumeVerifyStatus, setVolumeVerifyStatus] =
        useState<VolumeVerifyStatus>(null);
    const [saveToast, setSaveToast] = useState<null | "save" | "approve">(null);

    // 6) 문구 검토 상태
    const [isSmsCopyChecked, setIsSmsCopyChecked] = useState(false);
    const [isCopyChecked, setIsCopyChecked] = useState(false); // RCS
    const [isMmsCopyChecked, setIsMmsCopyChecked] = useState(false);

    // 7) AI 관련 상태
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    // ✅ 8) 첫 진입 온보딩(딤 + 안내)
    const [showAiOnboarding, setShowAiOnboarding] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem("ai_onboarding_dismissed");
        if (!dismissed) setShowAiOnboarding(true);
    }, []);

    const closeAiOnboarding = () => {
        if (dontShowAgain) localStorage.setItem("ai_onboarding_dismissed", "1");
        setShowAiOnboarding(false);
    };

    const startAiFromOnboarding = () => {
        if (dontShowAgain) localStorage.setItem("ai_onboarding_dismissed", "1");
        setShowAiOnboarding(false);
        setAiModalOpen(true);
    };

    // ─────────────────────────── 공통 유틸 / 핸들러 ───────────────────────────

    const reservationLabel = formatReservationLabel(reservationDate, reservationTime);

    const openReservationModal = () => setReservationModalOpen(true);

    const isLangEnabled = (code: string) => enabledLangs.includes(code);

    const toggleLangEnabled = (code: string) => {
        if (code === "ko") return; // 한국어는 항상 활성화

        setEnabledLangs((prev) => {
            if (prev.includes(code)) {
                const next = prev.filter((c) => c !== code);
                if (code === activeLang) setActiveLang(next[0] ?? "ko");
                return next;
            }
            return [...prev, code];
        });
    };

    const toggleCheckType = (item: CheckType) => {
        setCheckTypes((prev) =>
            prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]
        );
    };

    const handleVerifyVolume = () => {
        if (!reservationDate || !reservationTime) {
            setVolumeVerifyStatus("needDate");
            return;
        }

        const num = Number((expectedVolume || "").replace(/,/g, ""));
        if (!num || Number.isNaN(num)) {
            setVolumeVerifyStatus("fail");
            return;
        }

        setVolumeVerifyStatus(num > 0 && num <= HOURLY_CAPACITY ? "ok" : "fail");
    };

    const handleSave = () => {
        setSaveToast("save");
        // TODO: 실제 저장 API 연동
    };

    const handleSaveAndApprove = () => {
        if (sendType === "SMS" && !isSmsCopyChecked) {
            alert("승인 요청 전 SMS 문구 검토를 완료해 주세요.");
            return;
        }
        if (!isCopyChecked && (sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL")) {
            alert("승인 요청 전 RCS 문구 검토를 완료해 주세요.");
            return;
        }
        if (
            !isMmsCopyChecked &&
            (sendType === "MMS" || sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL")
        ) {
            alert("승인 요청 전 MMS 문구 검토를 완료해 주세요.");
            return;
        }

        setSaveToast("approve");
        // TODO: 저장 + 승인요청 API 연동
    };

    // ✅ AI로 메시지 생성
    const handleGenerateWithAI = async () => {
        if (!aiPrompt.trim()) return;

        setAiLoading(true);

        try {
            // ✅ 유저가 타입을 직접 골랐을 때만 sendType을 보낸다
            const payload: GeneratePayload = {
                prompt: aiPrompt,
                enabledLangs,
                adType,
            };

            if (isSendTypeUserSelected) {
                payload.sendType = sendType;

                if (sendType === "RCS_CAROUSEL") {
                    payload.slideCount = slideCount;
                }
            }

            const res = await fetch("/api/generate-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("failed to generate");

            const data = (await res.json()) as AiGenerateResponse;
            console.log("지피티 응답!: ", data);

            // 메시지 타입 반영
            if (data.sendType) setSendType(data.sendType);

            // 공통 설정 반영
            const common = data.common;
            if (common?.messageName) setMessageName(common.messageName);
            if (common?.adType) setAdType(common.adType);
            if (common?.sendPurpose) setSendPurpose(common.sendPurpose);
            if (common?.callbackType) setCallbackType(common.callbackType);

            if (common?.enabledLangs?.length) {
                setEnabledLangs(common.enabledLangs);
                if (!common.enabledLangs.includes(activeLang)) setActiveLang(common.enabledLangs[0]);
            }

            if (common?.reservationDate) setReservationDate(common.reservationDate);
            if (common?.reservationTime) setReservationTime(common.reservationTime);

            if (common?.myktLink) setMyktLink(common.myktLink);
            if (common?.closingRemark) setClosingRemark(common.closingRemark);
            if (common?.imagePosition) setImagePosition(common.imagePosition);

            // ✅ SMS 내용 반영
            if (data.sms?.contents) {
                setSmsContents((prev) => {
                    const next = { ...prev };
                    for (const [lang, v] of Object.entries(data.sms!.contents)) {
                        next[lang] = v?.body ?? "";
                    }
                    return next;
                });
            }

            // ✅ RCS 내용 반영
            if (data.rcs?.contents) {
                if (data.rcs.slideCount) setSlideCount(data.rcs.slideCount);
                setRcsContents((prev) => ({ ...prev, ...data.rcs!.contents }));
            }

            // ✅ MMS 내용 반영
            if (data.mms?.contents) {
                setMmsContents((prev) => ({ ...prev, ...data.mms!.contents }));
            }

            // 검토 플래그 초기화
            setIsCopyChecked(false);
            setIsMmsCopyChecked(false);
            setIsSmsCopyChecked(false);

            setAiModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("AI 작성 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
        } finally {
            setAiLoading(false);
        }
    };

    // ─────────────────────────── JSX ───────────────────────────

    return (
        <div className="mx-auto max-w-6xl p-8 space-y-8 bg-slate-50">
            {/* 상단 헤더 */}
            <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">예약발송 · 메시지 템플릿 등록</h1>
                    <p className="text-sm text-slate-600">
                        내용 및 정보를 작성한 뒤 검토와 승인 단계를 거쳐 메시지가 발송됩니다.
                    </p>
                </div>
            </header>

            {/* 메시지 타입 선택 영역 */}
            <section className="bg-white rounded-xl shadow p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">메시지 타입</h2>
                        <p className="mt-1 text-[11px] text-slate-500">
                            SMS / MMS / RCS MMS / RCS Carousel 중 하나를 선택해 주세요.
                        </p>
                    </div>
                    <span className="text-[11px] text-slate-400">
            타입에 따라 아래 편집 영역이 달라집니다.
          </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                    {[
                        { code: "SMS", label: "SMS" },
                        { code: "MMS", label: "MMS" },
                        { code: "RCS_MMS", label: "RCS MMS" },
                        { code: "RCS_CAROUSEL", label: "RCS Carousel" },
                    ].map((t) => (
                        <button
                            key={t.code}
                            type="button"
                            onClick={() => {
                                setSendType(t.code as SendType);
                                setIsSendTypeUserSelected(true);
                            }}
                            className={`h-9 px-4 rounded-full border transition ${
                                sendType === t.code
                                    ? "bg-teal-500 text-white border-teal-500"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* RCS 대체 MMS 안내 */}
            {(sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL") && (
                <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[13px] leading-5 text-amber-800 space-y-1">
                    <p>RCS 미지원 단말에 대해서 RCS 메시지를 대체하는 MMS 메시지입니다.</p>
                    <p>
                        RCS는 <b>*** 단말 이상</b>에만 적용됩니다.
                    </p>
                </section>
            )}

            {/* ───────────── 공통 발송 조건 섹션 (생략 없이 포함) ───────────── */}
            <section className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="text-base font-semibold">공통 발송 조건</h2>

                <div className="grid gap-x-12 gap-y-4 md:grid-cols-2">
                    {/* 메시지명 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            메시지명 <span className="text-red-500">*</span>
                        </label>
                        <input
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="메시지 내용을 알 수 있게 작성합니다."
                            value={messageName}
                            maxLength={60}
                            onChange={(e) => setMessageName(e.target.value)}
                        />
                    </div>

                    {/* 발송시스템 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            발송시스템 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2 text-xs">
                            {[
                                { code: "KOS", label: "KOS 캠페인" },
                                { code: "MIMO", label: "MIMO 직접발송" },
                            ].map((item) => (
                                <button
                                    key={item.code}
                                    type="button"
                                    className={`h-8 px-3 inline-flex items-center justify-center rounded-full border text-xs transition ${
                                        sendSystem === item.code
                                            ? "bg-teal-500 text-white border-teal-500"
                                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                    }`}
                                    onClick={() => setSendSystem(item.code as "KOS" | "MIMO")}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            * KOS 캠페인에서는 사전에 설정한 발송대상 고객으로 매핑됩니다.
                        </p>
                    </div>

                    {/* 광고여부 + 사용할 언어 */}
                    <div className="flex flex-col gap-4">
                        {/* 광고여부 */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                                광고여부 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2 text-xs">
                                {["비광고", "광고"].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setAdType(type as "비광고" | "광고")}
                                        className={`h-8 px-3 inline-flex items-center justify-center rounded-full border text-xs transition ${
                                            adType === type
                                                ? "bg-teal-500 text-white border-teal-500"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 사용할 언어 */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                                사용할 언어 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-3 items-center text-xs">
                                {LANGS.map((lang) => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => toggleLangEnabled(lang.code)}
                                        className={`h-8 px-3 rounded-full border flex items-center gap-1 text-xs ${
                                            isLangEnabled(lang.code)
                                                ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                                : "bg-white border-slate-300 text-slate-600"
                                        } ${lang.code === "ko" ? "cursor-default" : "hover:bg-slate-50"}`}
                                    >
                    <span
                        className={`w-2 h-2 rounded-full ${
                            isLangEnabled(lang.code) ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                    />
                                        <span>{lang.label}</span>
                                        {lang.code === "ko" && (
                                            <span className="text-[10px] text-slate-500">(기본)</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400">
                                * 선택된 언어에 한해 RCS / MMS 메시지가 발송됩니다.
                            </p>
                        </div>
                    </div>

                    {/* 4대 검토사항 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            4대 검토사항 <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3 w-full">
                            {(["법률", "정보보호", "리스크", "공정경쟁"] as CheckType[]).map((item) => {
                                const selected = checkTypes.includes(item);
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        className={`h-8 px-3 w-full inline-flex items-center justify-center rounded-full border text-xs transition ${
                                            selected
                                                ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                        }`}
                                        onClick={() => toggleCheckType(item)}
                                    >
                                        {item}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            * 관련되는 항목을 모두 선택할 수 있습니다.
                        </p>
                    </div>

                    {/* 회신번호 타입 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            회신번호(CallBack) 타입 <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            value={callbackType}
                            onChange={(e) => setCallbackType(e.target.value)}
                        >
                            <option value="">선택</option>
                            <option value="대표번호">대표번호</option>
                            <option value="개인번호">개인번호</option>
                            <option value="080">080 수신거부 번호</option>
                        </select>
                    </div>

                    {/* 발송목적 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            발송목적 <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            value={sendPurpose}
                            onChange={(e) => setSendPurpose(e.target.value)}
                        >
                            <option value="">선택</option>
                            <option value="공지">고객 공지</option>
                            <option value="이벤트">이벤트/프로모션</option>
                            <option value="알림">알림/안내</option>
                            <option value="기타">기타</option>
                        </select>
                    </div>

                    {/* 예약일 설정 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            예약일 설정 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 px-4 border-teal-500 text-teal-600 hover:bg-teal-50"
                                onClick={openReservationModal}
                            >
                                발송량현황 조회
                            </Button>

                            <div className="min-w-[200px] flex items-center gap-1 text-xs">
                                {reservationLabel ? (
                                    <span className="font-semibold text-teal-700">⏱ {reservationLabel}</span>
                                ) : (
                                    <span className="text-slate-500">예약일이 설정되지 않았습니다.</span>
                                )}
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400">
                            * 모달에서 날짜와 시간을 선택하면, 선택된 예약일이 이 영역에 노출됩니다.
                        </p>
                    </div>

                    {/* 예상 발송량 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            예상 발송량 <span className="text-red-500">*</span>
                        </label>
                        <input
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="예: 50,000"
                            value={expectedVolume}
                            onChange={(e) => setExpectedVolume(e.target.value)}
                        />
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" className="h-8 px-3 text-xs" onClick={handleVerifyVolume}>
                                발송량 검증
                            </Button>
                            {volumeVerifyStatus === "ok" && (
                                <span className="text-xs text-emerald-700">✅ 시간당 발송 한도 내입니다.</span>
                            )}
                            {volumeVerifyStatus === "fail" && (
                                <span className="text-xs text-rose-700">⚠️ 한도 초과 또는 값이 올바르지 않습니다.</span>
                            )}
                            {volumeVerifyStatus === "needDate" && (
                                <span className="text-xs text-amber-700">⚠️ 예약일/시간을 먼저 선택해 주세요.</span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            * 승인요청 기준이 되는 발송량입니다.
                        </p>
                    </div>

                    {/* 메모 */}
                    <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">메모</label>
                        <textarea
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="검토자에게 전달할 메모를 입력해 주세요. (선택)"
                            value={memo}
                            maxLength={500}
                            onChange={(e) => setMemo(e.target.value)}
                        />
                    </div>
                </div>
            </section>
            {/* ───────────── 공통 발송 조건 섹션 끝 ───────────── */}

            {/* 메시지 타입별 편집 영역 */}
            {sendType === "SMS" && (
                <SmsEditor
                    activeLang={activeLang}
                    setActiveLang={setActiveLang}
                    enabledLangs={enabledLangs}
                    smsContents={smsContents}
                    setSmsContents={setSmsContents}
                    isSmsCopyChecked={isSmsCopyChecked}
                    setIsSmsCopyChecked={setIsSmsCopyChecked}
                />
            )}

            {sendType === "RCS_MMS" && (
                <RcsSingleEditor
                    activeLang={activeLang}
                    setActiveLang={setActiveLang}
                    enabledLangs={enabledLangs}
                    rcsContents={rcsContents}
                    setRcsContents={setRcsContents}
                    isCopyChecked={isCopyChecked}
                    setIsCopyChecked={setIsCopyChecked}
                />
            )}

            {sendType === "RCS_CAROUSEL" && (
                <RcsEditor
                    activeLang={activeLang}
                    setActiveLang={setActiveLang}
                    enabledLangs={enabledLangs}
                    rcsContents={rcsContents}
                    setRcsContents={setRcsContents}
                    slideCount={slideCount}
                    setSlideCount={setSlideCount}
                    isCopyChecked={isCopyChecked}
                    setIsCopyChecked={setIsCopyChecked}
                />
            )}

            {(sendType === "MMS" || sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL") && (
                <MmsEditor
                    activeLang={activeLang}
                    setActiveLang={setActiveLang}
                    enabledLangs={enabledLangs}
                    mmsContents={mmsContents}
                    setMmsContents={setMmsContents}
                    myktLink={myktLink}
                    setMyktLink={setMyktLink}
                    closingRemark={closingRemark}
                    setClosingRemark={setClosingRemark}
                    imagePosition={imagePosition}
                    setImagePosition={setImagePosition}
                    isMmsCopyChecked={isMmsCopyChecked}
                    setIsMmsCopyChecked={setIsMmsCopyChecked}
                />
            )}


            {/* ✅ 저장/승인요청 안내 토스트 */}
            {/* 하단 버튼 */}
            <div className="flex justify-end gap-3 mt-4">
                <Button
                    type="button"
                    variant="outline"
                    className="px-6 py-2 text-sm"
                    onClick={handleSave}
                >
                    저장
                </Button>

                <Button
                    type="button"
                    className="px-6 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={handleSaveAndApprove}
                >
                    저장&승인요청
                </Button>
            </div>

            {/* ✅ 딤 처리 + 중앙 알림 모달 */}
            {saveToast && (
                <div
                    className="fixed inset-0 z-[999] flex items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setSaveToast(null)} // 바깥 클릭 닫기
                >
                    {/* 딤 배경 */}
                    <div className="absolute inset-0 bg-black/50" />

                    {/* 모달 카드 (클릭 전파 막기) */}
                    <div
                        className="relative w-[92%] max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {saveToast === "save" ? (
                            <>
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">✅</div>
                                    <div>
                                        <div className="text-base font-semibold text-slate-900">
                                            임시 저장 완료
                                        </div>
                                        <div className="mt-2 text-sm leading-6 text-slate-700">
                                            현재 상태는 <b>임시 저장</b>입니다.
                                            <br />
                                            실제 발송을 위해서는 <b>“저장&승인요청”</b>을 꼭 진행해 주세요.
                                        </div>
                                        <div className="mt-3 text-[12px] text-slate-500">
                                            * 문구/조건을 수정하면 검토 상태가 초기화될 수 있어요.
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9 px-4 text-sm"
                                        onClick={() => setSaveToast(null)}
                                    >
                                        확인
                                    </Button>
                                    <Button
                                        type="button"
                                        className="h-9 px-4 text-sm bg-teal-600 hover:bg-teal-700 text-white"
                                        onClick={() => {
                                            setSaveToast(null);
                                            // 필요하면 여기서 바로 승인요청 흐름으로 연결 가능:
                                            // handleSaveAndApprove();
                                        }}
                                    >
                                        승인요청 하러가기
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">🎉</div>
                                    <div>
                                        <div className="text-base font-semibold text-slate-900">
                                            문구 검토 · 승인요청 완료
                                        </div>
                                        <div className="mt-2 text-sm leading-6 text-slate-700">
                                            검토 완료 상태로 <b>승인 요청</b>이 접수되었습니다.
                                            <br />
                                            이후 승인 결과(검토자 회신/상태)를 확인해 주세요.
                                        </div>
                                        <div className="mt-3 text-[12px] text-slate-500">
                                            * 승인요청 이후 내용을 수정하면 검토 상태가 변경될 수 있습니다
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        className="h-9 px-4 text-sm bg-teal-600 hover:bg-teal-700 text-white"
                                        onClick={() => setSaveToast(null)}
                                    >
                                        확인
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}



            {/* 예약 모달 */}
            <ReservationModal
                open={reservationModalOpen}
                onClose={() => setReservationModalOpen(false)}
                reservationDate={reservationDate}
                reservationTime={reservationTime}
                onApply={(date, time) => {
                    setReservationDate(date);
                    setReservationTime(time);
                    setReservationModalOpen(false);
                }}
            />

            {/* AI 프롬프트 입력 모달 */}
            <AiPromptModal
                open={aiModalOpen}
                onClose={() => setAiModalOpen(false)}
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                aiLoading={aiLoading}
                onSubmit={handleGenerateWithAI}
                enabledLangs={enabledLangs}
                setEnabledLangs={setEnabledLangs}
            />

            {/* ✅ 첫 진입 AI 온보딩 오버레이 */}
            {showAiOnboarding && (
                <div className="fixed inset-0 z-[999]">
                    <div className="absolute inset-0 bg-black/50" onClick={closeAiOnboarding} />

                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-6 relative">
                            <h3 className="text-lg font-bold text-slate-900">✨ AI로 초안부터 만들어볼까요?</h3>
                            <p className="mt-2 text-sm text-slate-600 leading-6">
                                길게 쓰지 않아도 돼요.
                                <br />
                                <b>AI 초안 생성</b>으로 타입/문구를 한 번에 받아오고 필요한 부분만 수정하면 됩니다.
                            </p>

                            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700">
                                <div className="font-semibold">사용 방법</div>
                                <div className="mt-1">
                                    1) <b>오른쪽 아래 ✨ 버튼</b> 클릭 <br />
                                    2) 프롬프트 입력 <br />
                                    3) 초안 자동 반영
                                </div>
                            </div>

                            <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 select-none">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={dontShowAgain}
                                    onChange={(e) => setDontShowAgain(e.target.checked)}
                                />
                                다시 보지 않기
                            </label>

                            <div className="mt-5 flex gap-2 justify-end">
                                <Button type="button" variant="outline" onClick={closeAiOnboarding}>
                                    닫기
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-teal-600 hover:bg-teal-700 text-white"
                                    onClick={startAiFromOnboarding}
                                >
                                    AI로 만들어보기
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="fixed bottom-24 right-6 z-[1000] pointer-events-none">
                        <div className="px-3 py-2 rounded-xl bg-white/90 border border-slate-200 shadow-sm text-xs text-slate-700">
                            여기서 AI 초안 생성 ✨
                        </div>
                        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white/90 ml-auto mr-4" />
                    </div>
                </div>
            )}

            {/* 플로팅 버튼 */}
            <button
                onClick={() => setAiModalOpen(true)}
                className="
          fixed bottom-6 right-6 z-50
          w-16 h-16 rounded-full
          bg-white border-2 border-teal-500
          shadow-[0_12px_30px_rgba(0,0,0,0.25)]
          flex items-center justify-center
          text-3xl text-yellow-500
          hover:shadow-[0_15px_35px_rgba(0,0,0,0.35)]
          hover:scale-110 transition-all active:scale-95
        "
            >
                ✨
            </button>
        </div>
    );
}
