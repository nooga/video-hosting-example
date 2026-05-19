import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { VideoAPI } from "../services/api";
import { auth0ProfileName, displayCommentAuthor } from "../utils/displayName";

interface CommentItem {
  id: string;
  author: string;
  avatar?: string;
  content: string;
  createdAt: string;
  status?: string;
  reason?: string;
}

interface CommentsProps {
  initialComments?: CommentItem[];
  videoId?: string;
}

const Comments: React.FC<CommentsProps> = ({
  initialComments = [],
  videoId,
}) => {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const { isAuthenticated, loginWithRedirect, user } = useAuth0();

  const mapComments = (items: Awaited<ReturnType<typeof VideoAPI.listComments>>["comments"]) =>
    items.map((c) => ({
      id: c.id,
      author: displayCommentAuthor(c),
      avatar: c.author_avatar,
      content: c.content,
      createdAt: c.created_at,
      status: c.status,
      reason: c.reason,
    }));

  const loadComments = async () => {
    if (!videoId) return;
    try {
      const res = await VideoAPI.listComments(videoId, 1, 50);
      setComments(mapComments(res.comments));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadComments();
  }, [videoId, isAuthenticated]);

  useEffect(() => {
    if (!videoId || !comments.some((c) => c.status === "pending")) return;
    const interval = window.setInterval(loadComments, 3000);
    return () => window.clearInterval(interval);
  }, [videoId, comments]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !videoId) return;
    try {
      const profileName = auth0ProfileName(user);
      const created = await VideoAPI.createComment(
        videoId,
        text.trim(),
        profileName,
        user?.picture
      );
      const newComment: CommentItem = {
        id: created.id,
        author: created.author_name?.trim() || profileName || "Unknown user",
        avatar: created.author_avatar || user?.picture,
        content: created.content,
        createdAt: created.created_at,
        status: created.status,
      };
      setComments([newComment, ...comments]);
      setText("");
    } catch {
      // ignore
    }
  };

  return (
    <div className="card-glass p-6">
      <h3 className="font-display font-semibold text-lg text-ink mb-5">
        Comments
        {comments.length > 0 && (
          <span className="ml-2 text-sm font-normal text-ink-faint">
            {comments.length}
          </span>
        )}
      </h3>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-overlay ring-2 ring-white/10 flex-shrink-0 overflow-hidden">
            {user?.picture ? (
              <img
                src={user.picture}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-accent-muted" />
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={text}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                if (!text.trim()) setFocused(false);
              }}
              onChange={(e) => setText(e.target.value)}
              onInput={(e) => {
                const ta = e.currentTarget;
                ta.style.height = "auto";
                ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (isAuthenticated) handleSubmit();
                  else loginWithRedirect();
                }
              }}
              rows={1}
              placeholder="Add a comment…"
              className="input-field resize-none min-h-[44px] rounded-2xl"
            />
            {(focused || text.trim()) && (
              <div className="mt-3 flex justify-end gap-2">
                {!isAuthenticated ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => loginWithRedirect()}
                  >
                    Sign in to comment
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setText("");
                        setFocused(false);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!text.trim()}
                    >
                      Post
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </form>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-ink-faint py-4 text-center">
            No comments yet — start the conversation.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="flex gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
            >
              <div className="h-8 w-8 rounded-full bg-surface-overlay ring-1 ring-white/10 flex-shrink-0 overflow-hidden">
                {c.avatar ? (
                  <img src={c.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-accent-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm mb-1">
                  <span className="font-semibold text-ink">{c.author}</span>
                  <span className="text-ink-faint">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                  {c.status === "pending" && (
                    <span className="badge-processing">Pending</span>
                  )}
                  {c.status === "rejected" && (
                    <span className="badge-failed">Rejected</span>
                  )}
                  {c.status === "error" && (
                    <span className="badge-failed">Moderation error</span>
                  )}
                </div>
                <p className="text-ink-muted whitespace-pre-wrap text-sm leading-relaxed">
                  {c.content}
                </p>
                {c.status === "rejected" && c.reason && (
                  <p className="text-xs text-red-400/90 mt-2">{c.reason}</p>
                )}
                {c.status === "error" && c.reason && (
                  <p className="text-xs text-ink-faint mt-2">{c.reason}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
