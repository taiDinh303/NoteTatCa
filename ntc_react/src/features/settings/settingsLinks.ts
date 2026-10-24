export function settingsLinks(base: string) {
  const preferences = base.startsWith("/admin") ? "/admin/preferences" : base;
  return [
    [base + "/profile", "Profile"],
    [base + "/account", "Account & security"],
    [preferences + "/appearance", "Appearance"],
    [preferences + "/language", "Language"],
    [preferences + "/privacy", "Privacy"],
    [base + "/sessions", "Active sessions"],
  ];
}
