'use client';

import React from 'react';
import {
  LATEX_SYMBOLS,
  normalizeLatexDelimiters,
  parseHtmlTable,
  readBracedGroup,
  readBracketGroup,
  readLatexArg,
  skipWs,
} from '@/lib/rich-text-parser';

function renderLatexExpr(expr: string, keyPrefix = 'm'): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < expr.length) {
    const ch = expr[i];

    // Escaped sequence or command
    if (ch === '\\') {
      const two = expr.slice(i, i + 2);
      if (two === '\\\\') {
        nodes.push(<br key={`${keyPrefix}-${k++}`} />);
        i += 2;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, two)) {
        nodes.push(<React.Fragment key={`${keyPrefix}-${k++}`}>{LATEX_SYMBOLS[two]}</React.Fragment>);
        i += 2;
        continue;
      }
      if (two === '\\ ') {
        nodes.push(<React.Fragment key={`${keyPrefix}-${k++}`}> </React.Fragment>);
        i += 2;
        continue;
      }
      const cmdMatch = /^\\[A-Za-z]+/.exec(expr.slice(i));
      if (cmdMatch) {
        const cmd = cmdMatch[0];
        i += cmd.length;

        if (cmd === '\\begin' || cmd === '\\end') {
          const gEnv = readBracedGroup(expr, skipWs(expr, i));
          if (gEnv) {
            i = gEnv.nextIdx;
          }
          continue;
        }

        if (cmd === '\\frac' || cmd === '\\dfrac' || cmd === '\\tfrac') {
          const g1 = readLatexArg(expr, i);
          if (g1) {
            const g2 = readLatexArg(expr, g1.nextIdx);
            if (g2) {
              nodes.push(
                <span
                  key={`${keyPrefix}-${k++}`}
                  className="inline-flex flex-col items-center align-middle mx-0.5 leading-tight text-[0.9em]"
                >
                  <span className="border-b border-current px-1 pb-0.5">
                    {renderLatexExpr(g1.content, `${keyPrefix}-fn-${k}`)}
                  </span>
                  <span className="px-1 pt-0.5">
                    {renderLatexExpr(g2.content, `${keyPrefix}-fd-${k}`)}
                  </span>
                </span>
              );
              i = g2.nextIdx;
              continue;
            }
          }
        }

        if (cmd === '\\sqrt') {
          const iOpt = skipWs(expr, i);
          const rootOrd = readBracketGroup(expr, iOpt);
          const bodyStart = skipWs(expr, rootOrd ? rootOrd.nextIdx : iOpt);
          const gBody = readBracedGroup(expr, bodyStart);
          if (gBody) {
            nodes.push(
              <span key={`${keyPrefix}-${k++}`} className="inline-flex items-baseline mx-0.5">
                {rootOrd && (
                  <sup className="text-[0.7em] mr-0.5">
                    {renderLatexExpr(rootOrd.content, `${keyPrefix}-sr-${k}`)}
                  </sup>
                )}
                <span>√</span>
                <span className="border-t border-current px-0.5">
                  {renderLatexExpr(gBody.content, `${keyPrefix}-sb-${k}`)}
                </span>
              </span>
            );
            i = gBody.nextIdx;
            continue;
          }
        }

        if (cmd === '\\text' || cmd === '\\mathrm' || cmd === '\\mathbf') {
          const gText = readBracedGroup(expr, skipWs(expr, i));
          if (gText) {
            nodes.push(
              <span key={`${keyPrefix}-${k++}`} className="font-sans">
                {gText.content}
              </span>
            );
            i = gText.nextIdx;
            continue;
          }
        }

        if (cmd === '\\overline' || cmd === '\\bar' || cmd === '\\vec') {
          const gOver = readBracedGroup(expr, skipWs(expr, i));
          if (gOver) {
            nodes.push(
              <span
                key={`${keyPrefix}-${k++}`}
                className={cmd === '\\vec' ? 'relative inline-block' : 'border-t border-current'}
              >
                {renderLatexExpr(gOver.content, `${keyPrefix}-ov-${k}`)}
              </span>
            );
            i = gOver.nextIdx;
            continue;
          }
        }

        if (cmd === '\\left' || cmd === '\\right') {
          continue;
        }

        if (cmd === '\\binom') {
          const g1 = readBracedGroup(expr, skipWs(expr, i));
          const g2 = g1 ? readBracedGroup(expr, skipWs(expr, g1.nextIdx)) : null;
          if (g1 && g2) {
            nodes.push(
              <span key={`${keyPrefix}-${k++}`} className="inline-flex items-center align-middle mx-0.5">
                <span className="text-[1.2em]">(</span>
                <span className="inline-flex flex-col items-center leading-tight text-[0.85em] px-0.5">
                  <span>{renderLatexExpr(g1.content, `${keyPrefix}-bn-${k}`)}</span>
                  <span>{renderLatexExpr(g2.content, `${keyPrefix}-bk-${k}`)}</span>
                </span>
                <span className="text-[1.2em]">)</span>
              </span>
            );
            i = g2.nextIdx;
            continue;
          }
        }

        if (Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, cmd)) {
          nodes.push(<React.Fragment key={`${keyPrefix}-${k++}`}>{LATEX_SYMBOLS[cmd]}</React.Fragment>);
          continue;
        }

        nodes.push(<React.Fragment key={`${keyPrefix}-${k++}`}>{cmd.slice(1)}</React.Fragment>);
        continue;
      }
      nodes.push(<React.Fragment key={`${keyPrefix}-${k++}`}>\</React.Fragment>);
      i++;
      continue;
    }

    // Superscript & subscript
    if (ch === '^' || ch === '_') {
      const isSup = ch === '^';
      const nextIdx = skipWs(expr, i + 1);
      if (expr.slice(nextIdx, nextIdx + 5) === '\\circ' && isSup) {
        nodes.push(<React.Fragment key={`${keyPrefix}-${k++}`}>°</React.Fragment>);
        i = nextIdx + 5;
        continue;
      }
      const gScript = readBracedGroup(expr, nextIdx);
      const inner = gScript ? gScript.content : expr[nextIdx] || '';
      const after = gScript ? gScript.nextIdx : nextIdx + 1;
      const rendered = renderLatexExpr(inner, `${keyPrefix}-sc-${k}`);
      nodes.push(
        isSup ? (
          <sup key={`${keyPrefix}-${k++}`} className="text-[0.75em] leading-none">
            {rendered}
          </sup>
        ) : (
          <sub key={`${keyPrefix}-${k++}`} className="text-[0.75em] leading-none">
            {rendered}
          </sub>
        )
      );
      i = after;
      continue;
    }

    // Alignment tab separator in aligned math
    if (ch === '&') {
      nodes.push(<React.Fragment key={`${keyPrefix}-${k++}`}> </React.Fragment>);
      i++;
      continue;
    }

    // Plain braced group
    if (ch === '{') {
      const g = readBracedGroup(expr, i);
      if (g) {
        nodes.push(
          <React.Fragment key={`${keyPrefix}-${k++}`}>
            {renderLatexExpr(g.content, `${keyPrefix}-bg-${k}`)}
          </React.Fragment>
        );
        i = g.nextIdx;
        continue;
      }
    }

    // Accumulate plain characters
    let end = i + 1;
    while (end < expr.length && !'\\^_{}&'.includes(expr[end])) {
      end++;
    }
    nodes.push(<React.Fragment key={`${keyPrefix}-${k++}`}>{expr.slice(i, end)}</React.Fragment>);
    i = end;
  }

  return nodes;
}

