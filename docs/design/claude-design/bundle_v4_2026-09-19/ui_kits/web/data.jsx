/* Mock data — strictly v2.3 compliant. */

const TOURNAMENTS = [
  { id: "t1", cat: "K-POP", title: "최고의 퍼포먼스 무대 · 2026",
    titleKo: "최고의 퍼포먼스 무대",
    contestants: 48, deadline: "Jun 30", status: "active",
    coverA: ["rgba(252,208,6,0.22)", "rgba(215,6,58,0.14)"],
  },
  { id: "t2", cat: "K-POP", title: "Idol of the Decade",
    titleKo: "케이팝 아이돌 어브 더 디케이드",
    contestants: 48, deadline: "Jul 04", status: "active",
    coverA: ["rgba(0,163,183,0.22)", "rgba(238,218,125,0.10)"],
  },
  { id: "t3", cat: "OTHER", title: "올해의 무대",
    titleKo: "올해의 무대",
    contestants: 48, deadline: "Jul 11", status: "published",
    coverA: ["rgba(54,34,97,0.7)", "rgba(0,0,58,0.4)"],
  },
  { id: "t4", cat: "OTHER", title: "레전드 콘서트",
    titleKo: "레전드 콘서트",
    contestants: 48, deadline: "Aug 02", status: "active",
    coverA: ["rgba(0,163,183,0.18)", "rgba(215,6,58,0.10)"],
  },
  { id: "t5", cat: "K-POP", title: "베스트 보컬 라인",
    titleKo: "베스트 보컬 라인",
    contestants: 48, deadline: "Aug 15", status: "published",
    coverA: ["rgba(238,218,125,0.18)", "rgba(54,34,97,0.5)"],
  },
  { id: "t6", cat: "K-POP", title: "Producers of the Year",
    titleKo: "프로듀서 어브 더 이어",
    contestants: 48, deadline: "Aug 30", status: "published",
    coverA: ["rgba(215,6,58,0.18)", "rgba(0,0,58,0.4)"],
  },
];

const CONTESTANTS = [
  // pairings — 24 matches in ROUND OF 48
  { id: "c01", name: "슬기",  meta: "KR · VOCAL · MAIN",  initial: "SG", side: "left" },
  { id: "c02", name: "미나",  meta: "JP · DANCE · MAIN",  initial: "MN", side: "right" },
  { id: "c03", name: "카리나", meta: "KR · RAP · LEAD",  initial: "KA", side: "left" },
  { id: "c04", name: "윈터", meta: "KR · VOCAL · MAIN", initial: "WT", side: "right" },
  { id: "c05", name: "제니",   meta: "KR · DANCE · LEAD",   initial: "JN", side: "left" },
  { id: "c06", name: "태연", meta: "KR · VOCAL · LEAD", initial: "TY", side: "right" },
  { id: "c07", name: "리사",    meta: "TH · DANCE · MAIN",   initial: "LS", side: "left" },
  { id: "c08", name: "민지", meta: "KR · RAP · MAIN", initial: "MJ", side: "right" },
];

window.WC_DATA = { TOURNAMENTS, CONTESTANTS };
