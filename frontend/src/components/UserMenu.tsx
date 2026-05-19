import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useAuth0 } from "@auth0/auth0-react";
import { auth0ProfileName } from "../utils/displayName";

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth0();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = auth0ProfileName(user) || "Account";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (!user) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-theme hover:bg-theme-hover transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            className="h-8 w-8 rounded-full object-cover ring-2 ring-accent/30"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-accent-muted flex items-center justify-center text-sm font-semibold text-accent">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-ink max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-ink-faint transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl border border-theme bg-theme-elevated shadow-card py-1 z-50 animate-fade-in"
        >
          <div className="px-4 py-3 border-b border-theme">
            <p className="text-sm font-semibold text-ink truncate">{displayName}</p>
            {user.email && (
              <p className="text-xs text-ink-faint truncate mt-0.5">{user.email}</p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              logout({ logoutParams: { returnTo: window.location.origin } })
            }
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-theme-hover transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
