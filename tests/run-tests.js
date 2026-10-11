#!/usr/bin/env node
/* Chain Memo 상설 테스트 — 푸시 전에 전부 PASS가 먼저 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
function ok(cond, name) { if (cond) { pass++; } else { fail++; console.log("FAIL:", name); } }

const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
ok(!html.includes("__APP_JS__") && !html.includes("__CHAIN_B64__"), "토큰 전부 치환됨");
ok(html.includes('localStorage') && html.includes("chainmemo-v1"), "저장 키 chainmemo-v1 존재");
ok(fs.existsSync(path.join(ROOT, "sw.js")), "sw.js 존재");
ok(html.includes("homeSummary") && html.includes("renderSummary"), "홈 전체 진도 요약 존재");
ok(html.includes("todayBtn") && html.includes("이어서 학습하기"), "체인 상세 이어서 학습하기 바로가기 존재");
ok(html.includes("stuckView") && html.includes("stuckList") && html.includes("막힌 줄 모아보기"), "막힌 줄 모아보기 화면 존재");
ok(html.includes("collectStuck") && html.includes("renderStuck") && html.includes("stuckEntry"), "막힌 줄 수집·렌더 로직 존재");
ok(html.includes("function judge(") && html.includes("거의 맞음") && html.includes("악센트만 확인"), "3단계 판정 judge·거의 맞음·악센트 표시 존재");
ok(html.includes("almost"), "거의 맞음 스타일·상태 존재");
ok(html.includes("ttsBar") && html.includes("ttsRates") && html.includes("ttsVoiceStatus"), "발음 속도 조절 바·음성 상태 표시 존재");
ok(html.includes("ttsNotice") && html.includes("음성이 이 기기에 없어서"), "언어 음성 없을 때 안내 존재");
ok(html.includes("TTS_RATES") && html.includes("pickVoiceFromList") && html.includes("getTtsRate"), "TTS 속도·음성 선택 로직 존재");
ok(html.includes("prefers-reduced-motion") && html.includes("scroll-behavior:auto"), "reduced-motion 대응 존재");
ok(html.includes(":focus-visible") && html.includes("outline:3px solid"), "키보드 focus 표시 존재");
ok(html.includes(".chip{") && html.includes("min-height:44px"), "칩 터치 영역 44px 이상");
ok(html.includes(".tbtn{") && html.includes("min-height:44px"), "작은 버튼 터치 영역 44px 이상");
ok(html.includes('aria-pressed') && html.includes('aria-live="polite"') && html.includes("문장 입력"), "aria 상태·라이브 영역·입력 라벨 존재");
ok(html.includes("--sub:#59544a") && html.includes("prefers-contrast"), "본문 보조 텍스트 대비 강화·고대비 대응 존재");
ok(html.includes("touch-action:manipulation") && html.includes("safe-area-inset-bottom"), "모바일 터치·세이프에어리어 대응 존재");

// judge 기능 테스트 (JUDGE_START~END 순수 함수 블록 추출)
const scriptForJudge = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const block = scriptForJudge.match(/\/\*JUDGE_START\*\/([\s\S]*?)\/\*JUDGE_END\*\//);
ok(!!block, "JUDGE 블록 존재");
if (block) {
  const api = new Function(block[1] + "; return {judge};")();
  const J = api.judge;
  ok(J("I work as a cook.", "I work as a cook.").tier === "ok", "judge: 정확 입력 정답");
  ok(J("I work as a cook in a restaurant.", "I work as cook in a restaurant.").tier === "almost", "judge: 관사 누락 거의 맞음");
  ok(J("Je vois le train.", "Je vois la train.").tier === "almost", "judge: 관사 교체 거의 맞음");
  ok(J("We stayed in a guesthouse near the beach.", "We stayed in a guesthous near the beach.").tier === "almost", "judge: 철자 1자 오타 거의 맞음");
  ok(J("I like coffee in the morning.", "I like tea in the morning.").tier === "stuck", "judge: 단어 교체는 막힘");
  const acc = J("Je vais à la gare.", "Je vais a la gare.");
  ok(acc.tier === "ok" && acc.detail && acc.detail.kind === "accent", "judge: 악센트만 다르면 정답+악센트 표시");
  ok(J("Bonjour, je voudrais un café.", "").tier === "stuck", "judge: 빈 입력은 막힘");
  const sp = J("We stayed in a guesthouse near the beach.", "We stayed in a guesthous near the beach.");
  ok(sp.detail && sp.detail.pos === 5 && /guesthouse/.test(sp.detail.word), "judge: 거의 맞음은 다른 단어 위치·원형만 표시");
}

// TTS 순수 함수 테스트 (TTS_START~END 블록 추출 — DOM 의존 함수는 제외하고 상수·순수 함수만 평가)
const ttsBlockM = scriptForJudge.match(/\/\*TTS_START\*\/([\s\S]*?)\/\*TTS_END\*\//);
ok(!!ttsBlockM, "TTS 블록 존재");
if (ttsBlockM) {
  const pureSrc = ttsBlockM[1].split("let ttsVoices")[0];
  const storeStub = "const store={settings:{}}; function save(){};";
  const tapi = new Function(storeStub + pureSrc + "; return {pickVoiceFromList, clampRate, getTtsRate, setTtsRate, voiceStatusFromList, ttsLangTag};")();
  const VS = [
    { lang: "en-US", name: "Samantha" },
    { lang: "fr-CA", name: "Amelie" },
    { lang: "ko-KR", name: "Yuna" }
  ];
  ok(tapi.pickVoiceFromList(VS, "en").lang === "en-US", "TTS: 정확한 en-US 음성 선택");
  ok(tapi.pickVoiceFromList(VS, "fr").lang === "fr-CA", "TTS: fr-FR 없으면 같은 언어 fr-CA로 폴백");
  ok(tapi.pickVoiceFromList([{ lang: "ko-KR", name: "Yuna" }], "fr") === null, "TTS: 해당 언어 음성 없으면 null");
  ok(tapi.pickVoiceFromList([], "en") === null, "TTS: 음성 목록 비면 null");
  const st = tapi.voiceStatusFromList(VS);
  ok(st.en === true && st.fr === true, "TTS: 음성 상태 en·fr 모두 있음 판정");
  const st2 = tapi.voiceStatusFromList([{ lang: "en-GB", name: "Daniel" }]);
  ok(st2.en === true && st2.fr === false, "TTS: 음성 상태 fr 없음 판정");
  ok(tapi.clampRate(0.75) === 0.75 && tapi.clampRate(1.05) === 1.05 && tapi.clampRate(9) === 0.92 && tapi.clampRate(undefined) === 0.92, "TTS: 속도 값은 3단계로만 제한, 기본 0.92");
  tapi.setTtsRate(0.75);
  ok(tapi.getTtsRate() === 0.75, "TTS: 설정한 속도 저장·복원");
  ok(tapi.ttsLangTag("fr") === "fr-FR" && tapi.ttsLangTag("en") === "en-US", "TTS: 언어 태그 매핑");
}

// 임베드 스크립트 문법 검사
const m = html.match(/<script>([\s\S]*?)<\/script>/);
ok(!!m, "스크립트 블록 존재");
let parseOk = true; try { new Function(m[1]); } catch (e) { parseOk = false; console.log("JS parse error:", e.message); }
ok(parseOk, "임베드 JS 문법 정상");

// 체인 데이터 디코딩·검증
const b64m = m[1].match(/const CHAIN_B64 = (\[.*?\]);/s);
ok(!!b64m, "CHAIN_B64 배열 존재");
const b64 = JSON.parse(b64m[1]);
const chains = b64.map(s => JSON.parse(Buffer.from(s, "base64").toString("utf8")));
ok(chains.length >= 10, `체인 10개 이상 (현재 ${chains.length})`);
const ids = new Set();
const BANNED = ["to sum up", "in a nutshell", "every coin has two sides"];
let totalLines = 0;
for (const c of chains) {
  ok(!ids.has(c.id), "id 중복 없음 " + c.id); ids.add(c.id);
  ok(["en", "fr"].includes(c.lang), c.id + " lang 유효");
  ok(["IELTS", "TEF", "OPIc"].includes(c.exam), c.id + " exam 유효");
  ok(["Speaking", "Writing", "Listening", "Reading"].includes(c.area), c.id + " area 유효");
  ok(c.lines.length >= 5, c.id + " 5줄 이상");
  totalLines += c.lines.length;
  c.lines.forEach((ln, i) => {
    ok(!!ln.t && !!ln.ko, `${c.id} ${i + 1}줄 t/ko 있음`);
    ok(!/\s{2,}/.test(ln.t), `${c.id} ${i + 1}줄 이중 공백 없음`);
  });
  if (c.lang === "en" && c.area === "Writing") {
    const all = c.lines.map(l => l.t.toLowerCase()).join(" ");
    BANNED.forEach(b => ok(!all.includes(b), `${c.id} 격식 부적합 표현 없음: ${b}`));
  }
  if (c.lang === "fr") {
    const accented = c.lines.filter(l => /[àâäéèêëîïôöùûüçœæ]/i.test(l.t)).length;
    ok(accented >= Math.ceil(c.lines.length / 2), `${c.id} 프랑스어 악센트 포함 줄 과반`);
  }
}
ok(totalLines >= 80, `전체 80줄 이상 (현재 ${totalLines})`);
// 언어·시험 커버리지
ok(chains.some(c => c.lang === "en") && chains.some(c => c.lang === "fr"), "영어·프랑스어 체인 모두 존재");
["IELTS", "TEF", "OPIc"].forEach(x => ok(chains.some(c => c.exam === x), x + " 체인 존재"));
["Speaking", "Writing", "Listening", "Reading"].forEach(x => ok(chains.some(c => c.area === x), x + " 영역 체인 존재"));

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
