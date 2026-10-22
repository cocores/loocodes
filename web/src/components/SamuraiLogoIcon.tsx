/** Outline-only mark for the samurAI credit on the About screen — deliberately
 * monochrome (stroke="currentColor", no fill) so it always matches whatever
 * text color it's placed next to, rather than carrying its own brand color. */
export function SamuraiLogoIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2 L12 9" />
      <path d="M11 8 C 8 8, 4.5 6, 3.5 2.5" />
      <path d="M13 8 C 16 8, 19.5 6, 20.5 2.5" />
      <path d="M5 13 C 5 8.5, 8 6, 12 6 C 16 6, 19 8.5, 19 13" />
      <path d="M5 12.5 C 3 13, 1.8 15.3, 2.5 17.5 C 4 16.5, 5.3 15.8, 6.5 15.5" />
      <path d="M19 12.5 C 21 13, 22.2 15.3, 21.5 17.5 C 20 16.5, 18.7 15.8, 17.5 15.5" />
      <path d="M7 14 L7.5 17.5 C 8 20, 10 21.5, 12 21.5 C 14 21.5, 16 20, 16.5 17.5 L17 14" />
      <path d="M12 15 L12 20" />
      <path d="M9.3 17.3 L14.7 17.3" />
    </svg>
  );
}
