interface ScreenPlaceholderProps {
  title: string;
}

/** Screen title only, until the screen's own spec (009 to 012) fills it in. */
export function ScreenPlaceholder({ title }: ScreenPlaceholderProps) {
  return <ScreenTitle>{title}</ScreenTitle>;
}

/** Page heading shared by every app screen: 22 px on mobile, 28 px from `md`. */
export function ScreenTitle({ children }: { children: string }) {
  return <h1 className="text-[22px] leading-tight font-bold tracking-[-0.01em] md:text-[28px]">{children}</h1>;
}
