import Image from "next/image";
import { cx } from "@/lib/cx";
import markLight from "@/assets/brand/mark-light.png";
import markDark from "@/assets/brand/mark-dark.png";
import wordmarkLight from "@/assets/brand/wordmark-light.png";
import wordmarkDark from "@/assets/brand/wordmark-dark.png";
import logoLight from "@/assets/brand/logo-light.png";
import logoDark from "@/assets/brand/logo-dark.png";

/*
  Logo usage (DESIGN.md §5): the light version (navy wordmark, navy leaf) only on light surfaces;
  the dark version (all gold) on dark surfaces and on the navy/black chrome in BOTH themes.
  "auto" follows the theme. Minimum height 28px.
*/

type Surface = "chrome" | "auto" | "light" | "dark";
type Kind = "lockup" | "mark" | "stacked";

const sets = {
  mark: { light: markLight, dark: markDark },
  wordmark: { light: wordmarkLight, dark: wordmarkDark },
  stacked: { light: logoLight, dark: logoDark },
};

function Themed({ kind, surface, height, priority }: { kind: keyof typeof sets; surface: Surface; height: string; priority?: boolean }) {
  const set = sets[kind];
  const alt = "";
  if (surface === "chrome" || surface === "dark") {
    return <Image src={set.dark} alt={alt} className={cx("w-auto max-w-none", height)} priority={priority} unoptimized />;
  }
  if (surface === "light") {
    return <Image src={set.light} alt={alt} className={cx("w-auto max-w-none", height)} priority={priority} unoptimized />;
  }
  return (
    <>
      <Image src={set.light} alt={alt} className={cx("w-auto max-w-none dark:hidden", height)} priority={priority} unoptimized />
      <Image src={set.dark} alt={alt} className={cx("hidden w-auto max-w-none dark:block", height)} priority={priority} unoptimized />
    </>
  );
}

export function Logo({ kind = "lockup", surface = "auto", className, priority }: { kind?: Kind; surface?: Surface; className?: string; priority?: boolean }) {
  return (
    <span role="img" aria-label="Leaf Star" className={cx("inline-flex shrink-0 items-center gap-3", className)}>
      {kind === "stacked" ? (
        <Themed kind="stacked" surface={surface} height="h-24" priority={priority} />
      ) : (
        <>
          <Themed kind="mark" surface={surface} height="h-12" priority={priority} />
          {kind === "lockup" ? <Themed kind="wordmark" surface={surface} height="h-4" priority={priority} /> : null}
        </>
      )}
    </span>
  );
}
