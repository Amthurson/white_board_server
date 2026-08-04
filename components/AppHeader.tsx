import Link from "next/link";
import { signOutCurrentUser } from "@/app/actions";

type AppHeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

function getInitial(user: AppHeaderProps["user"]) {
  return (user.name || user.email || "U").trim().charAt(0).toUpperCase();
}

export default function AppHeader({
  user,
  leading,
  actions,
  children,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        {leading || (
          <Link className="brand-link" href="/">
            团队白板
          </Link>
        )}
        {children}
      </div>

      <div className="app-header-right">
        {actions}
        <details className="user-menu">
          <summary aria-label="用户菜单">
            {user.image ? (
              <img
                alt={user.name || user.email || "用户头像"}
                className="user-avatar"
                src={user.image}
              />
            ) : (
              <span className="user-avatar user-avatar-fallback">
                {getInitial(user)}
              </span>
            )}
          </summary>
          <div className="user-menu-panel">
            <div className="user-menu-info">
              <strong>{user.name || "未命名用户"}</strong>
              <span>{user.email}</span>
            </div>
            <form action={signOutCurrentUser}>
              <button type="submit">退出登录 / 切换账号</button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
