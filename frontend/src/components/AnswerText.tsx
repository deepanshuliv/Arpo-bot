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

