export function tagsForPost(tags: string[], date?: Date): string[] {
  const result = [...tags];
  if (date) {
    const year = date.getUTCFullYear().toString();
    if (!result.includes(year)) result.push(year);
  }
  return result;
}

export function isYear(tag: string) { return /^\d{4}$/.test(tag); }
export function tagSlug(tag: string) { return tag.toLowerCase().replace(/ /g, "-"); }
