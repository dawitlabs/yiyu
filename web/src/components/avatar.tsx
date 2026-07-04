const SIZE_CLASSES = {
  sm: "h-6 w-6 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

export function Avatar({
  src,
  name,
  size = "md",
}: {
  src: string;
  name: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      // biome-ignore lint/performance/noImgElement: avatar_url is an arbitrary external/user-uploaded host, next/image's remotePatterns can't allowlist unknown hosts
      <img
        src={src}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-black/10 font-medium text-black/60 dark:bg-white/10 dark:text-white/60`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
