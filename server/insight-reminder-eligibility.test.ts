import { describe, expect, it } from "vitest";

import { filterMissingInsightUsers } from "./db";

describe("filterMissingInsightUsers", () => {
  it("excludes read-only users and users who already submitted", () => {
    const result = filterMissingInsightUsers(
      [
        {
          id: 1,
          name: "田中 太郎",
          openId: "lark:ou_writer",
          isInsightReminderExcluded: false,
        },
        {
          id: 2,
          name: "外間 守威",
          openId: "lark:ou_readonly_1",
          isInsightReminderExcluded: true,
        },
        {
          id: 3,
          name: "川口 凌",
          openId: "lark:ou_readonly_2",
          isInsightReminderExcluded: true,
        },
        {
          id: 4,
          name: "佐藤 花子",
          openId: "lark:ou_submitted",
          isInsightReminderExcluded: false,
        },
      ],
      new Set([4]),
    );

    expect(result).toEqual([
      { id: 1, name: "田中 太郎", openId: "lark:ou_writer" },
    ]);
  });
});
