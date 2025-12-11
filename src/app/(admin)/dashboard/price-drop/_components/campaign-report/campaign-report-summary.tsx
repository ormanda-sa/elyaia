"use client";

import {
  Users,
  UserCheck,
  UserPlus,
  Eye,
  CheckCircle,
  Monitor,
  MousePointerClick,
  X,
  ShoppingBag,
  Mail,
  Send,
  Inbox,
  AlertCircle,
  MailOpen,
  TrendingUp,
} from "lucide-react";

type CampaignReportStats = {
  total_targets?: number;
  old_targets?: number;
  new_targets?: number;
  onsite_seen_count?: number;
  converted_count?: number;
};

type OnsiteFunnelStats = {
  impressions?: number;
  clicks?: number;
  closes?: number;
  orders?: number;
};

type EmailFunnelStats = {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number; // 👈 جديد
};

type Props = {
  stats: CampaignReportStats | null | undefined;
  onsite_funnel?: OnsiteFunnelStats | null | undefined;
  email_funnel?: EmailFunnelStats | null | undefined;
};

export function CampaignReportSummary({
  stats,
  onsite_funnel,
  email_funnel,
}: Props) {
  const email = email_funnel || {
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
  };
  const deliveredNotOpened = Math.max(email.delivered - email.opened, 0);

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* قسم نظرة عامة على الحملة */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            نظرة عامة على الحملة
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            icon={<Users className="h-5 w-5" />}
            label="إجمالي العملاء المستهدفين"
            value={stats?.total_targets ?? 0}
            color="blue"
          />
          <SummaryCard
            icon={<UserCheck className="h-5 w-5" />}
            label="العملاء القدامى (من أول إطلاق)"
            value={stats?.old_targets ?? 0}
            color="green"
          />
          <SummaryCard
            icon={<UserPlus className="h-5 w-5" />}
            label="العملاء الجدد (انضموا لاحقاً)"
            value={stats?.new_targets ?? 0}
            color="teal"
          />
          <SummaryCard
            icon={<Eye className="h-5 w-5" />}
            label="العملاء اللي شافوا On-site"
            value={stats?.onsite_seen_count ?? 0}
            color="purple"
          />
          <SummaryCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="التحويلات (Converted)"
            value={stats?.converted_count ?? 0}
            color="emerald"
          />
        </div>
      </section>

      {/* قسم أداء البوب أب On-site */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Monitor className="h-5 w-5 text-orange-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            أداء البوب أب على المتجر (On-site)
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<Monitor className="h-5 w-5" />}
            label="ظهور البوب أب (Impressions)"
            value={onsite_funnel?.impressions ?? 0}
            color="orange"
          />
          <SummaryCard
            icon={<MousePointerClick className="h-5 w-5" />}
            label="نقرات على البوب أب (Clicks)"
            value={onsite_funnel?.clicks ?? 0}
            color="amber"
          />
          <SummaryCard
            icon={<X className="h-5 w-5" />}
            label="إغلاقات البوب أب (Closes)"
            value={onsite_funnel?.closes ?? 0}
            color="slate"
          />
          <SummaryCard
            icon={<ShoppingBag className="h-5 w-5" />}
            label="طلبات من On-site (Orders)"
            value={onsite_funnel?.orders ?? 0}
            color="green"
          />
        </div>
      </section>

      {/* قسم أداء الإيميل */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Mail className="h-5 w-5 text-cyan-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            أداء الإيميل (Email Funnel)
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryCard
            icon={<Mail className="h-5 w-5" />}
            label="إجمالي رسائل الإيميل"
            value={email.total}
            color="cyan"
          />
          <SummaryCard
            icon={<Send className="h-5 w-5" />}
            label="تم الإرسال (sent)"
            value={email.sent}
            color="blue"
          />
          <SummaryCard
            icon={<Inbox className="h-5 w-5" />}
            label="وصلت لصندوق البريد (delivered)"
            value={email.delivered}
            color="green"
          />
          <SummaryCard
            icon={<AlertCircle className="h-5 w-5" />}
            label="فشلت (failed)"
            value={email.failed}
            color="red"
            highlight="error"
          />
          <SummaryCard
            icon={<MailOpen className="h-5 w-5" />}
            label="انفتحت / وصلت ولم تُفتح"
            value={email.opened}
            color="teal"
            extra={`وصلت ولم تُفتح: ${deliveredNotOpened}`}
          />
          <SummaryCard
            icon={<MousePointerClick className="h-5 w-5" />}
            label="نقرات من الإيميل (Email Clicks)"
            value={email.clicked}
            color="amber"
          />
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color = "blue",
  highlight,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?:
    | "blue"
    | "green"
    | "teal"
    | "purple"
    | "emerald"
    | "orange"
    | "amber"
    | "slate"
    | "cyan"
    | "red";
  highlight?: "error";
  extra?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border-2 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-3 text-xs font-medium leading-relaxed text-gray-600">
            {label}
          </div>
          <div
            className={`text-3xl font-bold transition-colors ${
              highlight === "error" ? "text-red-600" : "text-gray-900"
            }`}
          >
            {value.toLocaleString()}
          </div>
          {extra && (
            <div className="mt-2 inline-block rounded-md bg-gray-50 px-2 py-1 text-xs text-gray-500">
              {extra}
            </div>
          )}
        </div>
        <div
          className={`rounded-lg p-2.5 ${colorClasses[color]} transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 ${
          highlight === "error"
            ? "bg-red-500"
            : `bg-gradient-to-r from-${color}-400 to-${color}-600`
        }`}
      ></div>
    </div>
  );
}
