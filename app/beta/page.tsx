import { BetaGate } from "@/components/beta/BetaGate";
import s from "./beta.module.css";

/**
 * /beta — 1차 베타 초대 페이지 본문 (BETA-PASS-1).
 * 글자 · 순서 · 색은 시안(BETA-PASS-1_beta페이지_시안_Main.dc.html)이 정본 — 색은 토큰으로 옮겼다.
 * 한국어만(대표 승인 2026-11-25). 로그인 자리만 화면 상태를 갖는다(BetaGate).
 */
const SURVEY_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSe6ItzAnHlxGSfqb-egxrYjgHbQxHvSLGn0cWW7ohjQ-7Je-A/viewform";

function Crown() {
  return (
    <svg viewBox="0 0 143.938 134.878" className={s.crown} aria-hidden="true">
      <path
        fill="currentColor"
        d="M141.13,72.455c-0.728-0.064-1.409,0.143-1.972,0.521c-0.097,0.066-0.188,0.132-0.285,0.199c-9.776,6.764-26.054,14.975-38.315,5.759C87.99,69.486,80.666,51.155,77.34,40.736c-0.376-1.129-1.389-1.985-2.649-2.096c-1.26-0.11-2.407,0.557-2.974,1.604c-5.084,9.684-15.481,26.464-29.498,33.585C28.5,80.771,13.895,69.859,5.442,61.5c-0.489-0.47-1.125-0.792-1.852-0.855c-1.692-0.148-3.185,1.104-3.333,2.797c-0.018,0.205-0.013,0.407,0.008,0.605l10.062,58.905c0.216,1.361,1.325,2.455,2.76,2.581l107.583,9.412c1.435,0.125,2.717-0.76,3.165-2.062l20.17-56.35c0.057-0.19,0.096-0.389,0.113-0.595C144.075,74.095,142.822,72.603,141.13,72.455z"
      />
      <circle fill="currentColor" cx="77.036" cy="11.563" r="11.562" />
    </svg>
  );
}