function renderInlineFormatted(text: string, keyPrefix = 'in'): React.ReactNode {
  // Split **bold** segments while handling math segments ($...$ / $$...$$) inside
  const tokenRe = /(\$\$[\s\S]+?\$\$|\$(?!\s)[^$\n]+?(?<!\s)\$|\*\*[^*\n]+?\*\*)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let idx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > last) {
      out.push(<React.Fragment key={`${keyPrefix}-t-${idx++}`}>{text.slice(last, match.index)}</React.Fragment>);
    }
    const tok = match[0];
    if (tok.startsWith('$$') && tok.endsWith('$$')) {
      const inner = tok.slice(2, -2).trim();
      out.push(
        <span
          key={`${keyPrefix}-m2-${idx++}`}
          className="inline-block font-mono font-semibold px-1 text-ink"
        >
          {renderLatexExpr(inner, `${keyPrefix}-e2-${idx}`)}
        </span>
      );
    } else if (tok.startsWith('$') && tok.endsWith('$')) {
      const inner = tok.slice(1, -1).trim();
      out.push(
        <span key={`${keyPrefix}-m1-${idx++}`} className="font-mono font-semibold text-ink">
          {renderLatexExpr(inner, `${keyPrefix}-e1-${idx}`)}
        </span>
      );
    } else if (tok.startsWith('**') && tok.endsWith('**')) {
      out.push(
        <strong key={`${keyPrefix}-b-${idx++}`} className="font-extrabold text-ink">
          {renderInlineFormatted(tok.slice(2, -2), `${keyPrefix}-bi-${idx}`)}
        </strong>
      );
    }
    last = match.index + tok.length;
  }

  if (last < text.length) {
    out.push(<React.Fragment key={`${keyPrefix}-tail`}>{text.slice(last)}</React.Fragment>);
  }
  return out.length > 0 ? out : text;
}

