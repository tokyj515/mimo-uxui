// components/AiPromptModal.tsx
"use client";

import React from "react";
import { Button } from "@/components/Button";

type AiPromptModalProps = {
    open: boolean;
    onClose: () => void;
    aiPrompt: string;
    setAiPrompt: (value: string) => void;
    aiLoading: boolean;
    onSubmit: () => void;
};

const EXAMPLE_PROMPTS = [
    "연말 KT VIP 고객 대상으로 데이터 쿠폰 증정 이벤트를 알리는 RCS Carousel 메시지를 만들고 싶어. 카드 3장 정도로 혜택 소개와 유의사항을 나눠줘.",
    "미납 요금 납부 기한 안내 문자를 보낼 건데, 비광고성 안내 톤으로 SMS나 간단한 MMS가 좋을 것 같아.",
    "신규 요금제 출시 프로모션을 하루 동안 진행하는데, RCS + 대체 MMS 조합으로 버튼까지 포함된 광고성 메시지를 만들고 싶어.",
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
                                대상·목적·전달하고 싶은 내용을 간단히 적어주면
                                SMS / MMS / RCS MMS / RCS Carousel 및 대체 MMS까지
                                한 번에 초안을 만들어 드려요.
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

                {/* 예시 프롬프트 */}
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
                            onClick={onClose}
                        >
                            취소
                        </Button>
                        <Button
                            type="button"
                            className="px-4"
                            onClick={onSubmit}
                            disabled={!aiPrompt.trim() || aiLoading}
                        >
                            {aiLoading ? "작성 중..." : "이 프롬프트로 작성하기"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiPromptModal;
