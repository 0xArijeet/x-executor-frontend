import { xSettingsApi } from "@/lib/hub/api";
import type { OrganizationWithRole } from "@/lib/hub/types";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";

export function useMyOrganization(): {
  org: OrganizationWithRole | null;
  loading: boolean;
} {
  const { token, user } = useAuth();
  const [org, setOrg] = useState<OrganizationWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user?.orgId) {
      setOrg(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    xSettingsApi
      .get(token)
      .then(settings =>
        setOrg({
          ...settings,
          id: settings.id || user.orgId,
          role: "owner",
        }),
      )
      .catch(() => setOrg(null))
      .finally(() => setLoading(false));
  }, [token, user?.orgId]);

  return { org, loading };
}
