const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Optimistic inserts generate the row id in the browser so the item keeps a
// stable key and can be edited/deleted before the server round-trip finishes.
export function clientId(formData: FormData): string | undefined {
  const id = formData.get("id");
  return typeof id === "string" && UUID_RE.test(id) ? id : undefined;
}
