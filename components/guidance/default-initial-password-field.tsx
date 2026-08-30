import { DEFAULT_INITIAL_PASSWORD } from "@/lib/auth/defaults";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DefaultInitialPasswordField({
  id,
}: {
  id: string;
}) {
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor={id}>Initial password</Label>
      <Input
        id={id}
        type="text"
        value={DEFAULT_INITIAL_PASSWORD}
        disabled
        readOnly
        aria-readonly="true"
        className="bg-muted/50"
      />
    </div>
  );
}
