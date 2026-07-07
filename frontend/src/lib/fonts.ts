import { Mukta } from "next/font/google";

// Mukta (Ek Type) covers Latin and Devanagari in one family, so Hindi and
// English share the same voice.
export const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--f-mukta",
  display: "swap",
});
