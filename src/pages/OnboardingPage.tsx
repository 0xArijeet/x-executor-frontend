import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/AuthContext";
import { onboardingApi } from "@/lib/hub/api";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_STEPS = 5;

const ROLE_OPTIONS = [
  "Founder / business owner",
  "Marketer / growth",
  "Sales / BD",
  "Recruiter",
  "Developer / Indie Hacker",
  "Creator / Influencer",
  "Agency / Freelancer",
  "Student",
  "Other",
];

const GOAL_OPTIONS = [
  "Lead generation",
  "Sales outreach",
  "Recruiting / Hiring",
  "Community growth",
  "Partnerships / BD",
  "Other",
];

const TEAM_SIZE_OPTIONS = ["Just me", "2–10", "11–50", "51–200", "200+"];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-0.5 flex-1 rounded-full transition-colors",
            i < step ? "bg-white" : "bg-white/25",
          )}
        />
      ))}
    </div>
  );
}

function ChipButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
        selected
          ? "bg-violet-600 border-violet-600 text-white"
          : "bg-transparent border-white/20 text-white/70 hover:border-white/40 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

export function OnboardingPage() {
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userGoal, setUserGoal] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function canAdvance() {
    if (step === 1) return name.trim().length > 0;
    return true;
  }

  async function advance() {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
      return;
    }
    // Last step — submit
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await onboardingApi.complete(token, {
        workspaceName: name.trim(),
        website: website.trim() || undefined,
        teamSize: teamSize || undefined,
        userRole: userRole || undefined,
        userGoal: userGoal || undefined,
      });
      await refreshUser();
      navigate("/orgs", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <p className="text-white/50 text-sm mb-3">
          Question {step} of {TOTAL_STEPS}
        </p>
        <ProgressBar step={step} />

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                What should we call your workspace?
              </h1>
              <p className="text-white/50 text-sm">
                Give your workspace a name. You can always change it later from your workspace settings.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-white font-medium">
                Name<span className="text-red-400">*</span>
              </Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Acme"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/30"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter" && canAdvance()) advance(); }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Your website link</h1>
              <p className="text-white/50 text-sm">
                Add your website so Noah can better understand your business and personalize your AI agents. You can always add it later.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-white font-medium">Website URL</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔒</span>
                <Input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourcompany.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/30 pl-8"
                  type="url"
                  autoFocus
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">What best describes you?</h1>
              <p className="text-white/50 text-sm">
                We'll tailor your Noah experience based on your role and recommend the most relevant workflows.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map(role => (
                <ChipButton
                  key={role}
                  selected={userRole === role}
                  onClick={() => setUserRole(prev => prev === role ? "" : role)}
                >
                  {role}
                </ChipButton>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">What are you trying to do?</h1>
              <p className="text-white/50 text-sm">
                Choose your primary goal so we can recommend the most relevant workflows, automations, and templates.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map(goal => (
                <ChipButton
                  key={goal}
                  selected={userGoal === goal}
                  onClick={() => setUserGoal(prev => prev === goal ? "" : goal)}
                >
                  {goal}
                </ChipButton>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">How many people are on your team?</h1>
              <p className="text-white/50 text-sm">
                Your team size helps us personalize your workspace and recommend features that best fit how you work.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TEAM_SIZE_OPTIONS.map(size => (
                <ChipButton
                  key={size}
                  selected={teamSize === size}
                  onClick={() => setTeamSize(prev => prev === size ? "" : size)}
                >
                  {size}
                </ChipButton>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 mt-10">
          {step > 1 && step < TOTAL_STEPS && (
            <Button
              variant="ghost"
              className="text-white/50 hover:text-white hover:bg-white/5"
              onClick={advance}
              disabled={busy}
            >
              Skip
            </Button>
          )}
          <Button
            onClick={advance}
            disabled={!canAdvance() || busy}
            className={cn(
              "rounded-full px-6 font-semibold transition-colors",
              canAdvance() && !busy
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/10 text-white/30 cursor-not-allowed",
            )}
          >
            {step === TOTAL_STEPS ? (busy ? "Setting up…" : "Finish →") : "Continue →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
