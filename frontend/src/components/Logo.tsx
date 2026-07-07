type LogoProps = {
  size?: number;
  className?: string;
};

// Four-pointed star centred on (20, 20); `r` is the tip radius, `w` the waist.
function star(r: number, w: number) {
  const c = 20;
  return `M${c} ${c - r} L${c + w} ${c - w} L${c + r} ${c} L${c + w} ${c + w} L${c} ${c + r} L${c - w} ${c + w} L${c - r} ${c} L${c - w} ${c - w} Z`;
}

