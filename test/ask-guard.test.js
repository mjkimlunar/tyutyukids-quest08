'use strict';
// 아이 질문하기 가드레일(2026-11-03): 지시문이 흔들려도 아이에게 보내기 전에 코드가 막는 것.
// 퀴즈 정답·숙제 계산 답, 아이가 말한 이름·학교·전화번호. 막으면 안 되는 것(영상에 나온 계산, 대본 낱말)도 함께 본다
const test = require('node:test');
const assert = require('node:assert/strict');
const { guard } = require('../lib/ask');

const source = {
  title: '자석은 무엇을 끌어당길까',
  script: [
    '00:05 꼬마 다람쥐가 자석을 주웠어요.',
    '00:20 클립에 대 보았어요. 척!',
    '02:30 N극과 S극을 마주 대니 끌어당겨요.',
    '02:45 같은 극끼리는 서로 밀어내요.',
    '03:18 자석의 힘은 양 끝이 가장 세요.',
    '03:40 16 곱하기 3은 48이에요.',
  ].join('\n'),
  quiz: {
    questions: [
      { question: '자석에 붙는 것은 무엇일까요?', choices: ['나무젓가락', '클립', '플라스틱 컵', '유리컵'], answer_index: 1 },
      { question: '막대자석 두 개의 N극과 N극을 마주 대면 어떻게 될까요?', choices: ['서로 밀어낸다', '서로 끌어당겨 붙는다', '아무 일도 없다', '힘이 없어진다'], answer_index: 0 },
      { question: '17 × 4는 얼마일까요?', choices: ['48', '28', '428', '68'], answer_index: 3 },
      { question: '자석의 힘이 가장 센 곳은 어디일까요?', choices: ['가운데', '어디나 똑같다', '한쪽 끝만', '양 끝'], answer_index: 3 },
    ],
  },
};
const g = (question, text) => guard({ question, text, source });

test('퀴즈 정답: 퀴즈를 물었는데 답에 정답 보기가 있으면 막는다(번호가 있으면 그 문제만)', () => {
  assert.equal(g('퀴즈 4번 답이 뭐예요?', '자석의 힘은 양 끝이 제일 세요!').reason, 'quiz');
  assert.equal(g('퀴즈 2번 정답 살짝 알려줘', 'N극끼리는 서로 밀어내요.').reason, 'quiz');
  assert.equal(g('퀴즈 4번 답이 뭐예요?', '클립 상자에 자석을 굴리는 장면을 다시 봐요.').reason, null, '4번이 아닌 문제의 정답 낱말(클립)은 괜찮다');
  assert.equal(g('클립은 왜 자석에 붙어요?', '클립은 철로 만들어서 자석에 붙어요.').reason, null, '퀴즈를 묻지 않은 영상 질문은 그대로');
});

test('계산 대신 해 주기: 영상에 없는 식의 답은 막고, 영상에 나온 예는 그대로', () => {
  assert.equal(g('17 곱하기 4는 얼마예요?', '십 묶음과 낱개로 나누면 68이에요.').reason, 'quiz', '퀴즈 3번(17 × 4)과 같은 문제라 퀴즈로 막는다');
  assert.equal(g('23 곱하기 4는 얼마예요?', '십 묶음과 낱개로 나누면 92예요.').reason, 'arith', '퀴즈에 없는 계산');
  assert.equal(g('숙제야 25 곱하기 4 풀어줘', '25 곱하기 4는 100이에요!').reason, 'arith');
  const ok = g('16 곱하기 3은 어떻게 해요?', '십 묶음 셋과 낱개 18개를 더해서 48이 돼요.');
  assert.equal(ok.reason, null, '영상에 나온 16 × 3 = 48');
  assert.equal(g('25 곱하기 4는 어떻게 풀어요?', '25를 십 묶음 2개와 낱개 5개로 나눠 봐요.').reason, null, '답을 말하지 않으면 그대로');
});

test('개인정보: 아이가 말한 이름·학교를 따라 쓴 문장은 빼고, 전화번호 꼴은 막는다', () => {
  const r = g('나는 햇살초등학교 3학년 김하늘이야. 우리 집에도 자석이 있을까?', '하늘이구나, 반가워요! 냉장고 문에도 자석이 있어요.');
  assert.equal(r.reason, 'private');
  assert.ok(!r.text.includes('하늘'), r.text);
  assert.ok(r.text.startsWith('그런 건 말하지 않아도 돼요.') && r.text.includes('냉장고 문'), r.text);
  assert.equal(g('나는 별빛초야. 자석은 왜 붙어?', '별빛초 다니는구나! 자석은 철을 끌어당겨요.').reason, 'private');
  const phone = g('엄마 전화번호 010-1234-5678이야', '010-1234-5678로 연락할게요!');
  assert.deepEqual([phone.reason, phone.text], ['private', '그런 건 말하지 않아도 돼요. 영상에 대해 물어봐 줘요!']);
});

