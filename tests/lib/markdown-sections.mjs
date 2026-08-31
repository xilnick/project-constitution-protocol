// One document parser for every markdown assertion in the suite. A substring
// scan cannot tell `## Context` from `## Contextual`, from the same string in a
// paragraph, or from a copy inside a fenced template; all three are real defects.
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const ATX = /^ {0,3}(#{1,6})(?:\s+(.*?))?\s*$/;

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

  const lines = body.split('\n');
  const headings = [];
  const fenceStrippedLines = [];
  let openFence = null;

  lines.forEach((line, i) => {
    const fence = FENCE.exec(line);
    if (openFence) {
      // A closing fence is the same character, at least as long, and bare.
      if (fence && fence[1][0] === openFence.char && fence[1].length >= openFence.length && fence[2].trim() === '') {
        openFence = null;
      }
      return;
    }
    if (fence) {
      openFence = { char: fence[1][0], length: fence[1].length };
      return;
    }
    fenceStrippedLines.push(line);
    const atx = ATX.exec(line);
    if (atx) {
      headings.push({
        level: atx[1].length,
        text: stripTrailingHashes(atx[2] ?? '').trim(),
        index: i,
      });
    }
  });

  return {
    frontmatter,
    bodyLines: lines,
    fenceStripped: fenceStrippedLines.join('\n'),
    headings,
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
