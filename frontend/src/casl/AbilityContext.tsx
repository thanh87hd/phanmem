/**
 * CASL React bindings for the application's `AppAbility`.
 *
 * `@casl/react` v7 only exports `Can`, `AbilityProvider` and `useAbility` — the
 * `createContextualCan` factory this module used was removed after v5 (TS2305). This module
 * keeps the same public surface (`AbilityContext`, `Can`) and implements `Can` on top of
 * `useContext`, so existing `AbilityContext.Provider` trees keep working without needing
 * CASL's own `AbilityProvider` context.
 *
 * Usage:
 *   const ability = buildAbilityForUser(currentUser);
 *   <AbilityContext.Provider value={ability}>
 *     <Can do="create" on="AuditFinding">…</Can>
 *     <Can I="read" a="AuditEngagement">…</Can>
 *     <Can do="update" on="AuditFinding" not>…rendered only when NOT allowed…</Can>
 *     <Can do="delete" on="AuditFinding">{({ isAllowed }) => <Button disabled={!isAllowed} />}</Can>
 *   </AbilityContext.Provider>
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { Actions, AppAbility, Subjects } from './ability';

/** Holds the current `AppAbility`; `null` while no provider is mounted (checks then deny). */
export const AbilityContext = createContext<AppAbility | null>(null);

export interface CanExposes {
  isAllowed: boolean;
  ability: AppAbility | null;
  reason: string | undefined;
}

export interface CanProps {
  /** Action to check, e.g. `'create'`. Alias: `I`. */
  do?: Actions;
  /** Subject to check, e.g. `'AuditFinding'`. Aliases: `a`, `an`. */
  on?: Subjects;
  I?: Actions;
  a?: Subjects;
  an?: Subjects;
  field?: string;
  /** Invert the check — renders `children` when the action is NOT allowed. */
  not?: boolean;
  /** Render `children` even when the check fails. */
  passThrough?: boolean;
  children: ReactNode | ((exposes: CanExposes) => ReactNode);
}

/**
 * Renders `children` only when the current ability allows `do`/`I` on `on`/`a`/`an`.
 * Mirrors `@casl/react`'s `Can` semantics (inverted rules deny, `reason` is forwarded).
 */
export function Can({
  do: doAction,
  on,
  I,
  a,
  an,
  field,
  not = false,
  passThrough = false,
  children,
}: CanProps): ReactNode {
  const ability = useContext(AbilityContext);

  const action = doAction ?? I;
  const subject = on ?? a ?? an;

  let isAllowed = false;
  let reason: string | undefined;

  if (ability && action && subject) {
    const rule = ability.relevantRuleFor(action, subject, field);
    isAllowed = Boolean(rule) && !rule?.inverted;
    reason = rule?.reason;
  }

  if (not) {
    isAllowed = !isAllowed;
  }

  const content =
    typeof children === 'function' ? children({ isAllowed, ability, reason }) : children;

  return passThrough || isAllowed ? content : null;
}
