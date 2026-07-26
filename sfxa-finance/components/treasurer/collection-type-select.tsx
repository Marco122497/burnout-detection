"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { COLLECTION_CATEGORY_NAMES } from "@/lib/treasurer";
import { Label } from "@/components/ui/label";

const selectClassName =
  "h-8 min-w-[200px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

export function CollectionTypeSelect({
  value,
}: {
  value: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  useEffect(() => {
    for (const name of COLLECTION_CATEGORY_NAMES) {
      router.prefetch(
        `/treasurer/collections?type=${encodeURIComponent(name)}`
      );
    }
  }, [router]);

  const current = isPending ? selected : value;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label
        htmlFor="collection-type"
        className="text-sm text-muted-foreground"
      >
        Collection type
      </Label>
      <select
        id="collection-type"
        value={current}
        disabled={isPending}
        className={selectClassName}
        onChange={(event) => {
          const next = event.target.value;
          setSelected(next);
          startTransition(() => {
            router.push(
              `/treasurer/collections?type=${encodeURIComponent(next)}`
            );
          });
        }}
      >
        {COLLECTION_CATEGORY_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {isPending && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
