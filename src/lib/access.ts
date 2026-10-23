export type OnlineRole = "staff" | "installer";
export function isInstaller(user: { onlineRole?: OnlineRole; role?: string } | null | undefined) {
  return user?.onlineRole === "installer" || user?.role === "시공자";
}
