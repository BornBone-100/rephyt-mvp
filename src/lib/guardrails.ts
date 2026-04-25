export type SubscriptionUser = {
  subscription_plan?: string | null;
  monthly_save_count?: number | null;
};

export type SaveLimitResult =
  | { allowed: true; remaining?: number }
  | {
      allowed: false;
      modalType: "UPGRADE_PRO";
      message: string;
    };

const FREE_MONTHLY_SAVE_CAP = 5;

/**
 * 무료 유저의 저장 횟수를 제한하고 Pro 전환을 유도합니다.
 * Pro가 아닌 플랜은 모두 월간 상한에 걸립니다.
 */
export function checkSaveLimit(user: SubscriptionUser): SaveLimitResult {
  if (user.subscription_plan === "pro") {
    return { allowed: true };
  }

  const count = user.monthly_save_count ?? 0;

  if (count >= FREE_MONTHLY_SAVE_CAP) {
    return {
      allowed: false,
      modalType: "UPGRADE_PRO",
      message:
        "정교한 임상 데이터를 무제한으로 관리하려면 Pro 플랜(₩5,900)으로 업그레이드하세요.",
    };
  }

  return { allowed: true, remaining: FREE_MONTHLY_SAVE_CAP - count };
}
