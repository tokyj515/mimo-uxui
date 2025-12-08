// components/MessageTemplateUI.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/Button";
import ReservationModal from "@/components/ReservationModal";
import RcsEditor from "@/components/RcsEditor";
import RcsSingleEditor from "@/components/RcsSingleEditor";
import MmsEditor from "@/components/MmsEditor";
import SmsEditor from "@/components/SmsEditor";


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

type SendType = "SMS" | "MMS" | "RCS_MMS" | "RCS_CAROUSEL";

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
    rcs: {
        slideCount: number;
        langs: string[];
        contents: Record<string, LangContent>;
    };
    mms: {
        langs: string[];
        contents: Record<string, MmsContent>;
    };
};

export default function MessageTemplateUI() {
    // 메시지 타입
    const [sendType, setSendType] = useState<SendType>("SMS");

    // 언어 상태 (공통)
    const [activeLang, setActiveLang] = useState<string>("ko");
    const [enabledLangs, setEnabledLangs] = useState<string[]>(["ko"]);

    // RCS 내용 상태 (캐러셀 & 단일 공통 사용)
    const [rcsContents, setRcsContents] = useState<Record<string, LangContent>>(
        createInitialLangState,
    );
    const [slideCount, setSlideCount] = useState<number>(3); // 캐러셀용

    // MMS 내용 상태
    const [mmsContents, setMmsContents] = useState<Record<string, MmsContent>>(
        createInitialMmsState,
    );

    // 공통 발송 조건 상태
    const [sendSystem, setSendSystem] = useState<"KOS" | "MIMO">("KOS");
    const [messageName, setMessageName] = useState("");
    const [checkTypes, setCheckTypes] = useState<CheckType[]>(["법률"]);
    const [adType, setAdType] = useState<"비광고" | "광고">("비광고");
    const [expectedVolume, setExpectedVolume] = useState("");
    const [callbackType, setCallbackType] = useState("");
    const [sendPurpose, setSendPurpose] = useState("");
    const [memo, setMemo] = useState("");

    // MMS 대체 발송 전용 설정 상태
    const [myktLink, setMyktLink] = useState<"포함" | "미포함">("포함");
    const [closingRemark, setClosingRemark] =
        useState<"포함" | "미포함">("미포함");
    const [imagePosition, setImagePosition] = useState<"위" | "아래">("위");
    const [autoApproveOnSave, setAutoApproveOnSave] = useState(false);

    // 예약 모달 상태
    const [reservationModalOpen, setReservationModalOpen] = useState(false);
    const [reservationDate, setReservationDate] = useState("");
    const [reservationTime, setReservationTime] = useState("");

    // 저장 / 저장&승인요청 피드백 모달
    const [saveToast, setSaveToast] = useState<null | "save" | "approve">(null);

    // 발송량 검증 상태
    const [volumeVerifyStatus, setVolumeVerifyStatus] =
        useState<null | "ok" | "fail" | "needDate">(null);

    // ✅ RCS 문구 검증 여부
    const [isCopyChecked, setIsCopyChecked] = useState(false);

    // ✅ MMS 문구 검증 여부
    const [isMmsCopyChecked, setIsMmsCopyChecked] = useState(false);

    // AI 기능
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    // 맨 위 useState들 아래 쪽

    type SmsContentsState = Record<string, string>; // 언어코드 -> 본문

// 컴포넌트 안
    const [smsContents, setSmsContents] = useState<SmsContentsState>({});
    const [isSmsCopyChecked, setIsSmsCopyChecked] = useState(false);

    // ───────── 공통 유틸 ─────────

    const reservationLabel = formatReservationLabel(
        reservationDate,
        reservationTime,
    );

    const openReservationModal = () => {
        setReservationModalOpen(true);
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

        if (num > 0 && num <= HOURLY_CAPACITY) {
            setVolumeVerifyStatus("ok");
        } else {
            setVolumeVerifyStatus("fail");
        }
    };

    const isLangEnabled = (code: string) => enabledLangs.includes(code);

    const toggleLangEnabled = (code: string) => {
        if (code === "ko") return; // 한국어는 항상 활성화
        setEnabledLangs((prev) => {
            if (prev.includes(code)) {
                const next = prev.filter((c) => c !== code);
                if (code === activeLang) {
                    const fallback = next[0] ?? "ko";
                    setActiveLang(fallback);
                }
                return next;
            }
            return [...prev, code];
        });
    };

    const toggleCheckType = (item: CheckType) => {
        setCheckTypes((prev) =>
            prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item],
        );
    };

    const enabledLangObjects = LANGS.filter((l) =>
        enabledLangs.includes(l.code),
    );

    // 저장 버튼
    const handleSave = () => {
        setSaveToast("save");
        // TODO: 실제 저장 API 연동
    };

    // 저장 & 승인요청 버튼
    const handleSaveAndApprove = () => {
        if (sendType === "SMS" && !isSmsCopyChecked) {
            alert("승인 요청 전 SMS 문구 검토를 완료해 주세요.");
            return;
        }
        if (
            !isCopyChecked &&
            (sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL")
        ) {
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

    const handleGenerateWithAI = async () => {
        if (!aiPrompt.trim()) return;

        setAiLoading(true);

        try {
            const res = await fetch("/api/generate-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    enabledLangs,
                    slideCount,
                    adType,
                }),
            });

            if (!res.ok) {
                throw new Error("failed to generate");
            }

            const data = (await res.json()) as AiGenerateResponse;

            console.log("지피티 응답!: ", data);

            // 메시지 타입 반영
            if (data.sendType) {
                setSendType(data.sendType);
            }

            // 공통 설정 반영
            const common = data.common;

            if (common.messageName) setMessageName(common.messageName);
            if (common.adType) setAdType(common.adType);
            if (common.sendPurpose) setSendPurpose(common.sendPurpose);
            if (common.callbackType) setCallbackType(common.callbackType);
            if (common.enabledLangs && common.enabledLangs.length > 0) {
                setEnabledLangs(common.enabledLangs);
                if (!common.enabledLangs.includes(activeLang)) {
                    setActiveLang(common.enabledLangs[0]);
                }
            }
            if (common.reservationDate) setReservationDate(common.reservationDate);
            if (common.reservationTime) setReservationTime(common.reservationTime);

            // 대체 MMS 설정 반영
            if (common.myktLink) setMyktLink(common.myktLink);
            if (common.closingRemark) setClosingRemark(common.closingRemark);
            if (common.imagePosition) setImagePosition(common.imagePosition);

            // RCS / MMS 내용 반영
            if (data.rcs && data.rcs.contents) {
                if (data.rcs.slideCount) setSlideCount(data.rcs.slideCount);
                setRcsContents((prev) => ({
                    ...prev,
                    ...data.rcs.contents,
                }));
            }

            if (data.mms && data.mms.contents) {
                setMmsContents((prev) => ({
                    ...prev,
                    ...data.mms.contents,
                }));
            }

            // AI가 새로 채웠으니 검토 플래그 초기화
            setIsCopyChecked(false);
            setIsMmsCopyChecked(false);

            setAiModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("AI 작성 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
        } finally {
            setAiLoading(false);
        }
    };

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

                {/*<Button*/}
                {/*    type="button"*/}
                {/*    variant="outline"*/}
                {/*    className="mt-3 md:mt-0 text-xs"*/}
                {/*    onClick={() => setAiModalOpen(true)}*/}
                {/*>*/}
                {/*    ✨ AI로 메시지 작성하기*/}
                {/*</Button>*/}
            </header>

            {/* 메시지 타입 선택 영역 (SMS / MMS / RCS MMS / RCS Carousel) */}
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
                            onClick={() => setSendType(t.code as SendType)}
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

            {/* RCS 대체 MMS 안내 - RCS 관련 타입에서만 노출 */}
            {(sendType === "RCS_MMS" || sendType === "RCS_CAROUSEL") && (
                <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[13px] leading-5 text-amber-800 space-y-1">
                    <p>
                        RCS 미지원 단말에 대해서 RCS 메시지를 대체하는 MMS 메시지입니다.
                    </p>
                    <p>
                        RCS는 <b>*** 단말 이상</b>에만 적용됩니다.
                    </p>
                </section>
            )}

            {/* ───── 공통 발송 조건 섹션 ───── */}
            <section className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="text-base font-semibold">공통 발송 조건</h2>
                <div className="grid gap-x-12 gap-y-4 md:grid-cols-2">
                    {/* 1행: 메시지명 / 발송시스템 */}
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

                    {/* 2행: 광고여부 + 사용할 언어 / 4대 검토사항 */}
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
                                        } ${
                                            lang.code === "ko"
                                                ? "cursor-default"
                                                : "hover:bg-slate-50"
                                        }`}
                                    >
                    <span
                        className={`w-2 h-2 rounded-full ${
                            isLangEnabled(lang.code)
                                ? "bg-emerald-500"
                                : "bg-slate-300"
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

                    {/* 2행 오른쪽: 4대 검토사항 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            4대 검토사항 <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3 w-full">
                            {(
                                ["법률", "정보보호", "리스크", "공정경쟁"] as CheckType[]
                            ).map((item) => {
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

                    {/* 4행: 회신번호 타입 / 발송목적 */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            회신번호(CallBack) 타입{" "}
                            <span className="text-red-500">*</span>
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

                    {/* 3행: 예약일 설정 / 예상 발송량 */}
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
                                    <span className="font-semibold text-teal-700">
                    ⏱ {reservationLabel}
                  </span>
                                ) : (
                                    <span className="text-slate-500">
                    예약일이 설정되지 않았습니다.
                  </span>
                                )}
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            * 모달에서 날짜와 시간을 선택하면, 선택된 예약일이 이 영역에 노출됩니다.
                        </p>
                    </div>

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
                        <p className="text-[11px] text-slate-400">
                            * 승인요청 기준이 되는 발송량입니다.
                        </p>
                    </div>

                    {/* 5행: 메모 (2열 전체) */}
                    <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-xs font-semibold text-slate-700">
                            메모
                        </label>
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

            {/* ───── 메시지 타입별 편집 영역 ───── */}

            {/* SMS */}
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


            {/* RCS_MMS: 단일 RCS + 대체 MMS */}
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

            {/* RCS Carousel */}
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

            {/* MMS / 대체 MMS */}
            {(sendType === "MMS" ||
                sendType === "RCS_MMS" ||
                sendType === "RCS_CAROUSEL") && (
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

            {/* ───── 하단 저장 / 저장&승인요청 버튼 ───── */}
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
            {aiModalOpen && (
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
                                        대상·목적·전달하고 싶은 내용을 간단히 적어주면
                                        SMS / MMS / RCS MMS / RCS Carousel 및 대체 MMS까지
                                        한 번에 초안을 만들어 드려요.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="text-sm text-slate-400 hover:text-slate-600"
                                onClick={() => setAiModalOpen(false)}
                            >
                                ✕
                            </button>
                        </div>

                        {/* 예시 프롬프트 */}
                        <div className="flex flex-wrap gap-2 text-[11px]">
                            {[
                                "연말 KT VIP 고객 대상으로 데이터 쿠폰 증정 이벤트를 알리는 RCS Carousel 메시지를 만들고 싶어. 카드 3장 정도로 혜택 소개와 유의사항을 나눠줘.",
                                "미납 요금 납부 기한 안내 문자를 보낼 건데, 비광고성 안내 톤으로 SMS나 간단한 MMS가 좋을 것 같아.",
                                "신규 요금제 출시 프로모션을 하루 동안 진행하는데, RCS + 대체 MMS 조합으로 버튼까지 포함된 광고성 메시지를 만들고 싶어.",
                            ].map((example, idx) => (
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

                        {/* 프롬프트 입력 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700">
                                    프롬프트
                                </label>
                                <span className="text-[11px] text-slate-400">
                  {aiPrompt.length}자
                </span>
                            </div>
                            <textarea
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[160px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예) 연말에 VIP 고객 10만 명에게 보내는 감사 인사와 데이터 쿠폰 증정 안내 메시지를 만들고 싶어. RCS Carousel로 3장 구성하고, RCS 미지원 단말에는 MMS로 대체 발송하고 싶어..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                            />
                        </div>

                        {/* 하단 설명 + 버튼 */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[11px] text-slate-400 leading-relaxed sm:max-w-xs">
                                AI가 결정한 메시지 타입과 대체 발송 MMS 설정까지 이 화면에 바로
                                반영됩니다. 실제 발송 전에 꼭 한 번 더 검토해 주세요.
                            </p>
                            <div className="flex justify-end gap-2 text-xs">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="px-4"
                                    onClick={() => setAiModalOpen(false)}
                                >
                                    취소
                                </Button>
                                <Button
                                    type="button"
                                    className="px-4"
                                    onClick={handleGenerateWithAI}
                                    disabled={!aiPrompt.trim() || aiLoading}
                                >
                                    {aiLoading ? "작성 중..." : "이 프롬프트로 작성하기"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 플로팅 버튼 */}
            <button
                onClick={() => setAiModalOpen(true)}
                className="
          fixed
          bottom-6 right-6
          z-50
          w-16 h-16
          rounded-full
          bg-white
          border-2 border-teal-500
          shadow-[0_12px_30px_rgba(0,0,0,0.25)]
          flex items-center justify-center
          text-3xl
          text-yellow-500
          hover:shadow-[0_15px_35px_rgba(0,0,0,0.35)]
          hover:scale-110
          transition-all
          active:scale-95
        "
            >
                ✨
            </button>
        </div>
    );
}
