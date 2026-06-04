import { Alert, AlertDescription } from "@/components/ui/alert";
import { HubApiError } from "@/lib/hub/client";

export function errorMessage(err: unknown): string {
  if (err instanceof HubApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function ErrorAlert({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
