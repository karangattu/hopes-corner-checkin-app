'use client';

import { motion } from 'framer-motion';
import {
    Users,
    Utensils,
    ShowerHead,
    WashingMachine,
    Clock,
    Bike,
    Calendar,
    BarChart3,
    History,
    TrendingUp,
    Sparkles
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

            {/* Reports and Highlights */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <BarChart3 size={14} /> Performance Snapshot
                            </h3>
                            <p className="text-sm text-gray-500 font-medium mt-1">Real-time recording relative to targets.</p>
                        </div>
                        <button className="px-4 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-black shadow-sm border border-gray-100 hover:bg-white transition-all">
                            FULL ANALYTICS
                        </button>
                    </div>

                    <div className="flex items-center justify-center p-12 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                        <div className="text-center">
                            <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-900 font-black">Live Stats Coming Soon</p>
                            <p className="text-sm text-gray-400 font-medium mt-1 max-w-xs mx-auto">
                                Enhanced aggregate reporting will allow you to see weekly and monthly trends directly here.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-100">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-80 mb-4">Daily Goal</h3>
                        <div className="flex items-end justify-between mb-4">
                            <span className="text-4xl font-black">74%</span>
                            <div className="p-2 rounded-lg bg-white/20">
                                <TrendingUp size={24} />
                            </div>
                        </div>
                        <p className="text-sm font-medium leading-relaxed opacity-90">
                            We&apos;ve served <span className="font-bold">142</span> guests today. Keep up the great work!
                        </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-gray-100 bg-white">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Quick Navigation</h4>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-blue-500 group-hover:scale-110 transition-transform">
                                    <History size={16} />
                                </div>
                                <span className="text-sm font-bold text-gray-700">Service Timeline</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('bicycles')}
                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm text-amber-500 group-hover:scale-110 transition-transform">
                                    <Bike size={16} />
                                </div>
                                <span className="text-sm font-bold text-gray-700">Bicycle Repairs</span>
                            </button>
                        </div>
                    </div>
                </div>
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
                    description="3 pending repairs · 12 completed this week"
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
