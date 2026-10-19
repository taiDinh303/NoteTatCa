import { describe, expect, it } from "vitest";
import { homePath, isAdministrator, settingsPath } from "./access";

describe("account area routing", () => {
  it("gives Admin precedence over User and custom roles", () => {
    for (const roles of [["Admin"], ["User", "Admin"], ["Admin", "Reviewer"]]) {
      expect(isAdministrator({ roles })).toBe(true);
      expect(homePath({ roles })).toBe("/admin/overview");
      expect(settingsPath({ roles })).toBe("/admin/settings");
    }
  });
  it("keeps non-admin accounts in the customer area", () => {
    for (const identity of [
      undefined,
      { roles: ["User"] },
      { roles: ["Reviewer"] },
    ]) {
      expect(isAdministrator(identity)).toBe(false);
      expect(homePath(identity)).toBe("/notes");
      expect(settingsPath(identity)).toBe("/settings");
    }
  });
});
