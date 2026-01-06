// components/MmsEditor.tsx
"use client";

import React from "react";
import { Button } from "@/components/Button";
import {
    LANGS,
    MmsContent,
} from "@/lib/messageTemplate";

type MmsEditorProps = {
    activeLang: string;
    setActiveLang: (code: string) => void;
    enabledLangs: string[];
    mmsContents: Record<string, MmsContent>;
    setMmsContents: React.Dispatch<
        React.SetStateAction<Record<string, MmsContent>>
    >;
    myktLink: "포함" | "미포함";
    setMyktLink: (v: "포함" | "미포함") => void;
    closingRemark: "포함" | "미포함";
    setClosingRemark: (v: "포함" | "미포함") => void;
    imagePosition: "위" | "아래";
    setImagePosition: (v: "위" | "아래") => void;
    isMmsCopyChecked: boolean;
    setIsMmsCopyChecked: (v: boolean) => void;
};

const MmsEditor: React.FC<MmsEditorProps> = ({
                                                 activeLang,
                                                 setActiveLang,
                                                 enabledLangs,
                                                 mmsContents,
                                                 setMmsContents,
                                                 myktLink,
                                                 setMyktLink,
                                                 closingRemark,
                                                 setClosingRemark,
                                                 imagePosition,
                                                 setImagePosition,
                                                 isMmsCopyChecked,
                                                 setIsMmsCopyChecked,
                                             }) => {
    const enabledLangObjects = LANGS.filter((l) =>
        enabledLangs.includes(l.code),
    );

    const getLangLabel = (code: string) =>
        LANGS.find((l) => l.code === code)?.label ?? code;

    const currentMms = mmsContents[activeLang];

    const updateMmsContent = (patch: Partial<MmsContent>) => {
        setMmsContents((prev) => ({
            ...prev,
            [activeLang]: {
                ...prev[activeLang],
                ...patch,
            },
        }));
        // MMS 내용 변경 시 검토 다시 필요
        setIsMmsCopyChecked(false);
    };

    return (
        <>
            {/* MMS 화면 구성 */}
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

            {/* MMS 내용 구성 */}
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
                                    <div className="text-[11px] leading-snug text-slate-700 whitespace-pre-line overflow-y-auto max-h-48 pr-1">
                                        {currentMms.body || "작성 중인 MMS 메시지 내용이 이 영역에 표시됩니다."}
                                    </div>
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
                                onClick={() => setIsMmsCopyChecked(true)}
                            >
                                {isMmsCopyChecked ? "다시 검토하기" : "문구 검토"}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default MmsEditor;
