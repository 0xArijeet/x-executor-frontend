import { ErrorAlert, errorMessage } from "@/components/ErrorAlert";
import { CampaignCreateForm } from "@/components/CampaignCreateForm";
import { CampaignLaunchChecklist } from "@/components/CampaignLaunchChecklist";
import { useAuth } from "@/lib/auth/AuthContext";
import { connectionsApi } from "@/lib/hub/api";
import type { Connection } from "@/lib/hub/types";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export function CampaignCreatePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    connectionsApi
      .list(token)
      .then(setConnections)
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [token, orgId]);

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New campaign</h1>
        <p className="text-muted-foreground">
          Send one message to many X users. Sends are spread across connected accounts with automatic pacing.
        </p>
      </div>

      <ErrorAlert error={error} />

      <div className="mb-6">
        <CampaignLaunchChecklist connections={connections} />
      </div>

      {token && orgId && (
        <CampaignCreateForm
          token={token}
          connections={connections}
          onCreated={campaignId => navigate(`/orgs/${orgId}/campaigns/${campaignId}`)}
        />
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <Link to={`/orgs/${orgId}/campaigns`} className="text-primary underline">
          All campaigns
        </Link>
        {" · "}
        <Link to={`/orgs/${orgId}`} className="text-primary underline">
          Back to connections
        </Link>
      </p>
    </div>
  );
}
