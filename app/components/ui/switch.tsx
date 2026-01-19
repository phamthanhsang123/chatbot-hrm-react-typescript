"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
  checkedClassName?: string;   // class cho trạng thái ON
  uncheckedClassName?: string; // class cho trạng thái OFF
  thumbClassName?: string;     // class cho nút tròn
};

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(
  (
    {
      className,
      checkedClassName,
      uncheckedClassName,
      thumbClassName,
      ...props
    },
    ref
  ) => (
    <SwitchPrimitives.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        // default màu nếu không truyền
        uncheckedClassName ?? "data-[state=unchecked]:bg-gray-300",
        checkedClassName ?? "data-[state=checked]:bg-blue-600",
        className
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
          // default thumb màu trắng
          "bg-white",
          thumbClassName
        )}
      />
    </SwitchPrimitives.Root>
  )
);

Switch.displayName = "Switch";

export { Switch };
