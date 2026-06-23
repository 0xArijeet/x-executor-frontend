type ConnectionAvatarProps = {
  userName: string;
  displayName?: string;
  profilePictureUrl?: string;
  size?: "sm" | "md";
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
} as const;

export function ConnectionAvatar({
  userName,
  displayName,
  profilePictureUrl,
  size = "md",
}: ConnectionAvatarProps) {
  const label = displayName?.trim() || userName;
  const sizeClass = sizeClasses[size];

  if (profilePictureUrl) {
    return (
      <img
        src={profilePictureUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full object-cover bg-muted`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-muted font-medium uppercase`}
      aria-hidden
    >
      {label.slice(0, 1)}
    </div>
  );
}