export default function BetaPage() {
  return (
    <main className={s.page} data-testid="beta-page">
      <header className={s.header}>
        <div className={s.logo}>
          WorldCrown<span className={s.gold}>48</span>
        </div>
        <div className={s.badge}>BETA · 비공개</div>
      </header>

      <section className={s.hero}>
        <Crown />
        <p className={s.eyebrow}>1차 베타 테스터 초대</p>
        <h1 className={s.title}>
          축하합니다!
          <br />
          월크48의 첫 팬으로 모십니다
        </h1>
        <p className={s.lead}>
          여러분이 이번에 돈 판은 런칭 날 처음 공개되는 차트와 뉴스의 첫 기록이 됩니다. 진짜 팬의 마음으로 골라 주세요.
        </p>
        <div className={s.chips}>
          <span className={s.chip}>
            테스트 · 설문 <b className={s.gold}>11/27(금) ~ 11/30(월) 밤 11:59</b>
          </span>
        </div>
        <BetaGate />
        <a href={SURVEY_URL} target="_blank" rel="noopener noreferrer" className={s.outline}>
          설문 참여하기 (5분) →
        </a>
      </section>

      <section className={s.section}>
        <h2 className={s.h2}>카카오톡으로 받은 링크, 이렇게 여세요</h2>
        <p className={s.sub}>카카오톡 안에서 바로 열면 구글 로그인이 막힐 수 있습니다. 꼭 크롬이나 사파리로 열어 주세요.</p>
        <div className={s.grid2}>
          <div className={s.card}>
            <p className={s.cardHead}>휴대폰에서</p>
            <ol className={s.list}>
              <li>카카오톡에서 링크를 누릅니다</li>
              <li>화면 오른쪽 아래(아이폰) 또는 오른쪽 위 ⋮(안드로이드) 메뉴를 누릅니다</li>
              <li>
                <b>[다른 브라우저로 열기]</b>를 고릅니다
              </li>
              <li>크롬 · 사파리에서 [구글로 로그인하고 시작하기]</li>
            </ol>
          </div>
          <div className={s.card}>
            <p className={s.cardHead}>컴퓨터(PC)에서</p>
            <ol className={s.list}>
              <li>
                <b>PC 카카오톡이 있으면</b> — 같은 대화방에서 링크를 누르면 PC 브라우저로 열립니다
              </li>
              <li>
                <b>PC 카카오톡이 없으면</b> — 크롬 주소창에{" "}
                <a href="https://worldcrown48.com/beta" className={s.inlineLink}>
                  worldcrown48.com/beta
                </a>{" "}
                를 직접 입력합니다
              </li>
              <li>
                휴대폰과 <b>같은 구글 계정</b>으로 로그인합니다
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <h2 className={s.h2}>월크48은 이런 곳이에요</h2>
        <p className={s.subWide}>좋아하는 엔트리 48개 가운데, 매치마다 마음 가는 하나를 골라 최애를 정하는 사이트입니다.</p>
        <div className={s.grid4}>
          <div className={s.card}>
            <p className={s.step}>1 · 매치</p>
            <p className={s.stepBody}>두 엔트리의 영상을 보고 아래 이름 버튼으로 하나를 고릅니다.</p>
          </div>
          <div className={s.card}>
            <p className={s.step}>2 · 라운드</p>
            <p className={s.stepBody}>48 → 24 → 12 → 6. 고를수록 남는 엔트리가 줄어듭니다.</p>
          </div>
          <div className={s.card}>
            <p className={s.step}>3 · THE FINAL</p>
            <p className={s.stepBody}>마지막 셋 가운데 단 하나, 나의 최애를 고릅니다.</p>
          </div>
          <div className={`${s.card} ${s.cardGold}`}>
            <p className={s.step}>4 · 크라운 카드</p>
            <p className={s.stepBody}>나의 결과가 카드 한 장으로 나옵니다. 판마다 대진이 새로 섞입니다.</p>
          </div>
        </div>
      </section>

      <section className={`${s.section} ${s.grid2}`}>
        <div className={s.panel}>
          <h3 className={s.h3}>꼭 지켜 주세요</h3>
          <ul className={s.list}>
            <li>
              <b>로그인부터 하고 시작</b> — 로그인 전 선택이 섞인 판은 차트에서 빠집니다
            </li>
            <li>
              <b>한 판은 끝까지</b> — 48강부터 결승까지
            </li>
            <li>
              <b>대충 누르지 않기</b> — 마음 가는 쪽으로
            </li>
            <li>
              <b>한 대회는 하루 5판까지</b>
            </li>
            <li>
              <b>계정은 한 사람에 하나</b> — 다른 계정은 로그인 자체가 안 됩니다
            </li>
            <li>
              <b>휴대폰과 컴퓨터를 반반씩</b> — 휴대폰 사용감이 꼭 궁금해요
            </li>
          </ul>
        </div>
        <div className={s.panel}>
          <h3 className={s.h3}>비밀을 지켜 주세요</h3>
          <ul className={s.list}>
            <li>아직 공개 전입니다. 화면 · 크라운 카드 · 이 페이지를 SNS · 커뮤니티 · 단톡방에 올리지 말아 주세요</li>
            <li>함께하고 싶은 친구는 설문 마지막 칸에 추천해 주세요 — 2차 베타로 모십니다</li>
            <li>크라운 카드 [공유]는 어디로 가는지 확인만 해 주세요</li>
          </ul>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.survey}>
          <div className={s.surveyText}>
            <h3 className={s.h3Large}>설문 (5분 · 하나)</h3>
            <p className={s.subFlat}>
              도는 중간에 해도, 다 마친 뒤에 해도 됩니다. 낸 뒤에도 답을 고칠 수 있어요. 마지막 칸의 감상평이 저희에게 가장 귀합니다.
            </p>
          </div>
          <a href={SURVEY_URL} target="_blank" rel="noopener noreferrer" className={`${s.outline} ${s.outlineLarge}`}>
            설문 참여하기 →
          </a>
        </div>
      </section>

      <section className={`${s.section} ${s.sectionLast}`}>
        <h3 className={s.h3Tight}>문제가 생기면</h3>
        <p className={s.subFlatGap}>
          아래 네 가지를 <b className={s.strong}>이 초대 링크를 받은 카카오톡 대화방</b>에 바로 보내 주세요. 사진 한 장이 긴 설명보다
          훨씬 도움이 됩니다.
        </p>
        <div className={s.pills}>
          <span className={s.pill}>① 화면 캡처</span>
          <span className={s.pill}>② 언제 (날짜 · 시각)</span>
          <span className={s.pill}>③ 어디서 (휴대폰/컴퓨터 · 크롬/사파리)</span>
          <span className={s.pill}>④ 무엇을 하다가 어떻게 됐는지</span>
        </div>
      </section>

      <footer className={s.footer}>
        <p className={s.footerLine}>
          WHO RULES THE WORLD? <span className={s.gold}>YOU DECIDE.</span>
        </p>
        <p className={s.footerNote}>감사합니다. 성실한 모습으로 보답하겠습니다. · worldcrown48.com</p>
      </footer>
    </main>
  );
}
