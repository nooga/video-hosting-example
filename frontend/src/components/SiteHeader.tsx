import React from "react";
import { Link } from "react-router-dom";
import { PlusIcon, MagnifyingGlassIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useAuth0 } from "@auth0/auth0-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

type SiteHeaderProps = {
  variant?: "home" | "detail";
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  showUpload?: boolean;
  onToggleUpload?: () => void;
};

const SiteHeader: React.FC<SiteHeaderProps> = ({
  variant = "home",
  searchQuery = "",
  onSearchChange,
  showUpload,
  onToggleUpload,
}) => {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const isHome = variant === "home";
  const maxWidth = isHome ? "max-w-7xl" : "max-w-6xl";

  return (
    <header className="site-header">
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8`}>
        <div className="relative flex items-center justify-between h-16 gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            {isHome ? (
              <Link to="/" className="flex-shrink-0">
                <Logo size={32} showWordmark wordmarkText="VideoHost" />
              </Link>
            ) : (
              <Link to="/" className="btn-ghost flex-shrink-0">
                <ArrowLeftIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Library</span>
              </Link>
            )}
          </div>

          {/* Center — search on home, logo on detail */}
          {isHome && onSearchChange ? (
            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-faint" />
                <input
                  type="text"
                  placeholder="Search your library…"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          ) : (
            <Link to="/" className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
              <Logo size={28} showWordmark wordmarkText="VideoHost" />
            </Link>
          )}

          {/* Right */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ThemeToggle />

            {isAuthenticated ? (
              <>
                {isHome && onToggleUpload && (
                  <button
                    onClick={onToggleUpload}
                    className={`btn-primary ${showUpload ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                    aria-pressed={showUpload}
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                )}
                <UserMenu />
              </>
            ) : (
              <button onClick={() => loginWithRedirect()} className="btn-primary">
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
