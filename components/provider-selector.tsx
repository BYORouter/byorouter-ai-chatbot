"use client";

import { startTransition, useOptimistic, useState } from "react";
import { useModels, useConnect } from "@byorouter/react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, ChevronDownIcon, PlusIcon } from "./icons";
import { saveProviderAsCookie } from "@/app/(chat)/actions";

export function ProviderSelector({
  selectedProviderId,
  initialDisplayName,
  className,
  onProviderChange,
}: {
  selectedProviderId: string;
  initialDisplayName?: string;
  className?: string;
  onProviderChange?: (providerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [optimisticProviderId, setOptimisticProviderId] =
    useOptimistic(selectedProviderId);

  const { providers } = useModels();
  const { connectUrl } = useConnect();

  const selectedProvider = providers.find((p) => p.id === optimisticProviderId);
  const selectedProviderName =
    selectedProvider?.displayName ?? initialDisplayName ?? optimisticProviderId;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className,
        )}
      >
        <Button
          data-testid="provider-selector"
          variant="outline"
          className="md:px-2 md:h-[34px]"
        >
          {selectedProviderName}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        {providers.map((provider) => (
          <DropdownMenuItem
            data-testid={`provider-selector-item-${provider.id}`}
            key={provider.id}
            onSelect={() => {
              setOpen(false);

              startTransition(() => {
                setOptimisticProviderId(provider.id);
                saveProviderAsCookie(provider.id);
                onProviderChange?.(provider.id);
              });
            }}
            data-active={provider.id === optimisticProviderId}
            asChild
          >
            <button
              type="button"
              className="gap-4 group/item flex flex-row justify-between items-center w-full"
            >
              <div>{provider.displayName}</div>
              <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                <CheckCircleFillIcon />
              </div>
            </button>
          </DropdownMenuItem>
        ))}

        {providers.length > 0 && <DropdownMenuSeparator />}

        <DropdownMenuItem asChild>
          <a href={connectUrl} className="flex flex-row items-center gap-2">
            <PlusIcon />
            Connect AI Provider
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
