// components/ReservationModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import {
    MINUTE_OPTIONS,
    MinuteOption,
    HOUR_SLOTS,
    HOURLY_CAPACITY,
    pad2,
} from "@/lib/messageTemplate";

type ReservationModalProps = {
    open: boolean;
    onClose: () => void;
    reservationDate: string;
    reservationTime: string;
    onApply: (date: string, time: string) => void;
};

const ReservationModal: React.FC<ReservationModalProps> = ({
                                                               open,
                                                               onClose,
                                                               reservationDate,
                                                               reservationTime,
                                                               onApply,
                                                           }) => {
    const [reservationViewDate, setReservationViewDate] = useState("");
    const [selectedHour, setSelectedHour] = useState<number | null>(null);
    const [selectedMinute, setSelectedMinute] =
        useState<MinuteOption>("00");

    // 모달이 열릴 때마다 props 기반으로 내부 상태 초기화
    useEffect(() => {
        if (!open) return;

        const todayIso = new Date().toISOString().slice(0, 10);
        const baseDate = reservationDate || todayIso;
        setReservationViewDate(baseDate);

        if (reservationTime) {
            const [h, m] = reservationTime.split(":");
            setSelectedHour(Number(h));
            setSelectedMinute((m as MinuteOption) ?? "00");
        } else {
            setSelectedHour(null);
            setSelectedMinute("00");
        }
    }, [open, reservationDate, reservationTime]);

    if (!open) return null;

    const handleConfirm = () => {
        // 날짜/시간을 제대로 선택 안 했으면 그냥 닫기만
        if (!reservationViewDate || selectedHour === null) {
            onClose();
            return;
        }

        const time = `${pad2(selectedHour)}:${selectedMinute}`;
        onApply(reservationViewDate, time);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-4xl rounded-xl bg-white p-6 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                        발송량 현황 조회 · 예약 발송 시간 선택
                    </h3>
                    <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-700"
                        onClick={onClose}
                    >
                        닫기
                    </button>
                </div>

                <div className="grid grid-cols-[220px,1fr,220px] gap-4 text-xs">
                    {/* 좌측: 선택일 (달력) */}
                    <div className="border rounded-lg p-3 space-y-3 bg-slate-50">
                        <div className="font-semibold text-slate-700">선택일</div>
                        <input
                            type="date"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                            value={reservationViewDate}
                            onChange={(e) => setReservationViewDate(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                            * 캘린더에서 원하는 날짜를 선택하면 해당 일의 시간대별 최대 발송
                            가능량을 조회합니다. (예시: 시간당{" "}
                            {HOURLY_CAPACITY.toLocaleString()}건)
                        </p>
                    </div>

                    {/* 가운데: 1시간 단위 시간대 + 발송가능량 */}
                    <div className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">
                시간대 선택
              </span>
                            <span className="text-[11px] text-slate-500">
                1시간 단위로 최대 발송 가능량을 확인한 뒤, 오른쪽에서 세부 시·분을
                선택합니다.
              </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                            {HOUR_SLOTS.map((slot) => {
                                const isSelected = selectedHour === slot.hour;
                                return (
                                    <button
                                        key={slot.hour}
                                        type="button"
                                        onClick={() => setSelectedHour(slot.hour)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-md border text-[11px] transition ${
                                            isSelected
                                                ? "bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-offset-1 ring-teal-400"
                                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        <span className="font-semibold">{slot.label}</span>
                                        <span className="text-[10px] text-slate-500">
                      {slot.capacity.toLocaleString()} 건
                    </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 우측: 선택 요약 + 시/분 선택 */}
                    <div className="border rounded-lg p-3 flex flex-col gap-3 bg-slate-50">
                        <div className="space-y-1">
                            <div className="font-semibold text-slate-700 mb-1">
                                선택 정보
                            </div>
                            <p className="text-[11px] text-slate-600">
                                날짜: {reservationViewDate || "-"}
                            </p>
                            <p className="text-[11px] text-slate-600">
                                시간:{" "}
                                {selectedHour === null
                                    ? "미선택"
                                    : `${String(selectedHour).padStart(2, "0")}:${selectedMinute}`}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-400">
                                * 시(시간)는 가운데에서 1시간 단위로 선택하고, 분은 아래에서
                                10분 단위로 선택합니다.
                            </p>
                        </div>

                        {/* 시/분 세부 선택 */}
                        <div className="border-t border-dashed border-slate-200 pt-2 mt-1 space-y-2">
                            <div className="flex gap-2">
                                {/* 시 선택 */}
                                <div className="flex-1">
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        시
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                        value={selectedHour ?? ""}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setSelectedHour(v ? Number(v) : null);
                                        }}
                                    >
                                        <option value="">선택</option>
                                        {HOUR_SLOTS.map((slot) => (
                                            <option key={slot.hour} value={slot.hour}>
                                                {String(slot.hour).padStart(2, "0")}시
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 분 선택 */}
                                <div className="flex-1">
                                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                        분 (10분 단위)
                                    </label>
                                    <select
                                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                                        value={selectedMinute}
                                        onChange={(e) =>
                                            setSelectedMinute(e.target.value as MinuteOption)
                                        }
                                    >
                                        {MINUTE_OPTIONS.map((m) => (
                                            <option key={m} value={m}>
                                                {m}분
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-400">
                                * 실제 예약 시간은{" "}
                                {selectedHour === null
                                    ? "시/분 선택 후 결정됩니다."
                                    : `${String(selectedHour).padStart(2, "0")}:${selectedMinute}`}{" "}
                                기준으로 공통 발송 조건 영역에 반영됩니다.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 text-xs">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-8 px-4"
                        onClick={onClose}
                    >
                        취소
                    </Button>
                    <Button
                        type="button"
                        className="h-8 px-5 bg-teal-600 hover:bg-teal-700 text-white"
                        onClick={handleConfirm}
                    >
                        확인
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReservationModal;
