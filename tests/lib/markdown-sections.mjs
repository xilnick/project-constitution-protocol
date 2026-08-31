// One document parser for every markdown assertion in the suite. A substring
// scan cannot tell `## Context` from `## Contextual`, from the same string in a
// paragraph, or from a copy inside a fenced template; all three are real defects.
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX = /^ {0,3}(#{1,6})(?:\s+(.*?))?\s*$/;
const CODE_SPAN = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g;

function stripTrailingHashes(text) {
  return text.replace(/\s+#+\s*$/, '');
}

function normalizeHeading(text) {
  // `## 1. INVOCATION CONTRACT` and `## INVOCATION CONTRACT` name the same section.
  return text.replace(/^\d+\.\s*/, '').trim().toLowerCase();
}

export function parseDoc(content) {
  // Line endings are not a property of the artifact; a CRLF checkout must parse.
  const text = content.replace(/\r\n/g, '\n');

  let frontmatter = null;
  let body = text;
  if (/^---\n/.test(text)) {
    const close = text.indexOf('\n---\n', 3);
    if (close > 3) {
      frontmatter = text.slice(4, close);
      body = text.slice(close + 5);
    }
  }

  // Fence and span line numbers are file-relative, so a failure message can be
  // pasted into an editor; the scanning loop below indexes the frontmatter-stripped body.
  const frontmatterLines = text.length === body.length
    ? 0
    : text.slice(0, text.length - body.length).split('\n').length - 1;

  const lines = body.split('\n');
  const headings = [];
  const fenceStrippedLines = [];
  const fences = [];
  const codeSpans = [];
  let openFence = null;

  lines.forEach((line, i) => {
    const fence = FENCE.exec(line);
    if (openFence) {
      // A closing fence is the same character, at least as long, and bare.
      if (fence && fence[1][0] === openFence.char && fence[1].length >= openFence.length && fence[2].trim() === '') {
        fences.push({
          index: fences.length,
          info: openFence.info,
          startLine: openFence.startLine,
          endLine: i + frontmatterLines + 1,
          body: openFence.body.join('\n'),
        });
        openFence = null;
      } else {
        openFence.body.push(line);
      }
      return;
    }
    if (fence) {
      openFence = {
        char: fence[1][0],
        length: fence[1].length,
        info: fence[2].trim().toLowerCase(),
        startLine: i + frontmatterLines + 1,
        body: [],
      };
      return;
    }
    fenceStrippedLines.push(line);
    for (const span of line.matchAll(CODE_SPAN)) {
      codeSpans.push({ line: i + frontmatterLines + 1, text: span[2].trim() });
    }
    const atx = ATX.exec(line);
    if (atx) {
      headings.push({
        level: atx[1].length,
        text: stripTrailingHashes(atx[2] ?? '').trim(),
        index: i,
      });
    }
  });

  // An unterminated fence still holds its lines; dropping it would hide a block.
  if (openFence) {
    fences.push({
      index: fences.length,
      info: openFence.info,
      startLine: openFence.startLine,
      endLine: lines.length + frontmatterLines,
      body: openFence.body.join('\n'),
    });
  }

  return {
    frontmatter,
    bodyLines: lines,
    fenceStripped: fenceStrippedLines.join('\n'),
    headings,
    fences,
    codeSpans,
  };
}

function bodyLinesAfter(doc, headingIndex) {
  const h = doc.headings[headingIndex];
  const next = doc.headings.find((o, i) => i > headingIndex && o.level <= h.level);
  const end = next ? next.index : doc.bodyLines.length;
  return doc.bodyLines.slice(h.index + 1, end);
}

function matchesSpec(h, spec) {
  const m = /^(#{1,6})\s+(.*)$/.exec(spec);
  const wantLevel = m ? m[1].length : null;
  const wantText = normalizeHeading(m ? m[2] : spec);
  if (wantLevel !== null && h.level !== wantLevel) return false;
  return normalizeHeading(h.text) === wantText;
}

// A bare `##` line satisfying a gate is the artifact-follows-gate move; require a body.
export function hasHeading(doc, spec) {
  return doc.headings.some((h, i) =>
    matchesSpec(h, spec) && bodyLinesAfter(doc, i).some((l) => l.trim() !== '')
  );
}

export function parseFrontmatter(doc) {
  if (doc.frontmatter === null) return null;
  const fields = {};
  for (const line of doc.frontmatter.split('\n')) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (m) fields[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return fields;
}
