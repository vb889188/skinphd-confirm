import { Root, Indicator } from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  id?: string;
}) {
  return (
    <Root
      id={id}
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      className={cn("mt-0.5 grid size-5 place-items-center rounded border border-line bg-paper data-[state=checked]:border-accent data-[state=checked]:bg-accent", className)}
    >
      <Indicator className="text-[11px] font-extrabold text-paper">✓</Indicator>
    </Root>
  );
}
