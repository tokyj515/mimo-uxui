// components/MessageTemplateUI.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/Button";
import ReservationModal from "@/components/ReservationModal";
import {
    LANGS,
    HOURLY_CAPACITY,
    Slide,
    LangContent,
    CheckType,
    MmsContent,
    createInitialLangState,
    createInitialMmsState,
    formatReservationLabel,
} from "@/lib/messageTemplate";

export default function MessageTemplateUI() {
    // 언어 상태 (공통)
    const [activeLang, setActiveLang] = useState<string>("ko");
    const [enabledLangs, setEnabledLangs] = useState<string[]>(["ko"]);

    // RCS Carousel 내용 상태
    const [rcsContents, setRcsContents] = useState(createInitialLangState);
    const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
    const [slideCount, setSlideCount] = useState<number>(3); // 2~5장

    // MMS 내용 상태
    const [mmsContents, setMmsContents] = useState(createInitialMmsState);

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

    // 🔽 발송량 검증 상태
    const [volumeVerifyStatus, setVolumeVerifyStatus] =
        useState<null | "ok" | "fail" | "needDate">(null);

    // ✅ RCS 문구 검증 여부
    const [isCopyChecked, setIsCopyChecked] = useState(false);

    // ✅ MMS 문구 검증 여부
    const [isMmsCopyChecked, setIsMmsCopyChecked] = useState(false);

    // ───────── 공통 유틸 ─────────

    const reservationLabel = formatReservationLabel(
        reservationDate,
        reservationTime,
    );

    const openReservationModal = () => {
        setReservationModalOpen(true);
    };

    // 🔽 발송량 검증
    const handleVerifyVolume = () => {
        // 예약일/시간 안 골랐으면 먼저 선택하라는 상태
        if (!reservationDate || !reservationTime) {
            setVolumeVerifyStatus("needDate");
            return;
        }

        // 숫자로 변환 (쉼표 제거)
        const num = Number((expectedVolume || "").replace(/,/g, ""));

        if (!num || Number.isNaN(num)) {
            setVolumeVerifyStatus("fail");
            return;
        }

        // 시간당 발송 가능량 비교
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
            prev.includes(item)
                ? prev.filter((t) => t !== item)
                : [...prev, item],
        );
    };

    const enabledLangObjects = LANGS.filter((l) =>
        enabledLangs.includes(l.code),
    );

    const getLangLabel = (code: string) =>
        LANGS.find((l) => l.code === code)?.label ?? code;

    // ───────── RCS 관련 로직 ─────────

    const adjustSlidesForAllLangs = (newCount: number) => {
        setRcsContents((prev) => {
            const updated: Record<string, LangContent> = {};
            Object.entries(prev).forEach(([code, content]) => {
                let slides = [...content.slides];
                if (slides.length > newCount) {
                    slides = slides.slice(0, newCount);
                } else if (slides.length < newCount) {
                    slides = [
                        ...slides,
                        ...Array.from({ length: newCount - slides.length }, () => ({
                            title: "",
                            body: "",
                            imageName: "",
                            buttonCount: 0,
                            button1Label: "",
                            button2Label: "",
                            button1Url: "",
                            button2Url: "",
                        })),
                    ];
                }
                updated[code] = { slides };
            });
            return updated;
        });
    };

    const handleSlideCountChange = (newCount: number) => {
        setSlideCount(newCount);
        adjustSlidesForAllLangs(newCount);
        setCurrentSlideIndex((idx) => (idx >= newCount ? newCount - 1 : idx));
    };

    const updateRcsCurrentSlide = (patch: Partial<Slide>) => {
        setRcsContents((prev) => {
            const langContent = prev[activeLang];
            const slides = [...langContent.slides];
            const target = { ...slides[currentSlideIndex], ...patch };
            slides[currentSlideIndex] = target;
            return {
                ...prev,
                [activeLang]: {
                    ...langContent,
                    slides,
                },
            };
        });
    };

    const handleRcsTextChange = (field: "title" | "body", value: string) => {
        setIsCopyChecked(false); // ✅ 내용 바뀌면 다시 검증 필요
        updateRcsCurrentSlide({ [field]: value } as Partial<Slide>);
    };

    const handleRcsButtonCountChange = (count: 0 | 1 | 2) => {
        updateRcsCurrentSlide({ buttonCount: count });
    };

    const handleRcsButtonLabelChange = (
        field: "button1Label" | "button2Label",
        value: string,
    ) => {
        updateRcsCurrentSlide({ [field]: value } as Partial<Slide>);
    };

    const handleRcsButtonUrlChange = (
        field: "button1Url" | "button2Url",
        value: string,
    ) => {
        updateRcsCurrentSlide({ [field]: value } as Partial<Slide>);
    };

    const currentRcs = rcsContents[activeLang].slides[currentSlideIndex];
    const maxSlideIndex = slideCount - 1;

    const goPrevSlide = () => {
        setCurrentSlideIndex((idx) => (idx > 0 ? idx - 1 : idx));
    };

    const goNextSlide = () => {
        setCurrentSlideIndex((idx) => (idx < maxSlideIndex ? idx + 1 : idx));
    };

    // 저장 버튼
    const handleSave = () => {
        setSaveToast("save");
    };

    // 저장 & 승인요청 버튼
    const handleSaveAndApprove = () => {
        // 문구 검토 안 했으면 막기
        if (!isCopyChecked) {
            alert("승인 요청 전 문구 검토를 완료해 주세요.");
            return;
        }

        setSaveToast("approve");
    };

    // ───────── MMS 관련 로직 ─────────

    const currentMms = mmsContents[activeLang];

    const updateMmsContent = (patch: Partial<MmsContent>) => {
        setMmsContents((prev) => ({
            ...prev,
            [activeLang]: {
                ...prev[activeLang],
                ...patch,
            },
        }));
        // MMS 내용이 바뀌면 검토 다시 필요
        setIsMmsCopyChecked(false);
    };

    // ──────────────────────────────────────────────────────────── JSX 시작

    return (
        <div className="mx-auto max-w-6xl p-8 space-y-8 bg-slate-50">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">예약발송 · 메시지 템플릿 등록</h1>
                <p className="text-sm text-slate-600">
                    내용 및 정보를 작성한 뒤 검토와 승인 단계를 거쳐 메시지가 발송됩니다.
                </p>
            </header>

            {/* 📌 RCS 미지원 시 대체 MMS 발송 설정 안내 */}
            <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[13px] leading-5 text-amber-800 space-y-1">
                <p>RCS 미지원 단말에 대해서 RCS 메시지를 대체하는 MMS 메시지입니다.</p>
                <p>
                    RCS는 <b>*** 단말 이상</b>에만 적용됩니다.
                </p>
            </section>

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
                                        onClick={() =>
                                            setAdType(type as "비광고" | "광고")
                                        }
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
                                            <span className="text-[10px] text-slate-500">
                        (기본)
                      </span>
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
                            {(["법률", "정보보호", "리스크", "공정경쟁"] as CheckType[]).map(
                                (item) => {
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
                                },
                            )}
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
                            * 모달에서 날짜와 시간을 선택하면, 선택된 예약일이 이 영역에
                            노출됩니다.
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

            {/* ───── RCS 메시지 입력 ───── */}
            <section className="bg-white rounded-xl shadow p-6 space-y-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    RCS Carousel 화면 구성
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 단말 미리보기 + 슬라이드 화살표 */}
                    <div className="flex justify-center relative">
                        <Button
                            type="button"
                            variant="outline"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full p-0 text-xs"
                            onClick={goPrevSlide}
                            disabled={currentSlideIndex === 0}
                        >
                            &lt;
                        </Button>

                        <div className="w-[260px] h-[520px] bg-slate-100 rounded-[32px] shadow-inner p-3 border border-slate-200 flex flex-col">
                            <div className="h-6 flex items-center justify-center text-[10px] text-slate-500">
                                9:41 · RCS Carousel
                            </div>
                            <div className="mt-2 bg-white rounded-2xl shadow-sm p-3 space-y-2 flex-1">
                                <div className="h-28 rounded-xl bg-slate-200 flex flex-col items-center justify-center text-xs text-slate-500 px-3 text-center">
                                    {currentRcs.imageName ? (
                                        <span className="text-[10px] text-slate-700 truncate max-w-full">
                      {currentRcs.imageName}
                    </span>
                                    ) : (
                                        <>
                                            <span>이미지 / 카드 {currentSlideIndex + 1}</span>
                                            <span className="mt-1 text-[10px] text-slate-500">
                        이미지를 업로드해 주세요.
                      </span>
                                        </>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs font-semibold text-slate-900 truncate">
                                        {currentRcs.title || "메시지 제목 미입력"}
                                    </div>
                                    <p className="text-[11px] leading-snug text-slate-700 max-h-24 overflow-hidden">
                                        {currentRcs.body ||
                                            "작성 중인 메시지 내용이 이 영역에 표시됩니다."}
                                    </p>
                                </div>

                                {/* 버튼 프리뷰 */}
                                {currentRcs.buttonCount > 0 && (
                                    <div className="pt-2 space-y-1.5">
                                        <div className="w-full h-8 rounded-full bg-slate-100 text-[10px] flex items-center justify-center text-slate-600">
                                            {currentRcs.button1Label || "버튼 1"}
                                        </div>
                                        {currentRcs.buttonCount === 2 && (
                                            <div className="w-full h-8 rounded-full bg-slate-100 text-[10px] flex items-center justify-center text-slate-600">
                                                {currentRcs.button2Label || "버튼 2"}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-500">
                <span>
                  슬라이드 {currentSlideIndex + 1} / {slideCount}
                </span>
                            </div>
                            <div className="mt-1 flex justify-center gap-1">
                                {Array.from({ length: slideCount }).map((_, idx) => (
                                    <span
                                        key={idx}
                                        className={`w-1.5 h-1.5 rounded-full ${
                                            idx === currentSlideIndex
                                                ? "bg-slate-700"
                                                : "bg-slate-300"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full p-0 text-xs"
                            onClick={goNextSlide}
                            disabled={currentSlideIndex === maxSlideIndex}
                        >
                            &gt;
                        </Button>
                    </div>

                    {/* 입력 폼 */}
                    <div className="space-y-5">
                        {/* 편집 언어 & 슬라이드 개수 */}
                        <div className="space-y-3">
                            {/* 편집 언어 탭 */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">편집 언어</span>
                                    <span className="text-[11px] text-slate-400">
                    공통 발송 조건에서 선택한 언어만 탭으로 노출됩니다.
                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {enabledLangObjects.map((lang) => (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => setActiveLang(lang.code)}
                                            className={`px-3 py-1.5 rounded-full border text-xs transition ${
                                                activeLang === lang.code
                                                    ? "bg-teal-500 text-white border-teal-500"
                                                    : "bg-white text-slate-800 border-slate-800"
                                            }`}
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 슬라이드 개수 선택 */}
                            <div className="pt-2 border-t border-dashed border-slate-200 space-y-2">
                <span className="text-xs font-semibold text-slate-700">
                  슬라이드 개수
                </span>
                                <div className="flex flex-wrap gap-2">
                                    {([2, 3, 4, 5] as const).map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => handleSlideCountChange(n)}
                                            className={`h-8 px-3 text-xs rounded-full border ${
                                                slideCount === n
                                                    ? "bg-teal-500 text-white border-teal-500"
                                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                            }`}
                                        >
                                            {n}장
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 텍스트 + 버튼 설정 */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    {getLangLabel(activeLang)} 제목 (슬라이드{" "}
                                    {currentSlideIndex + 1})
                                </label>
                                <input
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="예: 연말 이벤트 안내"
                                    value={currentRcs.title}
                                    maxLength={60}
                                    onChange={(e) =>
                                        handleRcsTextChange("title", e.target.value)
                                    }
                                />
                            </div>

                            {/* 이미지 첨부 */}
                            <div>
                                <label className="text-xs font-semibold text-slate-700">
                                    이미지 첨부 (슬라이드 {currentSlideIndex + 1})
                                </label>
                                <div className="mt-1 flex items-center gap-2">
                                    <label className="inline-flex items-center px-3 py-1.5 rounded-md border border-dashed border-slate-300 text-[11px] text-slate-700 bg-slate-50 cursor-pointer hover:bg-slate-100">
                                        <span className="mr-1">📎</span>
                                        <span>이미지 파일 선택</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                updateRcsCurrentSlide({
                                                    imageName: file ? file.name : "",
                                                });
                                            }}
                                        />
                                    </label>
                                    <span className="text-[11px] text-slate-500 truncate max-w-[160px]">
                    {currentRcs.imageName || "선택된 파일 없음"}
                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    * 실제 업로드 동작은 별도 구현이 필요하며, 이 화면에서는 파일명만
                                    미리보기로 표시합니다.
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700">
                                        {getLangLabel(activeLang)} 본문 (슬라이드{" "}
                                        {currentSlideIndex + 1})
                                    </label>
                                    <span className="text-[11px] text-slate-500">
                    {currentRcs.body.length} / 600자
                  </span>
                                </div>
                                <textarea
                                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[140px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    placeholder="고객에게 발송될 RCS Carousel 메시지 내용을 입력해 주세요."
                                    value={currentRcs.body}
                                    maxLength={600}
                                    onChange={(e) =>
                                        handleRcsTextChange("body", e.target.value)
                                    }
                                />
                            </div>

                            {/* RCS 문구 검토 상태 */}
                            <div
                                className={`mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-[11px] ${
                                    isCopyChecked
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                        : "border-amber-300 bg-amber-50 text-amber-800"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {isCopyChecked ? "✅" : "⚠️"}
                  </span>
                                    <span className="font-medium">
                    {isCopyChecked ? "문구 검토 완료" : "문구 검토가 필요합니다."}
                  </span>
                                    {isCopyChecked && (
                                        <span className="text-[10px] opacity-80">
                      (내용 수정 시 다시 검토 필요)
                    </span>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant={isCopyChecked ? "outline" : "solid"}
                                    className="h-8 px-3 text-[11px]"
                                    onClick={() => setIsCopyChecked(true)}
                                >
                                    {isCopyChecked ? "다시 검토하기" : "문구 검토"}
                                </Button>
                            </div>

                            {/* 버튼 설정 */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700">
                                    버튼 설정
                                </label>
                                <div className="flex gap-2 text-xs">
                                    {[
                                        { label: "미사용", value: 0 },
                                        { label: "1개", value: 1 },
                                        { label: "2개", value: 2 },
                                    ].map((btn) => (
                                        <button
                                            key={btn.value}
                                            type="button"
                                            onClick={() =>
                                                handleRcsButtonCountChange(btn.value as 0 | 1 | 2)
                                            }
                                            className={`h-8 px-3 rounded-full border text-xs transition ${
                                                currentRcs.buttonCount === btn.value
                                                    ? "bg-teal-500 text-white border-teal-500"
                                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                            }`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>

                                {currentRcs.buttonCount > 0 && (
                                    <div className="mt-2 space-y-2">
                                        <div className="grid gap-2 md:grid-cols-2">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-semibold text-slate-700">
                                                    버튼 1 이름
                                                </label>
                                                <input
                                                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                                    placeholder="예: 자세히 보기"
                                                    value={currentRcs.button1Label}
                                                    maxLength={20}
                                                    onChange={(e) =>
                                                        handleRcsButtonLabelChange(
                                                            "button1Label",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-semibold text-slate-700">
                                                    버튼 1 URL (URL Action)
                                                </label>
                                                <input
                                                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                                    placeholder="https://"
                                                    value={currentRcs.button1Url}
                                                    onChange={(e) =>
                                                        handleRcsButtonUrlChange(
                                                            "button1Url",
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {currentRcs.buttonCount === 2 && (
                                            <div className="grid gap-2 md:grid-cols-2">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold text-slate-700">
                                                        버튼 2 이름
                                                    </label>
                                                    <input
                                                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                                        placeholder="예: 신청하기"
                                                        value={currentRcs.button2Label}
                                                        maxLength={20}
                                                        onChange={(e) =>
                                                            handleRcsButtonLabelChange(
                                                                "button2Label",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-semibold text-slate-700">
                                                        버튼 2 URL (URL Action)
                                                    </label>
                                                    <input
                                                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                                        placeholder="https://"
                                                        value={currentRcs.button2Url}
                                                        onChange={(e) =>
                                                            handleRcsButtonUrlChange(
                                                                "button2Url",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ───── MMS 설정 ───── */}
            <section className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="text-base font-semibold">MMS 화면 구성</h2>
                <p className="text-[11px] text-slate-500">
                    RCS가 미지원인 단말에 대해 발송할 대체 MMS의 기본 속성을 설정합니다.
                </p>
                <div className="grid gap-6 md:grid-cols-2">
                    {/* 좌측: 마이KT앱 링크 여부, 이미지 위치 */}
                    <div className="space-y-4">
                        {/* 마이KT앱 링크 여부 */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                                마이KT앱 링크 여부 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4 items-center text-xs">
                                {["포함", "미포함"].map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setMyktLink(opt as "포함" | "미포함")}
                                        className={`h-8 px-3 rounded-full border text-xs transition ${
                                            myktLink === opt
                                                ? "bg-teal-500 text-white border-teal-500"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 이미지 위치 */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                                이미지 위치 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4 items-center text-xs">
                                {["위", "아래"].map((pos) => (
                                    <button
                                        key={pos}
                                        type="button"
                                        onClick={() => setImagePosition(pos as "위" | "아래")}
                                        className={`h-8 px-3 rounded-full border text-xs transition ${
                                            imagePosition === pos
                                                ? "bg-teal-500 text-white border-teal-500"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {pos}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 우측: 맺음말 여부 */}
                    <div className="space-y-4">
                        {/* 맺음말 여부 */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-700">
                                맺음말 여부 <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-4 items-center text-xs">
                                {["포함", "미포함"].map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() =>
                                            setClosingRemark(opt as "포함" | "미포함")
                                        }
                                        className={`h-8 px-3 rounded-full border text-xs transition ${
                                            closingRemark === opt
                                                ? "bg-teal-500 text-white border-teal-500"
                                                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-slate-400">
                                MMS는 맺음말이 기본 포함되며, 광고 및 업무(사내용)는 예외로
                                설정할 수 있습니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ───── MMS 메시지 입력 ───── */}
            <section className="bg-white rounded-xl shadow p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">MMS 내용 구성</h2>
                    <span className="text-xs text-slate-500">
            * 단말 미리보기를 통해 작성 중인 내용을 실시간으로 확인할 수 있습니다.
          </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* 단말 미리보기 */}
                    <div className="flex justify-center">
                        <div className="w-[260px] h-[520px] bg-slate-100 rounded-[32px] shadow-inner p-3 border border-slate-200 flex flex-col">
                            <div className="h-6 flex items-center justify-center text-[10px] text-slate-500">
                                9:41 · MMS
                            </div>
                            <div className="mt-2 bg-white rounded-2xl shadow-sm p-3 space-y-2 flex-1">
                                {/* 이미지 영역 */}
                                <div className="h-32 rounded-xl bg-slate-200 flex flex-col items-center justify-center text-xs text-slate-500 px-3 text-center">
                                    {currentMms.imageName ? (
                                        <span className="text-[10px] text-slate-700 truncate max-w-full">
                      {currentMms.imageName}
                    </span>
                                    ) : (
                                        <>
                                            <span>이미지 영역</span>
                                            <span className="mt-1 text-[10px] text-slate-500">
                        이미지를 업로드해 주세요.
                      </span>
                                        </>
                                    )}
                                </div>

                                {/* 제목 + 본문 */}
                                <div className="flex flex-col gap-2">
                                    <div className="text-xs font-semibold text-slate-900 truncate">
                                        {currentMms.title || "메시지 제목 미입력"}
                                    </div>
                                    <p className="text-[11px] leading-snug text-slate-700 max-h-32 overflow-hidden">
                                        {currentMms.body ||
                                            "작성 중인 MMS 메시지 내용이 이 영역에 표시됩니다."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 입력 폼 */}
                    <div className="space-y-5">
                        {/* 편집 언어 탭 */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">편집 언어</span>
                                <span className="text-[11px] text-slate-400">
                  공통 발송 조건에서 선택한 언어만 탭으로 노출됩니다.
                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {enabledLangObjects.map((lang) => (
                                    <button
                                        key={lang.code}
                                        type="button"
                                        onClick={() => setActiveLang(lang.code)}
                                        className={`h-8 px-3 inline-flex items-center justify-center rounded-full border text-xs transition ${
                                            activeLang === lang.code
                                                ? "bg-teal-500 text-white border-teal-500"
                                                : "bg-white text-slate-800 border-slate-800"
                                        }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 제목 */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700">
                                {getLangLabel(activeLang)} 제목
                            </label>
                            <input
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="예: 연말 이벤트 안내"
                                value={currentMms.title}
                                maxLength={60}
                                onChange={(e) =>
                                    updateMmsContent({ title: e.target.value })
                                }
                            />
                        </div>

                        {/* 이미지 첨부 */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700">
                                이미지 첨부
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                                <label className="inline-flex items-center px-3 py-1.5 rounded-md border border-dashed border-slate-300 text-[11px] text-slate-700 bg-slate-50 cursor-pointer hover:bg-slate-100">
                                    <span className="mr-1">📎</span>
                                    <span>이미지 파일 선택</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            updateMmsContent({
                                                imageName: file ? file.name : "",
                                            });
                                        }}
                                    />
                                </label>
                                <span className="text-[11px] text-slate-500 truncate max-w-[160px]">
                  {currentMms.imageName || "선택된 파일 없음"}
                </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">
                                * 실제 업로드 동작은 별도 구현이 필요하며, 이 화면에서는 파일명만
                                미리보기로 표시합니다.
                            </p>
                        </div>

                        {/* 본문 */}
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-700">
                                    {getLangLabel(activeLang)} 본문
                                </label>
                                <span className="text-[11px] text-slate-500">
                  {currentMms.body.length} / 2000자
                </span>
                            </div>
                            <textarea
                                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[160px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                placeholder="고객에게 발송될 MMS 메시지 내용을 입력해 주세요."
                                value={currentMms.body}
                                maxLength={2000}
                                onChange={(e) =>
                                    updateMmsContent({ body: e.target.value })
                                }
                            />
                        </div>

                        {/* ✅ MMS 문구 검토 상태 + 버튼 */}
                        <div
                            className={`mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-[11px] ${
                                isMmsCopyChecked
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                    : "border-amber-300 bg-amber-50 text-amber-800"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                <span className="text-base">
                  {isMmsCopyChecked ? "✅" : "⚠️"}
                </span>
                                <span className="font-medium">
                  {isMmsCopyChecked
                      ? "MMS 문구 검토 완료"
                      : "MMS 문구 검토가 필요합니다."}
                </span>
                                {isMmsCopyChecked && (
                                    <span className="text-[10px] opacity-80">
                    (내용 수정 시 다시 검토 필요)
                  </span>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant={isMmsCopyChecked ? "outline" : "solid"}
                                className="h-8 px-3 text-[11px]"
                                onClick={() => setIsMmsCopyChecked(true)} // 여기서 실제 검증 API 호출해도 됨
                            >
                                {isMmsCopyChecked ? "다시 검토하기" : "문구 검토"}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

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

            {/* ───── 예약 모달 ───── */}
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
        </div>
    );
}
