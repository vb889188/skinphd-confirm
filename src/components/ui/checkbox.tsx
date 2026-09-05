import { Root, Indicator } from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <Root
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      className={cn("mt-0.5 grid size-4 place-items-center rounded border border-line bg-paper data-[state=checked]:border-accent data-[state=checked]:bg-accent", className)}
    >
      <Indicator className="text-[10px] font-extrabold text-paper">✓</Indicator>
    </Root>
  );
}
