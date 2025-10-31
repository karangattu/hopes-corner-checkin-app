export const DEFAULT_TARGETS = {
  monthlyMeals: 1500,
  yearlyMeals: 18000,
  monthlyShowers: 300,
  yearlyShowers: 3600,
  monthlyLaundry: 200,
  yearlyLaundry: 2400,
  monthlyBicycles: 50,
  yearlyBicycles: 600,
  monthlyHaircuts: 100,
  yearlyHaircuts: 1200,
  monthlyHolidays: 80,
  yearlyHolidays: 960,
};

export const createDefaultSettings = () => ({
  siteName: "Hope's Corner",
  maxOnsiteLaundrySlots: 5,
  enableOffsiteLaundry: true,
  uiDensity: "comfortable",
  showCharts: true,
  defaultReportDays: 7,
  donationAutofill: true,
  defaultDonationType: "Protein",
  targets: { ...DEFAULT_TARGETS },
});

export const mergeSettings = (base, incoming = {}) => {
  if (!incoming || typeof incoming !== "object") return base;

  const next = {
    ...base,
    ...incoming,
  };

  if (incoming.targets) {
    next.targets = {
      ...(base.targets ?? {}),
      ...(incoming.targets ?? {}),
    };
  }

  if (!next.targets) {
    next.targets = { ...DEFAULT_TARGETS };
  }

  return next;
};
