// MyCourses publishes class cancellations and make-up classes as calendar "due" items,
// titled like "[Cancel]-691_ITDS211" or "[Make-up]-691_ITDS262". They belong on the
// calendar, not the homework list.
const CLASS_CHANGE_RE = /^\s*\[(cancel(?:led)?|make[\s-]?up)\]\s*-?\s*/i;

export function classChangeKind(title: string): "cancel" | "makeup" | null {
  const m = title.match(CLASS_CHANGE_RE);
  if (!m) return null;
  return m[1].toLowerCase().startsWith("cancel") ? "cancel" : "makeup";
}

/** "[Cancel]-691_ITDS211" → "691_ITDS211" */
export function classChangeCourse(title: string) {
  return title.replace(CLASS_CHANGE_RE, "").trim() || title;
}
