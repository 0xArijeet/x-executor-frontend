import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { useMyOrganization } from "@/lib/auth/useMyOrganization";
import { cn } from "@/lib/utils";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";

export function AppShell() {
  const { user, logout } = useAuth();
  const { orgId } = useParams<{ orgId: string }>();
  const { org } = useMyOrganization();
  const homeOrgId = user?.orgId ?? org?.id;
  const homePath = homeOrgId ? `/orgs/${homeOrgId}` : "/orgs";
  const navOrgId = orgId ?? homeOrgId;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to={homePath} className="text-lg font-semibold tracking-tight">
              X Executor
            </Link>
            {navOrgId && (
              <nav className="flex gap-3 text-sm">
                <NavLink
                  to={`/orgs/${navOrgId}`}
                  end
                  className={({ isActive }) =>
                    cn("text-muted-foreground hover:text-foreground", isActive && "text-foreground font-medium")
                  }
                >
                  Connections
                </NavLink>
                <NavLink
                  to={`/orgs/${navOrgId}/chats`}
                  className={({ isActive }) =>
                    cn("text-muted-foreground hover:text-foreground", isActive && "text-foreground font-medium")
                  }
                >
                  Chats
                </NavLink>
                <NavLink
                  to={`/orgs/${navOrgId}/campaigns`}
                  className={({ isActive }) =>
                    cn("text-muted-foreground hover:text-foreground", isActive && "text-foreground font-medium")
                  }
                >
                  Campaigns
                </NavLink>
                <NavLink
                  to={`/orgs/${navOrgId}/invites`}
                  className={({ isActive }) =>
                    cn("text-muted-foreground hover:text-foreground", isActive && "text-foreground font-medium")
                  }
                >
                  Invites
                </NavLink>
                <NavLink
                  to={`/orgs/${navOrgId}/settings`}
                  className={({ isActive }) =>
                    cn("text-muted-foreground hover:text-foreground", isActive && "text-foreground font-medium")
                  }
                >
                  Settings
                </NavLink>
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && <span className="text-muted-foreground">{user.email}</span>}
            <Button variant="outline" size="sm" onClick={logout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function PublicShell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-lg px-4 py-3">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            X Executor
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
