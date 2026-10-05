/** Joins truthy class names. */
export const cx = (
  ...classNames: Array<string | false | null | undefined>
): string | undefined => {
  const joined = classNames.filter(Boolean).join(" ");
  return joined.length ? joined : undefined;
};
