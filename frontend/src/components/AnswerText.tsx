import { Fragment } from "react";
import s from "./AnswerText.module.css";

/**
 * Renders the small subset of Markdown the model uses (bold, bullet and
 * numbered lists, headings) as React elements. No HTML is ever injected.
 * `[Source: …]` tags become compact citation chips.
 */

type Block =
  | { type: "p"; lines: string[] }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "h"; text: string };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,4}\s+(.*)$/;

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const last = blocks[blocks.length - 1];
    let m: RegExpMatchArray | null;

    if (!line.trim()) {
      blocks.push({ type: "p", lines: [] });
    } else if ((m = line.match(HEADING))) {
      blocks.push({ type: "h", text: m[1] });
    } else if ((m = line.match(BULLET)) || (m = line.match(NUMBERED))) {
      const type = BULLET.test(line) ? "ul" : "ol";
      if (last?.type === type) last.items.push(m[1]);
      else blocks.push({ type, items: [m[1]] });
    } else if (last?.type === "p") {
      last.lines.push(line);
    } else {
      blocks.push({ type: "p", lines: [line] });
    }
  }
  return blocks.filter((b) => b.type !== "p" || b.lines.length > 0);
}

