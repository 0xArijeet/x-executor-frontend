import { errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectionsApi } from "@/lib/hub/api";
import { useState } from "react";

const XCHAT_PIN_PATTERN = /^\d{4,8}$/;

type ConnectionAdminPanelProps = {
  token: string;
  orgId: string;
  connectionId: string;
  onUpdated: () => void;
  onError: (message: string | null) => void;
};

export function ConnectionAdminPanel({
  token,
  orgId,
  connectionId,
  onUpdated,
  onError,
}: ConnectionAdminPanelProps) {
  const [authToken, setAuthToken] = useState("");
  const [xchatPin, setXchatPin] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);

  async function handleSaveAuthToken() {
    const value = authToken.trim();
    if (!value) return;
    onError(null);
    setSavingToken(true);
    try {
      await connectionsApi.setAuthToken(token, orgId, connectionId, value);
      setAuthToken("");
      setTokenSaved(true);
      setPinSaved(false);
      onUpdated();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSavingToken(false);
    }
  }

  async function handleSaveXchatPin() {
    if (!XCHAT_PIN_PATTERN.test(xchatPin)) {
      onError("XChat PIN must be 4–8 digits.");
      return;
    }
    onError(null);
    setSavingPin(true);
    try {
      await connectionsApi.setXchatPin(token, orgId, connectionId, xchatPin);
      setXchatPin("");
      setPinSaved(true);
      setTokenSaved(false);
      onUpdated();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSavingPin(false);
    }
  }

  const pinValid = XCHAT_PIN_PATTERN.test(xchatPin);

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-3">
      <div className="space-y-2">
        <Label htmlFor={`auth-token-${connectionId}`}>Auth token</Label>
        <p className="text-xs text-muted-foreground">
          Browser <code className="text-xs">auth_token</code> cookie from X — used for outbound DMs and legacy
          (non-XChat) messages.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            id={`auth-token-${connectionId}`}
            type="password"
            autoComplete="off"
            placeholder="Paste auth_token once"
            value={authToken}
            onChange={e => {
              setAuthToken(e.target.value);
              setTokenSaved(false);
            }}
            className="max-w-md"
          />
          <Button size="sm" disabled={!authToken.trim() || savingToken} onClick={handleSaveAuthToken}>
            {savingToken ? "Saving…" : "Save auth token"}
          </Button>
        </div>
        {tokenSaved && (
          <p className="text-xs text-green-600 dark:text-green-500">Auth token saved. Badge updates after refresh.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`xchat-pin-${connectionId}`}>XChat PIN</Label>
        <p className="text-xs text-muted-foreground">
          Same 4–8 digit PIN the account holder uses to unlock X Chat at x.com/messages. Required to decrypt
          encrypted inbound XChat DMs.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            id={`xchat-pin-${connectionId}`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4–8 digits"
            maxLength={8}
            value={xchatPin}
            onChange={e => {
              setXchatPin(e.target.value.replace(/\D/g, ""));
              setPinSaved(false);
            }}
            className="max-w-[140px]"
          />
          <Button size="sm" disabled={!pinValid || savingPin} onClick={handleSaveXchatPin}>
            {savingPin ? "Saving…" : "Save XChat PIN"}
          </Button>
        </div>
        {pinSaved && (
          <p className="text-xs text-green-600 dark:text-green-500">XChat PIN saved. Encrypted on Hub; not kept in this browser.</p>
        )}
      </div>
    </div>
  );
}
