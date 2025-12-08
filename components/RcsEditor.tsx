// components/RcsEditor.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/Button";
import { LANGS, Slide, LangContent } from "@/lib/messageTemplate";

type RcsEditorProps = {
    activeLang: string;
    setActiveLang: (code: string) => void;
    enabledLangs: string[];
    rcsContents: Record<string, LangContent>;
    setRcsContents: React.Dispatch<
        React.SetStateAction<Record<string, LangContent>>
    >;
    slideCount: number;
    setSlideCount: React.Dispatch<React.SetStateAction<number>>;
    isCopyChecked: boolean;
    setIsCopyChecked: (v: boolean) => void;
};

const EMPTY_SLIDE: Slide = {
    title: "",
    body: "",
    imageName: "",
    buttonCount: 0,
    button1Label: "",
    button2Label: "",
    button1Url: "",
    button2Url: "",
};

const RcsEditor: React.FC<RcsEditorProps> = ({
                                                 activeLang,
                                                 setActiveLang,
                                                 enabledLangs,
                                                 rcsContents,
                                                 setRcsContents,
                                                 slideCount,
                                                 setSlideCount,
                                                 isCopyChecked,
                                                 setIsCopyChecked,
                                             }) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

    const enabledLangObjects = LANGS.filter((l) =>
        enabledLangs.includes(l.code),
    );

    const getLangLabel = (code: string) =>
        LANGS.find((l) => l.code === code)?.label ?? code;

    // 슬라이드 개수 조정
    const adjustSlidesForAllLangs = (newCount: number) => {
        setRcsContents((prev) => {
            const updated: Record<string, LangContent> = {};

            Object.entries(prev).forEach(([code, content]) => {
                let slides: Slide[] = [...(content.slides ?? [])];

                if (slides.length > newCount) {
                    // 더 많으면 잘라냄
                    slides = slides.slice(0, newCount);
                } else if (slides.length < newCount) {
                    // 부족하면 빈 슬라이드 채워 넣기
                    const diff = newCount - slides.length;

                    const extraSlides: Slide[] = Array.from(
                        { length: diff },
                        (): Slide => ({ ...EMPTY_SLIDE }),
                    );

                    slides = [...slides, ...extraSlides];
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
            const baseSlides = langContent?.slides ?? [];

            // 최소 1장은 유지
            const slides: Slide[] =
                baseSlides.length === 0 ? [{ ...EMPTY_SLIDE }] : [...baseSlides];

            const idx = Math.min(currentSlideIndex, slides.length - 1);
            slides[idx] = {
                ...slides[idx],
                ...patch,
            };

            return {
                ...prev,
                [activeLang]: { slides },
            };
        });
    };

    const handleRcsTextChange = (field: "title" | "body", value: string) => {
        setIsCopyChecked(false);
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

    // 활성 언어에 대한 RCS 콘텐츠
    const langContent = rcsContents[activeLang];
    const slidesFromState = langContent?.slides ?? [];

    // slideCount 와 실제 slides 길이 둘 중 작은 값 기준으로 안전하게 처리
    const totalSlides = Math.min(
        Math.max(slideCount, 1),
        Math.max(slidesFromState.length, 1),
    );

    if (totalSlides <= 0) {
        return (
            <section className="bg-white rounded-xl shadow p-6">
                <p className="text-sm text-slate-500">
                    선택된 언어에 대한 RCS 내용이 아직 없습니다. AI로 작성하거나 직접 입력해 주세요.
                </p>
            </section>
        );
    }

    const safeIndex = Math.min(currentSlideIndex, totalSlides - 1);
    const slides: Slide[] =
        slidesFromState.length === 0
            ? Array.from({ length: totalSlides }, () => ({ ...EMPTY_SLIDE }))
            : slidesFromState;

    const currentRcs: Slide = slides[safeIndex] ?? { ...EMPTY_SLIDE };

    const maxSlideIndex = totalSlides - 1;

    const goPrevSlide = () => {
        setCurrentSlideIndex((idx) => (idx > 0 ? idx - 1 : idx));
    };

    const goNextSlide = () => {
        setCurrentSlideIndex((idx) => (idx < maxSlideIndex ? idx + 1 : idx));
    };

    return (
        <section className="bg-white rounded-xl shadow p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                RCS Carousel 화면 구성
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 단말 미리보기 */}
                <div className="flex justify-center relative">
                    {/* 왼쪽 화살표 */}
                    <Button
                        type="button"
                        variant="outline"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full p-0 text-xs"
                        onClick={goPrevSlide}
                        disabled={currentSlideIndex === 0}
                    >
                        &lt;
                    </Button>

                    {/* 단말기 */}
                    <div className="w-[260px] h-[520px] bg-slate-100 rounded-[32px] shadow-inner p-3 border border-slate-200 flex flex-col">
                        <div className="h-6 flex items-center justify-center text-[10px] text-slate-500">
                            9:41 · RCS Carousel
                        </div>

                        <div className="mt-2 bg-white rounded-2xl shadow-sm p-3 space-y-2 flex-1">
                            {/* 이미지 영역 */}
                            <div className="h-28 rounded-xl bg-slate-200 flex flex-col items-center justify-center text-xs text-slate-500 px-3 text-center">
                                {currentRcs.imageName ? (
                                    <span className="text-[10px] text-slate-700 truncate max-w-full">
                    {currentRcs.imageName}
                  </span>
                                ) : (
                                    <>
                                        <span>이미지 / 카드 {safeIndex + 1}</span>
                                        <span className="mt-1 text-[10px] text-slate-500">
                      이미지를 업로드해 주세요.
                    </span>
                                    </>
                                )}
                            </div>

                            {/* 제목 + 본문 */}
                            <div className="space-y-1">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                    {currentRcs.title || "메시지 제목 미입력"}
                                </div>
                                <p
                                    className="
    text-[11px] leading-snug text-slate-700
    max-h-24 overflow-y-auto whitespace-pre-line
  "
                                >
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

                        {/* 슬라이드 번호 */}
                        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <span>
                슬라이드 {safeIndex + 1} / {totalSlides}
              </span>
                        </div>

                        {/* 슬라이드 인디케이터 */}
                        <div className="mt-1 flex justify-center gap-1">
                            {Array.from({ length: totalSlides }).map((_, idx) => (
                                <span
                                    key={idx}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        idx === safeIndex ? "bg-slate-700" : "bg-slate-300"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 오른쪽 화살표 */}
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

                {/* 우측 입력 폼 */}
                <div className="space-y-5">
                    {/* 언어 탭 + 슬라이드 수 조절 */}
                    <div className="space-y-3">
                        {/* 편집 언어 탭 */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">편집 언어</span>
                                <span className="text-[11px] text-slate-400">
                  공통 발송 조건에서 선택한 언어만 노출됩니다.
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

                        {/* 슬라이드 개수 */}
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

                    {/* 제목 */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            {getLangLabel(activeLang)} 제목 (슬라이드 {safeIndex + 1})
                        </label>
                        <input
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="예: 연말 이벤트 안내"
                            value={currentRcs.title}
                            maxLength={60}
                            onChange={(e) => handleRcsTextChange("title", e.target.value)}
                        />
                    </div>

                    {/* 이미지 첨부 */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            이미지 첨부 (슬라이드 {safeIndex + 1})
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
                            * 실제 업로드 동작은 별도 구현이 필요합니다.
                        </p>
                    </div>

                    {/* 본문 */}
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700">
                                {getLangLabel(activeLang)} 본문 (슬라이드 {safeIndex + 1})
                            </label>

                            <span className="text-[11px] text-slate-500">
                {(currentRcs.body ?? "").length} / 600자
              </span>
                        </div>

                        <textarea
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[140px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="고객에게 발송될 메시지 내용을 입력해 주세요."
                            value={currentRcs.body ?? ""}
                            maxLength={600}
                            onChange={(e) => handleRcsTextChange("body", e.target.value)}
                        />
                    </div>

                    {/* 문구 검토 */}
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
                                {/* 버튼 1 */}
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
                                            버튼 1 URL
                                        </label>
                                        <input
                                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                            placeholder="https://"
                                            value={currentRcs.button1Url}
                                            onChange={(e) =>
                                                handleRcsButtonUrlChange("button1Url", e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                {/* 버튼 2 */}
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
                                                버튼 2 URL
                                            </label>
                                            <input
                                                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                                placeholder="https://"
                                                value={currentRcs.button2Url}
                                                onChange={(e) =>
                                                    handleRcsButtonUrlChange("button2Url", e.target.value)
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
        </section>
    );
};

export default RcsEditor;
