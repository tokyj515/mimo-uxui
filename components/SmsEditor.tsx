// components/SmsEditor.tsx
"use client";

import React from "react";
import { Button } from "@/components/Button";
import { LANGS } from "@/lib/messageTemplate";

type SmsEditorProps = {
    activeLang: string;
    setActiveLang: (code: string) => void;
    enabledLangs: string[];
    smsContents: Record<string, string>; // 언어별 SMS 본문
    setSmsContents: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isSmsCopyChecked: boolean;
    setIsSmsCopyChecked: (v: boolean) => void;
};

const SmsEditor: React.FC<SmsEditorProps> = ({
                                                 activeLang,
                                                 setActiveLang,
                                                 enabledLangs,
                                                 smsContents,
                                                 setSmsContents,
                                                 isSmsCopyChecked,
                                                 setIsSmsCopyChecked,
                                             }) => {
    const enabledLangObjects = LANGS.filter((l) =>
        enabledLangs.includes(l.code),
    );

    const getLangLabel = (code: string) =>
        LANGS.find((l) => l.code === code)?.label ?? code;

    const currentBody = smsContents[activeLang] ?? "";

    const updateBody = (value: string) => {
        setSmsContents((prev) => ({
            ...prev,
            [activeLang]: value,
        }));
        // 내용이 바뀌면 다시 검토 필요
        setIsSmsCopyChecked(false);
    };

    return (
        <section className="bg-white rounded-xl shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">SMS 메시지</h2>
                <span className="text-[11px] text-slate-500">
          * 단말 미리보기를 통해 작성 중인 내용을 실시간으로 확인할 수 있습니다.
        </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 단말 미리보기 */}
                <div className="flex justify-center">
                    <div className="w-[260px] h-[520px] bg-slate-100 rounded-[32px] shadow-inner p-3 border border-slate-200 flex flex-col">
                        <div className="h-6 flex items-center justify-center text-[10px] text-slate-500">
                            9:41 · SMS
                        </div>
                        <div className="mt-2 bg-white rounded-2xl shadow-sm p-3 flex-1">
                            <div className="w-full h-full rounded-2xl bg-slate-50 border border-slate-200 p-3 text-[11px] leading-snug text-slate-800 overflow-hidden">
                                {currentBody || "작성 중인 SMS 본문이 이 영역에 표시됩니다."}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 입력 영역 */}
                <div className="space-y-5">
                    {/* 언어 탭 */}
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

                    {/* 본문 입력 */}
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-slate-700">
                                {getLangLabel(activeLang)} 본문
                            </label>
                            <span className="text-[11px] text-slate-500">
                {currentBody.length} / 2000자
              </span>
                        </div>
                        <textarea
                            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm min-h-[180px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="고객에게 발송될 SMS 본문을 입력해 주세요."
                            maxLength={2000}
                            value={currentBody}
                            onChange={(e) => updateBody(e.target.value)}
                        />
                    </div>

                    {/* 문구 검토 박스 */}
                    <div
                        className={`mt-3 flex items-center justify-between rounded-md border px-3 py-2 text-[11px] ${
                            isSmsCopyChecked
                                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                : "border-amber-300 bg-amber-50 text-amber-800"
                        }`}
                    >
                        <div className="flex items-center gap-2">
              <span className="text-base">
                {isSmsCopyChecked ? "✅" : "⚠️"}
              </span>
                            <span className="font-medium">
                {isSmsCopyChecked
                    ? "SMS 문구 검토 완료"
                    : "SMS 문구 검토가 필요합니다."}
              </span>
                            {isSmsCopyChecked && (
                                <span className="text-[10px] opacity-80">
                  (내용 수정 시 다시 검토 필요)
                </span>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant={isSmsCopyChecked ? "outline" : "solid"}
                            className="h-8 px-3 text-[11px]"
                            onClick={() => setIsSmsCopyChecked(true)}
                        >
                            {isSmsCopyChecked ? "다시 검토하기" : "문구 검토"}
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SmsEditor;
