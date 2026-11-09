# 튜튜키즈 — 로그와 피드백으로 🤖 아이 AI 질문하기 개선

모두의연구소 「AI 서비스 인 프로덕션」 메인 퀘스트 08 제출물. **결과는 [REPORT.md](REPORT.md)**.

튜튜키즈는 부모가 승인한 YouTube 영상만 아이에게 보여 주는 가족용 앱이다(서비스 저장소는 비공개). 이 저장소에는 이번에 고친 부분과 실험·확인에 쓴 코드만 옮겼다. 대화 결과 파일과 키는 넣지 않았다.

| 경로 | 내용 |
|---|---|
| `lib/ask.js` | 아이 AI 질문하기(Claude Haiku 5.5). 이번 변경: `limitSentences()` — 가드레일을 거친 답을 앞 3문장까지 |
| `test/ask-guard.test.js` | 가드레일·3문장 자르기 단위 시험 |
| `tools/ask-eval.mjs`, `tools/ask-eval/dataset-length.json` | Langfuse 데이터셋 실험(문제 13 + 정상 10, 코드 채점 + Claude Sonnet 심사). `RESULTS.md`는 앞 노드(11)의 실패한 지시문 실험 기록 |
| `scripts/quest08-send.mjs` | 배포된 앱에 아이 말투 질문을 보내는 스크립트(`BASE`=앱 주소, `P`=테스트 가족 PIN을 환경 변수로) |
| `scripts/quest08-versions.mjs` | Langfuse 트레이스를 version(Cloud Run 리비전)으로 나눠 3문장 넘은 답·지연·비용 세기 |
| `scripts/count-over3.mjs` | 평가 기록에서 질문별로 3문장 넘은 횟수 세기 |

서비스 전체가 있어야 돌아간다(`lib/ask.js`는 `@anthropic-ai/sdk`, 실험 도구는 영상 자료 `tools/ask-eval/sources/`와 Langfuse 키가 필요).
