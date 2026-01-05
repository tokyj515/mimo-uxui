// components/MessageTemplateUI.tsx
"use client";

import React, { useState } from "react";
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

    // ✅ SMS 응답 구조
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
    sendType?: SendType; // ✅ 선택적으로만 보냄
    slideCount?: number; // ✅ 선택적으로만 보냄
};

// ─────────────────────────── 컴포넌트 ───────────────────────────

export default function MessageTemplateUI() {
    // 1) 메시지 타입 / 언어 상태
    const [sendType, setSendType] = useState<SendType>("SMS");
    const [activeLang, setActiveLang] = useState<string>("ko");
    const [enabledLangs, setEnabledLangs] = useState<string[]>(["ko"]);

    // ✅ 추가: 유저가 타입을 직접 눌렀는지
    const [isSendTypeUserSelected, setIsSendTypeUserSelected] = useState(false);

    // 2) 콘텐츠 상태 (RCS / MMS / SMS)
    const [rcsContents, setRcsContents] = useState<Record<string, LangContent>>(createInitialLangState);
    const [slideCount, setSlideCount] = useState<number>(3);

    const [mmsContents, setMmsContents] = useState<Record<string, MmsContent>>(createInitialMmsState);
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
    const [volumeVerifyStatus, setVolumeVerifyStatus] = useState<VolumeVerifyStatus>(null);
    const [saveToast, setSaveToast] = useState<null | "save" | "approve">(null);

    // 6) 문구 검토 상태
    const [isSmsCopyChecked, setIsSmsCopyChecked] = useState(false);
    const [isCopyChecked, setIsCopyChecked] = useState(false); // RCS
    const [isMmsCopyChecked, setIsMmsCopyChecked] = useState(false);

    // 7) AI 관련 상태
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    // ─────────────────────────── 공통 유틸 / 핸들러 ───────────────────────────

    const reservationLabel = formatReservationLabel(reservationDate, reservationTime);

    const openReservationModal = () => setReservationModalOpen(true);

    const isLangEnabled = (code: string) => enabledLangs.includes(code);

    const toggleLangEnabled = (code: string) => {
        if (code === "ko") return;

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
        setCheckTypes((prev) => (prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]));
    };

    const enabledLangObjects = LANGS.filter((l) => enabledLangs.includes(l.code));

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
        // TODO
    };

    const handleSaveAndApprove = () => {
        if (sendType === "SMS" && !isSmsCopyChecked) return alert("승인 요청 전 SMS 문구 검토를 완료해 주세요.");
        if (!isCopyChecked && (sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL"))
            return alert("승인 요청 전 RCS 문구 검토를 완료해 주세요.");
        if (!isMmsCopyChecked && (sendType === "MMS" || sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL"))
            return alert("승인 요청 전 MMS 문구 검토를 완료해 주세요.");

        setSaveToast("approve");
        // TODO
    };

    // ✅ AI로 메시지 생성
    const handleGenerateWithAI = async () => {
        if (!aiPrompt.trim()) return;

        setAiLoading(true);

        try {
            // ✅ 핵심: 유저가 타입을 직접 골랐을 때만 sendType을 보낸다
            const payload: GeneratePayload = {
                prompt: aiPrompt,
                enabledLangs,
                adType,
            };

            if (isSendTypeUserSelected) {
                payload.sendType = sendType;

                // 캐러셀을 유저가 직접 골랐을 때만 slideCount도 보냄
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
                    <p className="text-sm text-slate-600">내용 및 정보를 작성한 뒤 검토와 승인 단계를 거쳐 메시지가 발송됩니다.</p>
                </div>
            </header>

            {/* 메시지 타입 선택 영역 */}
            <section className="bg-white rounded-xl shadow p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-semibold">메시지 타입</h2>
                        <p className="mt-1 text-[11px] text-slate-500">SMS / MMS / RCS MMS / RCS Carousel 중 하나를 선택해 주세요.</p>
                    </div>
                    <span className="text-[11px] text-slate-400">타입에 따라 아래 편집 영역이 달라집니다.</span>
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
                                setIsSendTypeUserSelected(true); // ✅ 추가
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

            {/* ... 이하 JSX는 네 기존 코드 그대로 유지 ... */}
            {/* (공통 발송 조건 / 에디터 / 모달 / 버튼 영역 등) */}

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

            {/* 하단 버튼 */}
            <div className="flex justify-end gap-3 mt-4">
                <Button type="button" variant="outline" className="px-6 py-2 text-sm" onClick={handleSave}>
                    저장
                </Button>
                <Button type="button" className="px-6 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveAndApprove}>
                    저장&승인요청
                </Button>
            </div>

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
            />

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
