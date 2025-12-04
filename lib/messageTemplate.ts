// lib/messageTemplate.ts

// 사용 가능한 언어 목록
export const LANGS = [
    { code: "ko", label: "한국어" },
    { code: "en", label: "영어" },
    { code: "zh", label: "중국어" },
    { code: "vi", label: "베트남어" },
    { code: "ru", label: "러시아어" },
];

// 예약 시간/발송량 상수
export const START_HOUR = 9;               // 시작 시
export const END_HOUR = 19;                // 마지막 시 (19시)
export const MAX_PER_HOUR = 300_000;       // 시간당 30만 건
export const MINUTE_OPTIONS = ["00", "10", "20", "30", "40", "50"] as const;
export type MinuteOption = (typeof MINUTE_OPTIONS)[number];

export const HOURS = Array.from({ length: 11 }, (_, i) => 9 + i); // 09 ~ 19
export const MINUTES = ["00", "10", "20", "30", "40", "50"] as const;
export const HOURLY_CAPACITY = 300_000;

export const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

// 시간대 리스트 (1시간 단위 블럭)
export const HOUR_SLOTS = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, idx) => {
        const h = START_HOUR + idx;
        return {
            hour: h,
            label: `${String(h).padStart(2, "0")}:00 ~ ${String(h + 1).padStart(
                2,
                "0",
            )}:00`,
            capacity: MAX_PER_HOUR,
        };
    },
);

export type Slide = {
    title: string;
    body: string;
    imageName?: string; // 슬라이드별 이미지 파일명
    buttonCount: 0 | 1 | 2;
    button1Label: string;
    button2Label: string;
    button1Url: string;
    button2Url: string;
};

export type LangContent = {
    slides: Slide[];
};

export type CheckType = "법률" | "정보보호" | "리스크" | "공정경쟁";

export type MmsContent = {
    title: string;
    body: string;
    imageName?: string;
};

export const createEmptySlides = (count = 3): Slide[] =>
    Array.from({ length: count }, () => ({
        title: "",
        body: "",
        imageName: "",
        buttonCount: 0,
        button1Label: "",
        button2Label: "",
        button1Url: "",
        button2Url: "",
    }));

export const createInitialLangState = (): Record<string, LangContent> => {
    const base: Record<string, LangContent> = {};
    LANGS.forEach((l) => {
        base[l.code] = { slides: createEmptySlides() };
    });
    return base;
};

export const createInitialMmsState = (): Record<string, MmsContent> => {
    const base: Record<string, MmsContent> = {};
    LANGS.forEach((l) => {
        base[l.code] = { title: "", body: "", imageName: "" };
    });
    return base;
};

// 예약일 라벨 포맷터
export const formatReservationLabel = (date: string, time: string): string => {
    if (!date || !time) return "";
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const d = new Date(`${date}T${time}`);
    if (Number.isNaN(d.getTime())) return "";

    const [year, month, day] = date.split("-");
    const dow = days[d.getDay()];
    // 예: 2025.11.30 (화) 14:30
    return `${year}.${month}.${day} (${dow}) ${time}`;
};
