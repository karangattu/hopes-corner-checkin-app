'use client';

import {
    Users,
    Utensils,
    ShowerHead,
    WashingMachine,
    Clock,
    Bike,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    iconBg: string;
    iconColor: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, iconBg, iconColor }: MetricCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center p-2.5 shadow-sm", iconBg)}>
                <Icon size={24} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    {title}
                </p>
                <p className="text-3xl font-black text-gray-900 tracking-tight">
                    {value}
                </p>
                {subtitle && (
                    <p className="text-xs text-gray-500 font-medium mt-1 leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}

interface QuickLinkProps {
    title: string;
    description: string;
    icon: any;
    color: string;
    onClick: () => void;
}

function QuickLink({ title, description, icon: Icon, color, onClick }: QuickLinkProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group p-5 rounded-2xl border text-left transition-all hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]",
                color
            )}
        >
            <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Icon size={20} />
            </div>
            <h4 className="text-base font-black tracking-tight mb-1">{title}</h4>
            <p className="text-sm font-medium opacity-80 leading-relaxed">{description}</p>
        </button>
    );
}

export function OverviewSection({
    metrics,
    setActiveTab
}: {
    metrics: any,
    setActiveTab: (tab: string) => void
}) {
    return (
        <div className="space-y-8">
            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                    title="Guests on file"
                    value={metrics.totalGuests}
                    subtitle={metrics.housingStatusSummary}
                    icon={Users}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                />
                <MetricCard
                    title="Meals served today"
                    value={metrics.mealsToday}
                    subtitle="Includes seconds and extra requests"
                    icon={Utensils}
                    iconBg="bg-emerald-50"
                    iconColor="text-emerald-600"
                />
                <MetricCard
                    title="Unique guests served"
                    value={metrics.uniqueGuestsToday}
                    subtitle={`${metrics.mealsToday} total meals provided`}
                    icon={Users}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                />
                <MetricCard
                    title="Showers completed"
                    value={metrics.showersDone}
                    subtitle={`${metrics.showersActive} currently in progress`}
                    icon={ShowerHead}
                    iconBg="bg-sky-50"
                    iconColor="text-sky-600"
                />
                <MetricCard
                    title="Laundry loads"
                    value={metrics.laundryTotal}
                    subtitle={`${metrics.laundryActive} active loads · ${metrics.laundryDone} ready`}
                    icon={WashingMachine}
                    iconBg="bg-purple-50"
                    iconColor="text-purple-600"
                />
                <MetricCard
                    title="Shower waitlist"
                    value={metrics.showerWaitlist}
                    subtitle={metrics.showerWaitlist > 0 ? "Potential high demand today" : "No one waiting"}
                    icon={Clock}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-600"
                />
            </div>

            {/* Large Quick Access Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <QuickLink
                    title="Shower List"
                    description={`${metrics.showersActive} active · ${metrics.showersDone} completed`}
                    icon={ShowerHead}
                    color="bg-sky-50 border-sky-100 text-sky-700"
                    onClick={() => setActiveTab('showers')}
                />
                <QuickLink
                    title="Laundry Board"
                    description={`${metrics.laundryActive} loads in progress · ${metrics.laundryTotal} total`}
                    icon={WashingMachine}
                    color="bg-purple-50 border-purple-100 text-purple-700"
                    onClick={() => setActiveTab('laundry')}
                />
                <QuickLink
                    title="Bicycle Queue"
                    description={`${metrics.bicyclesPending} pending repairs · ${metrics.bicyclesCompletedThisWeek} completed this week`}
                    icon={Bike}
                    color="bg-amber-50 border-amber-100 text-amber-700"
                    onClick={() => setActiveTab('bicycles')}
                />
                <QuickLink
                    title="Service Timeline"
                    description={`${metrics.timelineCount} events recorded today`}
                    icon={History}
                    color="bg-indigo-50 border-indigo-100 text-indigo-700"
                    onClick={() => setActiveTab('timeline')}
                />
            </div>
        </div>
    );
}