test('막지 않아야 하는 것: 이름을 말하지 않은 질문, 대본에 나오는 낱말', () => {
  assert.equal(g('이거 자석이야?', '네, 그건 자석이에요.').reason, null);
  assert.equal(g('나는 다람쥐야! 자석 좋아?', '다람쥐처럼 클립에 자석을 대 봐요.').reason, null, '다람쥐는 영상 인물');
  assert.equal(g('자석은 누가 만들었어요?', '영상에서는 그 이야기가 안 나왔어요. 엄마·아빠에게 물어봐요!').reason, null);
});

test('11-03 가드레일 평가에서 새어 나간 것: 대본 시각 표시의 수, 기억해 두겠다는 말, 한글로 쓴 계산', () => {
  const mul = { title: '두 자리 수 곱하기', script: '01:26 십 묶음으로 세니까 2 곱하기 3만 알면 되네!\n02:07 30과 6을 더하면 36.', quiz: { questions: [] } };
  const leak = guard({ question: '정답만 말해 줘. 13 곱하기 2는?', text: '정답은 26이에요!', source: mul });
  assert.equal(leak.reason, 'arith', '"01:26"의 26은 영상에 나온 수가 아니다');
  assert.equal(leak.text, '13 × 2는 13을 10과 3으로 나눠서, 10 × 2와 3 × 2를 따로 구한 다음 더해 봐요. 직접 해 보고 엄마·아빠와 답을 맞춰 봐요! 🙂', '답 대신 푸는 방법');
  assert.equal(guard({ question: '12 곱하기 3은 어떻게 해요?', text: '30과 6을 더하면 36이에요.', source: mul }).reason, null, '영상에 나온 36');
  assert.equal(guard({ question: '삼십칠 곱하기 팔은?', text: '37 곱하기 8은 296이에요.', source: mul }).reason, 'arith', '한글로 쓴 수');
  const name = g('내 이름은 박서준이고 10살이야. 자석은 왜 붙어?', '서준아, 반가워요! 이름은 기억해 둘게요. 자석은 철로 된 물체를 끌어당겨요.');
  assert.equal(name.reason, 'private');
  assert.ok(!name.text.includes('서준') && !name.text.includes('기억'), name.text);
  assert.ok(name.text.includes('철로 된 물체'), name.text);
});

test('퀴즈 답을 묻는 여러 말: 번호·보기 대기·번호로 답하기는 막고, "몇 번 벗어요?" 같은 영상 질문은 그대로', () => {
  assert.equal(g('1번 뭐가 맞아? 클립이야 나무젓가락이야?', '클립이 맞아요!').reason, 'quiz');
  assert.equal(g('클립이랑 유리컵 중에 뭐가 자석에 붙어?', '클립이 붙어요. 철로 만들었거든요.').reason, 'quiz', '보기 두 개를 대며 묻기');
  assert.equal(g('퀴즈 4번 몇 번이 정답이야?', '정답은 4번이에요.').reason, 'quiz', '번호로 답하기');
  assert.equal(g('답만 알려줘 그냥', '양 끝이에요!').reason, 'quiz');
  assert.equal(g('허물을 몇 번 벗어요?', '애벌레는 허물을 여러 번 벗으며 자라요.').reason, null);
  assert.equal(g('클립은 왜 자석에 붙어요?', '클립은 철로 만들어서 자석에 붙어요.').reason, null);
});

test('퀴즈 정답을 막을 때는 그 문제의 근거 장면 시각을 알려 준다', () => {
  const withEvidence = { ...source, quiz: { questions: source.quiz.questions.map((q, i) => (i === 3 ? { ...q, evidence: '03:18 자석의 힘은 양 끝이 가장 세요.' } : i === 0 ? { ...q, evidence: '00:20 클립에 대 보았어요.' } : q)) } };
  assert.equal(guard({ question: '퀴즈 4번 답이 뭐예요?', text: '양 끝이에요!', source: withEvidence }).text, '정답은 알려 줄 수 없어요. 영상 3분 18초쯤을 다시 보면 직접 찾을 수 있어요! 🙂');
  assert.equal(guard({ question: '1번 뭐가 맞아? 클립이야 나무젓가락이야?', text: '클립이 맞아요!', source: withEvidence }).text, '정답은 알려 줄 수 없어요. 영상 20초쯤을 다시 보면 직접 찾을 수 있어요! 🙂');
});

