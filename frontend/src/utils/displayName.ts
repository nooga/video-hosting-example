/** Auth0 subjects look like "auth0|…" or "google-oauth2|…". */
export function isAuthSubject(value: string): boolean {
  return value.includes("|");
}

/** OAuth provider numeric ids and other non-human labels. */
export function isOpaqueDisplayName(value: string): boolean {
  const v = value.trim();
  if (!v || v === "user" || v === "anonymous") return true;
  if (isAuthSubject(v)) return true;
  if (/^\d{6,}$/.test(v)) return true;
  return false;
}

export function displayUploaderName(video: {
  uploader_name?: string;
  uploaded_by: string;
}): string {
  if (video.uploader_name?.trim() && !isOpaqueDisplayName(video.uploader_name)) {
    return video.uploader_name.trim();
  }
  const by = video.uploaded_by?.trim();
  if (by && by !== "anonymous" && !isAuthSubject(by) && !isOpaqueDisplayName(by)) {
    return by;
  }
  return "Unknown user";
}

export function displayCommentAuthor(comment: {
  author_name?: string;
}): string {
  if (comment.author_name?.trim() && !isOpaqueDisplayName(comment.author_name)) {
    return comment.author_name.trim();
  }
  return "Unknown user";
}

export function auth0ProfileName(user?: {
  name?: string;
  nickname?: string;
  email?: string;
}): string | undefined {
  if (!user) return undefined;
  const candidates = [user.name, user.nickname, user.email?.split("@")[0], user.email];
  for (const c of candidates) {
    if (c?.trim() && !isOpaqueDisplayName(c)) return c.trim();
  }
  return undefined;
}
