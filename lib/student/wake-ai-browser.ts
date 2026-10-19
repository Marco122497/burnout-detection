const AI_HOME =
  process.env.NEXT_PUBLIC_AI_API_URL?.replace(/\/$/, "") ||
  "https://burnout-ai-1.onrender.com";

const LOCAL_AI_HOME = "http://127.0.0.1:8000";

export function aiHomesForBrowser(): string[] {
  const homes = [AI_HOME];
  if (typeof window === "undefined") return homes;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    homes.push(LOCAL_AI_HOME);
  }
  return homes;
}

/** True when this browser can reach the AI. The dev server often cannot. */
export async function browserCanReachAi(timeoutMs = 20000): Promise<boolean> {
  const homes = aiHomesForBrowser();
  return new Promise((resolve) => {
    let pending = homes.length;
    let settled = false;

    const finish = (online: boolean) => {
      if (settled) return;
      if (online) {
        settled = true;
        resolve(true);
        return;
      }
      pending -= 1;
      if (pending <= 0) {
        settled = true;
        resolve(false);
      }
    };

    for (const url of homes) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);
      void fetch(url, {
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      })
        .then(() => finish(true))
        .catch(() => finish(false))
        .finally(() => window.clearTimeout(timer));
    }
  });
}

/** Browser request that wakes Render, and the local AI when the app is on localhost. */
export function wakeBurnoutAiInBrowser() {
  for (const url of aiHomesForBrowser()) {
    void fetch(url, {
      mode: "no-cors",
      cache: "no-store",
      keepalive: true,
    }).catch(() => {});
  }
  void fetch("/api/ai/warm", {
    cache: "no-store",
    keepalive: true,
  }).catch(() => {});
}

export const AI_WAKE_SCRIPT = `(function(){var homes=[${JSON.stringify(AI_HOME)}];var host=location.hostname;if(host==="localhost"||host==="127.0.0.1"){homes.push(${JSON.stringify(LOCAL_AI_HOME)});}for(var i=0;i<homes.length;i++){fetch(homes[i],{mode:"no-cors",cache:"no-store",keepalive:true}).catch(function(){});}fetch("/api/ai/warm",{cache:"no-store",keepalive:true}).catch(function(){});})();`;
