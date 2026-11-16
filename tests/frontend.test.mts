import './register-ts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const {
  isImageUrlString,
  normalizeLatexDelimiters,
  parseHtmlTable,
  readBracedGroup,
  readBracketGroup,
  readLatexArg,
} = await import('../src/lib/rich-text-parser.ts');
const { buildSubTopicsCatalog } = await import('../src/lib/topic-catalog.ts');
const { SUBJECTS } = await import('../src/lib/constants.ts');
const { getStore } = await import('../src/lib/server-db.ts');
const { RichExamContent } = await import('../src/components/RichExamContent.tsx');

test('rich-text-parser: isImageUrlString detects SVGs, local images, external URLs vs normal text', () => {
  assert.equal(isImageUrlString('/question-svgs/abc123.svg'), true);
  assert.equal(isImageUrlString('  /question-images/foo.png  '), true);
  assert.equal(isImageUrlString('https://example.com/diagram.webp'), true);
  assert.equal(isImageUrlString('http://cdn.test.com/fig.jpg'), true);
  assert.equal(isImageUrlString('/qimg/set/q1.png'), true);
  assert.equal(isImageUrlString('/simg/bucket/q2.jpg'), true);

  assert.equal(isImageUrlString('เลือกข้อที่ถูกต้องที่สุด'), false);
  assert.equal(isImageUrlString('$\\frac{1}{2}$'), false);
  assert.equal(isImageUrlString('/question-svgs/bad.txt'), false);
  assert.equal(isImageUrlString(''), false);
  assert.equal(isImageUrlString(null), false);
});

test('rich-text-parser: readBracedGroup, readBracketGroup, and readLatexArg handle nesting and escapes', () => {
  const nested = '{1 + \\frac{a}{b} + \\{x\\}} tail';
  const res = readBracedGroup(nested, 0);
  assert.ok(res);
  assert.equal(res.content, '1 + \\frac{a}{b} + \\{x\\}');
  assert.equal(nested.slice(res.nextIdx), ' tail');

  const brk = '[3]x';
  const brkRes = readBracketGroup(brk, 0);
  assert.deepEqual(brkRes, { content: '3', nextIdx: 3 });

  const unbraced = '\\frac12';
  const arg1 = readLatexArg(unbraced, 5);
  assert.deepEqual(arg1, { content: '1', nextIdx: 6 });
  const arg2 = readLatexArg(unbraced, arg1.nextIdx);
  assert.deepEqual(arg2, { content: '2', nextIdx: 7 });

  const cmdArg = '\\frac \\pi 2';
  const cmd1 = readLatexArg(cmdArg, 5);
  assert.deepEqual(cmd1, { content: '\\pi', nextIdx: 9 });
});

test('rich-text-parser: parseHtmlTable preserves colSpan, rowSpan, <br>, <sup>/<sub>, and entities', () => {
  const html = `
    <table>
      <tr>
        <th colspan="2">ข้อมูล&nbsp;A &amp; B</th>
        <th rowspan="2">ค่า x<sup>2</sup> + y<sub>1</sub></th>
      </tr>
      <tr>
        <td>&lt;10&gt;<br/>บรรทัด&nbsp;2</td>
        <td>"ปกติ" &amp; &#39;ดี&#39;<script>alert(1)</script></td>
      </tr>
    </table>
  `;

  const rows = parseHtmlTable(html);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].length, 2);
  assert.equal(rows[0][0].isHeader, true);
  assert.equal(rows[0][0].colSpan, 2);
  assert.equal(rows[0][0].content, 'ข้อมูล A & B');
  assert.equal(rows[0][1].rowSpan, 2);
  assert.equal(rows[0][1].content, 'ค่า x$^{2}$ + y$_{1}$');

  assert.equal(rows[1][0].isHeader, false);
  assert.equal(rows[1][0].content, '<10>\nบรรทัด 2');
  assert.equal(rows[1][1].content, '"ปกติ" & \'ดี\'alert(1)');
});

test('rich-text-parser: normalizeLatexDelimiters converts \\(...\\) and \\[...\\]', () => {
  const raw = String.raw`จงหาค่าของ \( \frac{1}{2} + x \) จากสมการ \[ a^2 + b^2 = c^2 \]`;
  const normalized = normalizeLatexDelimiters(raw);
  assert.equal(normalized, 'จงหาค่าของ $\\frac{1}{2} + x$ จากสมการ $$a^2 + b^2 = c^2$$');
});

test('RichExamContent component renders LaTeX fractions, delimiters & HTML tables cleanly', () => {
  const markup = renderToStaticMarkup(
    React.createElement(RichExamContent, {
      text: String.raw`ผลลัพธ์ \(\frac12\)<table><tr><th colspan="2">A &amp; B</th></tr><tr><td>x<sup>2</sup></td><td>H<sub>2</sub>O</td></tr></table>\[y = \sqrt[3]{8}\]`,
    })
  );

  assert.ok(markup.includes('<table'), 'Should render table element');
  assert.ok(markup.includes('colSpan="2"') || markup.includes('colspan="2"'), 'Should preserve colspan');
  assert.ok(markup.includes('A &amp; B'), 'Should escape decoded ampersand safely');
  assert.ok(markup.includes('<sup'), 'Should render <sup> for exponent');
  assert.ok(markup.includes('<sub'), 'Should render <sub> for subscript');
  assert.ok(markup.includes('border-b border-current'), 'Should render stacked fraction');
  assert.ok(markup.includes('√'), 'Should render nth-root radical');
});

test('topic-catalog: buildSubTopicsCatalog groups all questions across 7 subjects with friendly labels', () => {
  const store = getStore();
  const { topicsBySubject, subjectTotals, totalTopicCards } = buildSubTopicsCatalog(store.questions);

  assert.equal(Object.keys(topicsBySubject).length, SUBJECTS.length);

  let totalSum = 0;
  let cardCountSum = 0;
  for (const s of SUBJECTS) {
    assert.ok(subjectTotals[s.key] > 0, `Subject ${s.key} should have questions`);
    totalSum += subjectTotals[s.key];

    const list = topicsBySubject[s.key];
    assert.ok(list.length > 0, `Subject ${s.key} should have sub-topic cards`);
    cardCountSum += list.length;

    let subTopicQuestionSum = 0;
    for (const item of list) {
      assert.equal(item.subjectKey, s.key);
      assert.ok(item.category.length > 0);
      assert.ok(item.description.length > 0);
      assert.ok(item.rawTitles.length >= 1);
      assert.ok(item.count >= 1);
      assert.equal(item.questionIds.length, item.count, `questionIds length should equal count in ${item.title}`);
      subTopicQuestionSum += item.count;
    }
    assert.equal(
      subTopicQuestionSum,
      subjectTotals[s.key],
      `Topic counts in ${s.key} must match subject total`
    );
  }

  assert.equal(totalSum, store.questions.length);
  assert.ok(totalSum >= 7038);
  assert.equal(totalTopicCards, cardCountSum);

  const comTopics = topicsBySubject.com;
  const wordCard = comTopics.find((t) => t.title === 'Word');
  const excelCard = comTopics.find((t) => t.title === 'Excel');
  const pptCard = comTopics.find((t) => t.title === 'Powerpoint');
  assert.equal(wordCard?.displayTitle, 'Microsoft Word (การจัดการเอกสาร)');
  assert.equal(excelCard?.displayTitle, 'Microsoft Excel (สูตรและตารางคำนวณ)');
  assert.equal(pptCard?.displayTitle, 'Microsoft PowerPoint (การนำเสนอ)');
});
