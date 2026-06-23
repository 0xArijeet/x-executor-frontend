import { errorMessage } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectionsApi } from "@/lib/hub/api";
import { useState } from "react";

const XCHAT_PIN_PATTERN = /^\d{4,8}$/;

type ConnectionAdminPanelProps = {
  token: string;
  connectionId: string;
  onUpdated: () => void;
  onError: (message: string | null) => void;
};

export function ConnectionAdminPanel({
  token,
  connectionId,
  onUpdated,
  onError,
}: ConnectionAdminPanelProps) {
  const [authToken, setAuthToken] = useState("");
  const [xchatPin, setXchatPin] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [validatingToken, setValidatingToken] = useState(false);
  const [validatingPin, setValidatingPin] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const [pinSaved, setPinSaved] = useState(false);
  const [tokenValidationMessage, setTokenValidationMessage] = useState<string | null>(null);
  const [pinValidationMessage, setPinValidationMessage] = useState<string | null>(null);

  async function handleSaveAuthToken() {
    const value = authToken.trim();
    if (!value) return;
    onError(null);
    setSavingToken(true);
    try {
      await connectionsApi.setAuthToken(token, connectionId, value);
      setAuthToken("");
      setTokenSaved(true);
      setPinSaved(false);
      setTokenValidationMessage(null);
      onUpdated();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSavingToken(false);
    }
  }

  async function handleValidateAuthToken() {
    onError(null);
    setValidatingToken(true);
    setTokenValidationMessage(null);
    try {
      const result = await connectionsApi.validateAuthToken(
        token,
        connectionId,
        authToken.trim() || undefined,
      );
      if (result.valid) {
        setTokenValidationMessage("Auth token is valid.");
        if (authToken.trim()) {
          setAuthToken("");
          setTokenSaved(true);
        }
        onUpdated();
      } else {
        setTokenValidationMessage(result.error ?? "Auth token is invalid.");
      }
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setValidatingToken(false);
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
      await connectionsApi.setXchatPin(token, connectionId, xchatPin);
      setXchatPin("");
      setPinSaved(true);
      setTokenSaved(false);
      setPinValidationMessage(null);
      onUpdated();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setSavingPin(false);
    }
  }

  async function handleValidateXchatPin() {
    if (xchatPin && !XCHAT_PIN_PATTERN.test(xchatPin)) {
      onError("XChat PIN must be 4–8 digits.");
      return;
    }
    onError(null);
    setValidatingPin(true);
    setPinValidationMessage(null);
    try {
      const result = await connectionsApi.validateXchatPin(
        token,
        connectionId,
        xchatPin || undefined,
      );
      if (result.valid) {
        setPinValidationMessage("XChat PIN is valid.");
      } else {
        setPinValidationMessage(result.error ?? "XChat PIN is invalid.");
      }
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setValidatingPin(false);
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
              setTokenValidationMessage(null);
            }}
            className="max-w-md"
          />
          <Button size="sm" disabled={!authToken.trim() || savingToken} onClick={handleSaveAuthToken}>
            {savingToken ? "Saving…" : "Save auth token"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={validatingToken}
            onClick={handleValidateAuthToken}
          >
            {validatingToken ? "Validating…" : "Validate"}
          </Button>
        </div>
        {tokenSaved && (
          <p className="text-xs text-green-600 dark:text-green-500">Auth token saved. Badge updates after refresh.</p>
        )}
        {tokenValidationMessage && (
          <p
            className={`text-xs ${
              tokenValidationMessage.endsWith("valid.")
                ? "text-green-600 dark:text-green-500"
                : "text-destructive"
            }`}
          >
            {tokenValidationMessage}
          </p>
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
              setPinValidationMessage(null);
            }}
            className="max-w-[140px]"
          />
          <Button size="sm" disabled={!pinValid || savingPin} onClick={handleSaveXchatPin}>
            {savingPin ? "Saving…" : "Save XChat PIN"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={validatingPin || (Boolean(xchatPin) && !pinValid)}
            onClick={handleValidateXchatPin}
          >
            {validatingPin ? "Validating…" : "Validate"}
          </Button>
        </div>
        {pinSaved && (
          <p className="text-xs text-green-600 dark:text-green-500">XChat PIN saved. Encrypted on Hub; not kept in this browser.</p>
        )}
        {pinValidationMessage && (
          <p
            className={`text-xs ${
              pinValidationMessage.endsWith("valid.")
                ? "text-green-600 dark:text-green-500"
                : "text-destructive"
            }`}
          >
            {pinValidationMessage}
          </p>
        )}
      </div>
    </div>
  );
}
