"use client";

import { Badge } from "@/components/ui/badge";

type Props = {
  send_onsite?: boolean;
  send_email?: boolean;
  send_whatsapp?: boolean;
};

export function ChannelsBadges(props: Props) {
  const chips: { label: string; active: boolean }[] = [
    { label: "On-site", active: !!props.send_onsite },
    { label: "إيميل", active: !!props.send_email },
    { label: "واتساب", active: !!props.send_whatsapp },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) =>
        c.active ? (
          <Badge key={c.label} className="text-xs">
            {c.label}
          </Badge>
        ) : null
      )}
    </div>
  );
}
