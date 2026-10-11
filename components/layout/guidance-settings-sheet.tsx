"use client";

import { GuidanceSettingsPanel, type GuidanceMenuSettings } from "@/components/guidance/guidance-settings-panel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function GuidanceSettingsSheet({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: GuidanceMenuSettings;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription className="sr-only">
            Guidance preferences
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <GuidanceSettingsPanel settings={settings} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
