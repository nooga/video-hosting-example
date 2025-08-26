import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

interface CommentItem {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface CommentsProps {
  initialComments?: CommentItem[];
}

const Comments: React.FC<CommentsProps> = ({ initialComments = [] }) => {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const { isAuthenticated, loginWithRedirect, user } = useAuth0();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;
    // For now, locally append. Backend integration later.
    const newComment: CommentItem = {
      id: Math.random().toString(36).slice(2),
      author: user?.name || user?.email || "you",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setComments([newComment, ...comments]);
    setText("");
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1">
            <textarea
              value={text}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                if (!text.trim()) setFocused(false);
              }}
              onChange={(e) => setText(e.target.value)}
              onInput={(e) => {
                const ta = e.currentTarget as HTMLTextAreaElement;
                ta.style.height = "auto";
                ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (isAuthenticated) {
                    handleSubmit();
                  } else {
                    loginWithRedirect();
                  }
                }
              }}
              rows={1}
              placeholder="Add a comment..."
              className="w-full resize-none min-h-10 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {(focused || text.trim()) && (
              <div className="mt-2 flex justify-end gap-2">
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
                      Comment
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
          <p className="text-sm text-gray-500">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">
                <span className="font-medium text-gray-900">{c.author}</span>
                <span className="mx-1">•</span>
                <span>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
