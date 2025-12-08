// components/RcsSingleEditor.tsx
"use client";

import React from "react";
import { Button } from "@/components/Button";
import { LANGS, Slide, LangContent } from "@/lib/messageTemplate";

type RcsSingleEditorProps = {
    activeLang: string;
    setActiveLang: (code: string) => void;
    enabledLangs: string[];
    rcsContents: Record<string, LangContent>;
    setRcsContents: React.Dispatch<
        React.SetStateAction<Record<string, LangContent>>
    >;
    isCopyChecked: boolean;
    setIsCopyChecked: (v: boolean) => void;
};

const RcsSingleEditor: React.FC<RcsSingleEditorProps> = ({
                                                             activeLang,
                                                             setActiveLang,
                                                             enabledLangs,
                                                             rcsContents,
                                                             setRcsContents,
                                                             isCopyChecked,
                                                             setIsCopyChecked,
                                                         }) => {
    const enabledLangObjects = LANGS.filter((l) =>
        enabledLangs.includes(l.code),
    );

    const getLangLabel = (code: string) =>
        LANGS.find((l) => l.code === code)?.label ?? code;

    const langContent = rcsContents[activeLang];
    const baseSlide: Slide = {
        title: "",
        body: "",
        imageName: "",
        buttonCount: 0,
        button1Label: "",
        button2Label: "",
        button1Url: "",
        button2Url: "",
    };

    const currentSlide: Slide =
        langContent && langContent.slides && langContent.slides[0]
            ? langContent.slides[0]
            : baseSlide;

    const updateSlide = (patch: Partial<Slide>) => {
        setRcsContents((prev) => {
            const prevContent = prev[activeLang] ?? { slides: [baseSlide] };
            const slides = [...(prevContent.slides || [baseSlide])];

            slides[0] = {
                ...slides[0],
                ...patch,
            };

            return {
                ...prev,
                [activeLang]: { slides },
            };
        });
    };

    const handleTextChange = (field: "title" | "body", value: string) => {
        setIsCopyChecked(false);
        updateSlide({ [field]: value } as Partial<Slide>);
    };

    const handleButtonCountChange = (count: 0 | 1 | 2) => {
        updateSlide({ buttonCount: count });
    };

    const handleButtonLabelChange = (
        field: "button1Label" | "button2Label",
        value: string,
    ) => {
        updateSlide({ [field]: value } as Partial<Slide>);
    };

    const handleButtonUrlChange = (
        field: "button1Url" | "button2Url",
        value: string,
    ) => {
        updateSlide({ [field]: value } as Partial<Slide>);
    };

    return (
        <section className="bg-white rounded-xl shadow p-6 space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                RCS 단일 화면 구성
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 단말 미리보기 */}
                <div className="flex justify-center">
                    <div className="w-[260px] h-[520px] bg-slate-100 rounded-[32px] shadow-inner p-3 border border-slate-200 flex flex-col">
                        <div className="h-6 flex items-center justify-center text-[10px] text-slate-500">
                            9:41 · RCS
                        </div>

                        <div className="mt-2 bg-white rounded-2xl shadow-sm p-3 space-y-2 flex-1">
                            {/* 이미지 영역 */}
                            <div className="h-28 rounded-xl bg-slate-200 flex flex-col items-center justify-center text-xs text-slate-500 px-3 text-center">
                                {currentSlide.imageName ? (
                                    <span className="text-[10px] text-slate-700 truncate max-w-full">
                    {currentSlide.imageName}
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
                            <div className="space-y-1">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                    {currentSlide.title || "메시지 제목 미입력"}
                                </div>
                                <p className="text-[11px] leading-snug text-slate-700 max-h-24 overflow-hidden">
                                    {currentSlide.body ||
                                        "작성 중인 메시지 내용이 이 영역에 표시됩니다."}
                                </p>
                            </div>

                            {/* 버튼 프리뷰 */}
                            {currentSlide.buttonCount > 0 && (
                                <div className="pt-2 space-y-1.5">
                                    <div className="w-full h-8 rounded-full bg-slate-100 text-[10px] flex items-center justify-center text-slate-600">
                                        {currentSlide.button1Label || "버튼 1"}
                                    </div>

                                    {currentSlide.buttonCount === 2 && (
                                        <div className="w-full h-8 rounded-full bg-slate-100 text-[10px] flex items-center justify-center text-slate-600">
                                            {currentSlide.button2Label || "버튼 2"}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 입력 폼 */}
                <div className="space-y-5">
                    {/* 언어 탭 */}
                    <div className="space-y-3">
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
                    </div>

                    {/* 제목 */}
                    <div>
                        <label className="text-xs font-semibold text-slate-700">
                            {getLangLabel(activeLang)} 제목
                        </label>
                        <input
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="예: 연말 이벤트 안내"
                            value={currentSlide.title}
                            maxLength={60}
                            onChange={(e) => handleTextChange("title", e.target.value)}
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
                                        updateSlide({ imageName: file ? file.name : "" });
                                    }}
                                />
                            </label>
                            <span className="text-[11px] text-slate-500 truncate max-w-[160px]">
                {currentSlide.imageName || "선택된 파일 없음"}
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
                                {getLangLabel(activeLang)} 본문
                            </label>
                            <span className="text-[11px] text-slate-500">
                {currentSlide.body.length} / 600자
              </span>
                        </div>
                        <textarea
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[140px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="고객에게 발송될 메시지 내용을 입력해 주세요."
                            value={currentSlide.body}
                            maxLength={600}
                            onChange={(e) => handleTextChange("body", e.target.value)}
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
                                        handleButtonCountChange(btn.value as 0 | 1 | 2)
                                    }
                                    className={`h-8 px-3 rounded-full border text-xs transition ${
                                        currentSlide.buttonCount === btn.value
                                            ? "bg-teal-500 text-white border-teal-500"
                                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>

                        {currentSlide.buttonCount > 0 && (
                            <div className="mt-2 space-y-2">
                                <div className="grid gap-2 md:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-semibold text-slate-700">
                                            버튼 1 이름
                                        </label>
                                        <input
                                            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                            placeholder="예: 자세히 보기"
                                            value={currentSlide.button1Label}
                                            maxLength={20}
                                            onChange={(e) =>
                                                handleButtonLabelChange(
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
                                            value={currentSlide.button1Url}
                                            onChange={(e) =>
                                                handleButtonUrlChange("button1Url", e.target.value)
                                            }
                                        />
                                    </div>
                                </div>

                                {currentSlide.buttonCount === 2 && (
                                    <div className="grid gap-2 md:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-[11px] font-semibold text-slate-700">
                                                버튼 2 이름
                                            </label>
                                            <input
                                                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                                placeholder="예: 신청하기"
                                                value={currentSlide.button2Label}
                                                maxLength={20}
                                                onChange={(e) =>
                                                    handleButtonLabelChange(
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
                                                value={currentSlide.button2Url}
                                                onChange={(e) =>
                                                    handleButtonUrlChange(
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
        </section>
    );
};

export default RcsSingleEditor;