export function RichExamContent({
  text,
  inline = false,
  className = '',
}: {
  text?: string | null;
  inline?: boolean;
  className?: string;
}) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const normalizedText = normalizeLatexDelimiters(text);

  if (inline) {
    return <span className={className}>{renderInlineFormatted(normalizedText, 'in')}</span>;
  }

  // Split around HTML <table>...</table> and $$...$$ display math blocks
  const blockRe = /(<table\b[\s\S]*?<\/table>|\$\$[\s\S]+?\$\$)/gi;
  const segments = normalizedText.split(blockRe);

  return (
    <div className={`space-y-2 ${className}`}>
      {segments.map((seg, segIdx) => {
        const segTrim = seg.trim();
        if (!segTrim) return null;

        if (segTrim.toLowerCase().startsWith('<table')) {
          const rows = parseHtmlTable(segTrim);
          if (rows.length === 0) return null;
          return (
            <div key={`tbl-${segIdx}`} className="my-2 overflow-x-auto rounded-xl border border-line bg-panel">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr
                      key={`r-${rIdx}`}
                      className={
                        rIdx === 0
                          ? 'border-b border-line bg-bg2/90 font-bold'
                          : 'border-b border-line/60 last:border-b-0'
                      }
                    >
                      {row.map((cell, cIdx) =>
                        cell.isHeader || rIdx === 0 ? (
                          <th
                            key={`c-${cIdx}`}
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                            className="border-r border-line/60 last:border-r-0 px-3 py-2 font-extrabold text-ink whitespace-pre-line"
                          >
                            {renderInlineFormatted(cell.content, `tc-${segIdx}-${rIdx}-${cIdx}`)}
                          </th>
                        ) : (
                          <td
                            key={`c-${cIdx}`}
                            colSpan={cell.colSpan}
                            rowSpan={cell.rowSpan}
                            className="border-r border-line/60 last:border-r-0 px-3 py-2 text-ink whitespace-pre-line"
                          >
                            {renderInlineFormatted(cell.content, `tc-${segIdx}-${rIdx}-${cIdx}`)}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (segTrim.startsWith('$$') && segTrim.endsWith('$$')) {
          const expr = segTrim.slice(2, -2).trim();
          return (
            <div
              key={`dm-${segIdx}`}
              className="my-2 overflow-x-auto rounded-xl border border-line/70 bg-bg2/60 px-3.5 py-2.5 font-mono text-sm sm:text-base font-semibold text-ink"
            >
              {renderLatexExpr(expr, `dm-${segIdx}`)}
            </div>
          );
        }

        // Render Markdown headings & clean paragraphs/lines
        const lines = seg.split('\n');
        return (
          <div key={`p-${segIdx}`} className="space-y-1 whitespace-pre-line">
            {lines.map((line, lIdx) => {
              const lTrim = line.trim();
              if (/^#{1,3}\s+/.test(lTrim)) {
                const headingText = lTrim.replace(/^#{1,3}\s+/, '');
                return (
                  <p key={`l-${lIdx}`} className="font-extrabold text-ink">
                    {renderInlineFormatted(headingText, `hd-${segIdx}-${lIdx}`)}
                  </p>
                );
              }
              if (/^\*\s+/.test(lTrim)) {
                const itemText = lTrim.replace(/^\*\s+/, '');
                return (
                  <p key={`l-${lIdx}`} className="pl-3">
                    <span className="mr-1.5 text-brand font-bold">•</span>
                    {renderInlineFormatted(itemText, `li-${segIdx}-${lIdx}`)}
                  </p>
                );
              }
              return (
                <React.Fragment key={`l-${lIdx}`}>
                  {renderInlineFormatted(line, `tx-${segIdx}-${lIdx}`)}
                  {lIdx < lines.length - 1 ? '\n' : null}
                </React.Fragment>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
