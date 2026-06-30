import { ceFetch } from "./client";
import type {
  ContentProfile,
  TrendsResponse,
  CustomTrendsResponse,
  ProductTrendsResponse,
  TrendTopicGroup,
  CoachResult,
  GenerateResponse,
  SuggestAnglesResponse,
  AngleType,
  DraftsListResponse,
  TweetsListResponse,
  ContentDraft,
  FollowedAccount,
} from "./types";

// --- Profile ---
export const profileApi = {
  get(orgId: string) {
    return ceFetch<ContentProfile>(`/${orgId}/profile`);
  },
  upsert(orgId: string, data: Partial<ContentProfile>) {
    return ceFetch<ContentProfile>(`/${orgId}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  addToneTweet(orgId: string, text: string) {
    return ceFetch<ContentProfile>(`/${orgId}/profile/tone-tweets`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
  removeToneTweet(orgId: string, tweetId: string) {
    return ceFetch<ContentProfile>(`/${orgId}/profile/tone-tweets/${tweetId}`, {
      method: "DELETE",
    });
  },
};

// --- Trends ---
export const trendsApi = {
  topicOptions() {
    return ceFetch<{ groups: TrendTopicGroup[] }>("/trends/topic-options");
  },
  getIndustry(orgId: string, refresh = false) {
    const q = refresh ? "?refresh=true" : "";
    return ceFetch<TrendsResponse>(`/${orgId}/trends${q}`);
  },
  getCustom(orgId: string, refresh = false) {
    const q = refresh ? "?refresh=true" : "";
    return ceFetch<CustomTrendsResponse>(`/${orgId}/trends/custom${q}`);
  },
  getProduct(orgId: string, refresh = false) {
    const q = refresh ? "?refresh=true" : "";
    return ceFetch<ProductTrendsResponse>(`/${orgId}/trends/product${q}`);
  },
  saveSelectedTopics(orgId: string, selectedTopics: string[]) {
    return ceFetch<void>(`/${orgId}/trends/selected-topics`, {
      method: "PUT",
      body: JSON.stringify({ selectedTopics }),
    });
  },
};

// --- Compose ---
export const composeApi = {
  score(text: string) {
    return ceFetch<CoachResult>("/coach/score", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
  generate(
    orgId: string,
    payload: { topic: string; angle?: string; angleType?: AngleType; userIdea?: string },
  ) {
    return ceFetch<GenerateResponse>(`/${orgId}/compose/generate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  rewrite(orgId: string, currentText: string, instruction: string) {
    return ceFetch<GenerateResponse>(`/${orgId}/compose/rewrite`, {
      method: "POST",
      body: JSON.stringify({ currentText, instruction }),
    });
  },
  remix(orgId: string, originalText: string, authorHandle?: string) {
    return ceFetch<GenerateResponse>(`/${orgId}/compose/remix`, {
      method: "POST",
      body: JSON.stringify({ originalText, authorHandle }),
    });
  },
  suggestAngles(
    orgId: string,
    payload: {
      title: string;
      summary: string;
      angleType?: "product" | "authentic";
      productLink?: string;
      seedAngle?: string;
    },
  ) {
    return ceFetch<SuggestAnglesResponse>(`/${orgId}/compose/suggest-angles`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

// --- Drafts ---
export const draftsApi = {
  list(orgId: string, page = 1, limit = 20) {
    return ceFetch<DraftsListResponse>(`/${orgId}/drafts?page=${page}&limit=${limit}`);
  },
  save(
    orgId: string,
    draft: {
      text: string;
      score?: number;
      verdict?: string;
      checks?: Record<string, unknown>;
      topic?: string;
      angle?: string;
      angleType?: AngleType;
      sentiment?: string;
      trendSummary?: string;
      dataPoints?: { fact: string; source?: string }[];
      categories?: string[];
    },
  ) {
    return ceFetch<ContentDraft>(`/${orgId}/drafts`, {
      method: "POST",
      body: JSON.stringify(draft),
    });
  },
  update(
    orgId: string,
    draftId: string,
    changes: { text?: string; score?: number; verdict?: string; status?: "draft" | "posted"; angle?: string; angleType?: string },
  ) {
    return ceFetch<ContentDraft>(`/${orgId}/drafts/${draftId}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
  },
  delete(orgId: string, draftId: string) {
    return ceFetch<void>(`/${orgId}/drafts/${draftId}`, { method: "DELETE" });
  },
  postToX(orgId: string, draftId: string, connectionId: string) {
    return ceFetch<ContentDraft>(`/${orgId}/drafts/${draftId}/post`, {
      method: "POST",
      body: JSON.stringify({ connectionId }),
    });
  },
};

// --- Tweets (published) ---
export const tweetsApi = {
  list(orgId: string, page = 1, limit = 20) {
    return ceFetch<TweetsListResponse>(`/${orgId}/tweets?page=${page}&limit=${limit}`);
  },
};

// --- Following ---
export const followingApi = {
  list(orgId: string) {
    return ceFetch<FollowedAccount[]>(`/${orgId}/following`);
  },
  add(orgId: string, xHandle: string) {
    return ceFetch<FollowedAccount>(`/${orgId}/following`, {
      method: "POST",
      body: JSON.stringify({ xHandle }),
    });
  },
  remove(orgId: string, id: string) {
    return ceFetch<void>(`/${orgId}/following/${id}`, { method: "DELETE" });
  },
};
