import { useEffect, useState } from "react";

export type Entitlements = {
  signedIn: boolean;
  verified: boolean;
  chapterLimit: number | null;
  unlockedAll: boolean;
  unlockedChapters: string[];
};

export function useEntitlements() {
  const [data, setData] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/entitlements", { credentials: "include" });
      const json = (await res.json()) as Entitlements;
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { data, loading, refresh };
}
