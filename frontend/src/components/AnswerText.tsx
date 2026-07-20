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

/** Bold (**x**), [Source: …] tags and leading [ ] / [x] checkboxes inside a line. */
function inline(text: string): React.ReactNode {
  const box = text.match(/^\[( |x|X)\]\s+/);
  if (box) {
    return (
      <>
        <span className={s.check} data-done={box[1].toLowerCase() === "x" || undefined} aria-hidden="true" />
        {inline(text.slice(box[0].length))}
      </>
    );
  }
  const parts = text.split(/(\*\*[^*]+\*\*|\[Source:[^\]]+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("[Source:")) {
      return (
        <span key={i} className={s.cite}>
          {part.slice(8, -1).trim()}
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function AnswerText({ text }: { text: string }) {
  return (
    <div className={s.answer}>
      {toBlocks(text).map((block, i) => {
        if (block.type === "h") return <h4 key={i}>{inline(block.text)}</h4>;
        if ("items" in block) {
          const List = block.type;
          return (
            <List key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
