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
ok(html.includes("todayBtn") && html.includes("오늘의 단계로 바로 가기"), "체인 상세 오늘의 단계 바로가기 존재");

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