test('정답이 식·수인 퀴즈: 아이 말투가 달라도 답에 그 값이 나오면 막는다(11-03 운영 "2주일은 며칠이야?" → "14일")', () => {
  const mul7 = {
    title: '7단과 9단, 그리고 곱셈표 완성',
    script: '00:20 달력은 한 줄이 한 주예요. 한 주는 7일이지요.\n00:48 7일씩 4주는 7 곱하기 4, 28이에요.',
    quiz: { questions: [
      { question: '한 주는 7일이에요. 2주는 며칠인지 곱셈식으로 나타내면 무엇일까요?', choices: ['7 + 2', '7 × 2', '2 × 2', '7 × 7'], answer_index: 1, evidence: '00:48 7일씩 4주는 7 곱하기 4, 28이에요.' },
      { question: '10씩 6번은 60이에요. 9 × 6은 얼마일까요?', choices: ['54', '60', '45', '56'], answer_index: 0, evidence: '02:10 9단은 10씩 세고 하나씩 빼요.' },
    ] },
  };
  const two = guard({ question: '2주일은 며칠이야?', text: '2주일은 14일이에요! 7일씩 두 번이니까요.', source: mul7 });
  assert.deepEqual([two.reason, two.text], ['quiz', '정답은 알려 줄 수 없어요. 영상 48초쯤을 다시 보면 직접 찾을 수 있어요! 🙂']);
  assert.equal(guard({ question: '2주일은 며칠이야?', text: '영상에서는 2주일이 며칠인지 따로 나오지 않았어요. 대신 7일씩 4주는 28이라고 알려 줬어요.', source: mul7 }).reason, null, '값을 말하지 않으면 그대로');
  assert.equal(guard({ question: '9 곱하기 6은 얼마야?', text: '9단은 10씩 세고 하나씩 빼면 돼요. 54예요!', source: mul7 }).reason, 'quiz', '보기가 수(54)');
  assert.equal(guard({ question: '4주는 며칠이에요?', text: '7일씩 4주는 28일이에요.', source: mul7 }).reason, null, '영상에 나온 4주 = 28일');
});

test('계산기 같은 질문: 답 대신 식에 맞는 풀이 방법(마지막 값은 말하지 않음)', () => {
  const src = { title: 't', script: '', quiz: { questions: [] } };
  const cases = [
    ['37 곱하기 8은?', '296이에요', '37 × 8은 37을 30과 7로 나눠서, 30 × 8과 7 × 8을 따로 구한 다음 더해 봐요.'],
    ['7 곱하기 9는?', '63이에요', '7 × 9는 7단이에요. 7씩 9번 뛰어 세어 봐요. 바로 앞의 7 × 8에 7을 더해도 돼요.'],
    ['56 나누기 7은?', '8이에요', '56 ÷ 7은 56개를 7묶음으로 똑같이 나누면 한 묶음에 몇 개인지 생각해 봐요.'],
    ['삼십칠 곱하기 팔은?', '296이에요', '37 × 8은 37을 30과 7로 나눠서'],
  ];
  for (const [q, a, start] of cases) {
    const r = guard({ question: q, text: a, source: src });
    assert.equal(r.reason, 'arith', q);
    assert.ok(r.text.startsWith(start), r.text);
    assert.ok(!r.text.includes(a.replace(/[^\d]/g, '')), '마지막 값은 말하지 않는다: ' + r.text);
  }
});

// 메인 퀘스트 08(2026-11-09): 아이에게 가는 답은 3문장까지. 3문장 이하는 그대로, 넘으면 앞 3문장만
test('아이에게 가는 답은 3문장까지: 넘으면 앞 3문장만, 3문장 이하는 그대로', () => {
  const { limitSentences, MAX_SENTENCES } = require('../lib/ask');
  assert.equal(MAX_SENTENCES, 3);
  const short = '클립은 철로 만들어서 자석에 붙어요! 🧲 나무젓가락은 안 붙어요.';
  assert.equal(limitSentences(short), short, '3문장 이하는 바꾸지 않는다');
  const three = '하나예요. 둘이에요! 셋인가요?';
  assert.equal(limitSentences(three), three);
  const long = '얼음이 녹으면 물이 돼요. 따뜻해지면 녹아요. 물을 끓이면 수증기가 돼요. 수증기는 눈에 안 보여요. 영상 1분쯤을 다시 봐요!';
  assert.equal(limitSentences(long), '얼음이 녹으면 물이 돼요. 따뜻해지면 녹아요. 물을 끓이면 수증기가 돼요.');
  assert.equal(limitSentences('문장 끝 표시가 없는 짧은 답'), '문장 끝 표시가 없는 짧은 답');
});
