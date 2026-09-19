import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[#14212b]/10 rounded-xs before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-[#14212b]/15 before:to-transparent',
        className
      )}
      {...props}
    />
  );
}
