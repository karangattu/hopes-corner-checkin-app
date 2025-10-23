import React, { useMemo, useCallback } from "react";
import { useAppContext } from "../../context/useAppContext";
import { Download, Calendar, ShowerHead } from "lucide-react";
import toast from "react-hot-toast";
import { BICYCLE_REPAIR_STATUS, LAUNDRY_STATUS } from "../../context/constants";

/**
 * MonthlySummaryReport - Comprehensive monthly meal statistics table
 *
 * Displays a breakdown of meals by month and type for 2025, including:
 * - Weekday-specific guest meals (Mon/Wed/Sat/Fri)
 * - Special meal types (Day Worker, Extra, RV, Lunch Bags)
 * - Calculated totals and onsite meal counts
 */
const MonthlySummaryReport = () => {
  const {
    guests,
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    showerRecords,
    laundryRecords,
    bicycleRecords,
    exportDataAsCSV,
  } = useAppContext();

  // Helper: Get day of week from date string (0=Sunday, 1=Monday, ..., 6=Saturday)
  const getDayOfWeek = useCallback((dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.getDay();
  }, []);

  // Helper: Filter records by year, month, and optionally specific days
  const filterRecords = useCallback((records, year, month, daysOfWeek = null) => {
    return records.filter((record) => {
      if (!record.date) return false;
      const date = new Date(record.date);
      const recordYear = date.getFullYear();
      const recordMonth = date.getMonth(); // 0-indexed

      if (recordYear !== year || recordMonth !== month) return false;

      if (daysOfWeek) {
        const dayOfWeek = getDayOfWeek(record.date);
        return daysOfWeek.includes(dayOfWeek);
      }

      return true;
    });
  }, [getDayOfWeek]);

  // Helper: Sum quantities from filtered records
  const sumQuantities = (records) => {
    return records.reduce((sum, record) => sum + (record.count || 0), 0);
  };

  const normalizeRepairTypes = useCallback((record) => {
    if (!record) return [];
    const rawTypes = Array.isArray(record.repairTypes)
      ? record.repairTypes
      : record.repairType
      ? [record.repairType]
      : [];
    return rawTypes
      .map((type) => (type == null ? "" : String(type).trim()))
      .filter((type) => type.length > 0);
  }, []);

  const isCompletedBicycleStatus = useCallback((status) => {
    if (!status) return true;
    return status === BICYCLE_REPAIR_STATUS.DONE;
  }, []);

  // Calculate monthly data for all months from Jan 2025 to current month
  const monthlyData = useMemo(() => {
    const currentDate = new Date();
    const currentYear = 2025;
    const currentMonth = currentDate.getFullYear() === currentYear ? currentDate.getMonth() : 11;

    const months = [];
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    // Generate data for each month from January to current month
    for (let month = 0; month <= currentMonth; month++) {
      const monthName = monthNames[month];

      // Guest meals by specific days
      const mondayMeals = sumQuantities(filterRecords(mealRecords, currentYear, month, [1]));
      const wednesdayMeals = sumQuantities(filterRecords(mealRecords, currentYear, month, [3]));
      const saturdayMeals = sumQuantities(filterRecords(mealRecords, currentYear, month, [6]));
      const fridayMeals = sumQuantities(filterRecords(mealRecords, currentYear, month, [5]));

      // Special meal types (all days)
      const dayWorkerMeals = sumQuantities(filterRecords(dayWorkerMealRecords, currentYear, month));
      const extraMeals = sumQuantities(filterRecords(extraMealRecords, currentYear, month));

      // RV meals split by day groups
      const rvWedSat = sumQuantities(filterRecords(rvMealRecords, currentYear, month, [3, 6]));
      const rvMonThu = sumQuantities(filterRecords(rvMealRecords, currentYear, month, [1, 4]));

      // Lunch bags
      const lunchBags = sumQuantities(filterRecords(lunchBagRecords, currentYear, month));

      // Shelter and United Effort meals (for total hot meals)
      const shelterMeals = sumQuantities(filterRecords(shelterMealRecords, currentYear, month));
      const unitedEffortMeals = sumQuantities(filterRecords(unitedEffortMealRecords, currentYear, month));

      // Calculated totals
      const totalHotMeals =
        mondayMeals +
        wednesdayMeals +
        saturdayMeals +
        fridayMeals +
        dayWorkerMeals +
        extraMeals +
        rvWedSat +
        rvMonThu +
        shelterMeals +
        unitedEffortMeals;

      const totalWithLunchBags = totalHotMeals + lunchBags;

      // Onsite hot meals = (guest meals + extra meals) on Mon/Wed/Sat/Fri
      const onsiteMondayMeals = mondayMeals + sumQuantities(filterRecords(extraMealRecords, currentYear, month, [1]));
      const onsiteWednesdayMeals = wednesdayMeals + sumQuantities(filterRecords(extraMealRecords, currentYear, month, [3]));
      const onsiteSaturdayMeals = saturdayMeals + sumQuantities(filterRecords(extraMealRecords, currentYear, month, [6]));
      const onsiteFridayMeals = fridayMeals + sumQuantities(filterRecords(extraMealRecords, currentYear, month, [5]));
      const onsiteHotMeals = onsiteMondayMeals + onsiteWednesdayMeals + onsiteSaturdayMeals + onsiteFridayMeals;

      months.push({
        month: monthName,
        mondayMeals,
        wednesdayMeals,
        saturdayMeals,
        fridayMeals,
        dayWorkerMeals,
        extraMeals,
        rvWedSat,
        rvMonThu,
        lunchBags,
        totalHotMeals,
        totalWithLunchBags,
        onsiteHotMeals,
      });
    }

    // Calculate totals row
    const totals = {
      month: "TOTAL",
      mondayMeals: months.reduce((sum, m) => sum + m.mondayMeals, 0),
      wednesdayMeals: months.reduce((sum, m) => sum + m.wednesdayMeals, 0),
      saturdayMeals: months.reduce((sum, m) => sum + m.saturdayMeals, 0),
      fridayMeals: months.reduce((sum, m) => sum + m.fridayMeals, 0),
      dayWorkerMeals: months.reduce((sum, m) => sum + m.dayWorkerMeals, 0),
      extraMeals: months.reduce((sum, m) => sum + m.extraMeals, 0),
      rvWedSat: months.reduce((sum, m) => sum + m.rvWedSat, 0),
      rvMonThu: months.reduce((sum, m) => sum + m.rvMonThu, 0),
      lunchBags: months.reduce((sum, m) => sum + m.lunchBags, 0),
      totalHotMeals: months.reduce((sum, m) => sum + m.totalHotMeals, 0),
      totalWithLunchBags: months.reduce((sum, m) => sum + m.totalWithLunchBags, 0),
      onsiteHotMeals: months.reduce((sum, m) => sum + m.onsiteHotMeals, 0),
    };

    return { months, totals };
  }, [
    mealRecords,
    rvMealRecords,
    shelterMealRecords,
    unitedEffortMealRecords,
    extraMealRecords,
    dayWorkerMealRecords,
    lunchBagRecords,
    filterRecords,
  ]);

  const bicycleSummary = useMemo(() => {
    const currentDate = new Date();
    const currentYear = 2025;
    const currentMonth = currentDate.getFullYear() === currentYear ? currentDate.getMonth() : 11;
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const rows = monthNames.map((monthName, monthIndex) => {
      const recordsForMonth = (bicycleRecords || []).filter((record) => {
        if (!record?.date) return false;
        const date = new Date(record.date);
        return (
          date.getFullYear() === currentYear &&
          date.getMonth() === monthIndex &&
          isCompletedBicycleStatus(record.status)
        );
      });

      let newBikes = 0;
      let services = 0;
      recordsForMonth.forEach((record) => {
        const types = normalizeRepairTypes(record);
        if (types.length === 0) return;
        types.forEach((type) => {
          if (type.toLowerCase() === "new bicycle") {
            newBikes += 1;
          } else {
            services += 1;
          }
        });
      });

      return {
        month: monthName,
        newBikes,
        services,
        total: newBikes + services,
        isYearToDate: monthIndex <= currentMonth,
      };
    });

    const yearToDateRows = rows.filter((row) => row.isYearToDate);
    const totals = yearToDateRows.reduce(
      (acc, row) => ({
        newBikes: acc.newBikes + row.newBikes,
        services: acc.services + row.services,
        total: acc.total + row.total,
      }),
      { newBikes: 0, services: 0, total: 0 },
    );

    return {
      rows,
      totals,
    };
  }, [bicycleRecords, isCompletedBicycleStatus, normalizeRepairTypes]);

  const showerLaundrySummary = useMemo(() => {
    const currentDate = new Date();
    const currentYear = 2025;
    const currentMonth =
      currentDate.getFullYear() === currentYear ? currentDate.getMonth() : 11;
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const guestMap = new Map();
    (guests || []).forEach((guest) => {
      if (!guest) return;
      const candidateIds = [
        guest.id,
        guest.guestId,
        guest.externalId,
        guest.docId,
      ].filter((value) => value != null);
      candidateIds.forEach((value) => {
        guestMap.set(String(value), guest);
      });
    });

    const categorizeAge = (guestId) => {
      if (!guestId) return "adult";
      const guest = guestMap.get(String(guestId));
      const rawAge = (
        guest?.age ??
        guest?.ageGroup ??
        guest?.age_group ??
        guest?.ageCategory ??
        ""
      )
        .toString()
        .toLowerCase();

      if (rawAge.includes("senior")) return "senior";
      if (rawAge.includes("child")) return "child";
      return "adult";
    };

    const completedLaundryStatuses = new Set(
      [
        LAUNDRY_STATUS?.DONE,
        LAUNDRY_STATUS?.PICKED_UP,
        LAUNDRY_STATUS?.RETURNED,
        LAUNDRY_STATUS?.OFFSITE_PICKED_UP,
      ]
        .filter(Boolean)
        .map((value) => value.toString().toLowerCase()),
    );

    const completedShowerRecords = (showerRecords || []).reduce((acc, record) => {
      if (!record?.date) return acc;
      const date = new Date(record.date);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== currentYear) {
        return acc;
      }
      const status = (record.status || "").toString().toLowerCase();
      if (status && status !== "done") return acc;
      acc.push({
        guestId: record.guestId != null ? String(record.guestId) : null,
        date,
        monthIndex: date.getMonth(),
      });
      return acc;
    }, []);

    const completedLaundryRecords = (laundryRecords || []).reduce(
      (acc, record) => {
        if (!record?.date) return acc;
        const date = new Date(record.date);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== currentYear) {
          return acc;
        }
        const status = (record.status || "").toString().toLowerCase();
        if (!completedLaundryStatuses.has(status)) return acc;
        acc.push({
          guestId: record.guestId != null ? String(record.guestId) : null,
          date,
          monthIndex: date.getMonth(),
        });
        return acc;
      },
      [],
    );

    const allServiceRecords = [
      ...completedShowerRecords,
      ...completedLaundryRecords,
    ];

    const guestFirstMonth = new Map();
    allServiceRecords.forEach((record) => {
      if (!record.guestId) return;
      const existing = guestFirstMonth.get(record.guestId);
      if (existing == null || record.monthIndex < existing) {
        guestFirstMonth.set(record.guestId, record.monthIndex);
      }
    });

    const rows = [];
    const ytdGuestSet = new Set();
    const ytdLaundrySet = new Set();
    const ytdParticipantAgeSets = {
      adult: new Set(),
      senior: new Set(),
      child: new Set(),
    };
    const ytdLaundryAgeSets = {
      adult: new Set(),
      senior: new Set(),
      child: new Set(),
    };

    let runningNewGuests = 0;

    const totalsAccumulator = {
      programDays: 0,
      showersProvided: 0,
      laundryLoadsProcessed: 0,
    };

    monthNames.forEach((monthName, monthIndex) => {
      const showersForMonth = completedShowerRecords.filter(
        (record) => record.monthIndex === monthIndex,
      );
      const laundryForMonth = completedLaundryRecords.filter(
        (record) => record.monthIndex === monthIndex,
      );
      const combinedForMonth = [...showersForMonth, ...laundryForMonth];

      const programDaysSet = new Set(
        combinedForMonth.map((record) => record.date.toISOString().slice(0, 10)),
      );

      const monthGuestSet = new Set();
      combinedForMonth.forEach((record) => {
        if (record.guestId) {
          monthGuestSet.add(record.guestId);
        }
      });

      const participantsCounts = {
        adult: 0,
        senior: 0,
        child: 0,
      };
      monthGuestSet.forEach((guestId) => {
        const bucket = categorizeAge(guestId);
        participantsCounts[bucket] += 1;
      });

      const laundryGuestSet = new Set();
      laundryForMonth.forEach((record) => {
        if (record.guestId) {
          laundryGuestSet.add(record.guestId);
        }
      });
      const laundryCounts = {
        adult: 0,
        senior: 0,
        child: 0,
      };
      laundryGuestSet.forEach((guestId) => {
        const bucket = categorizeAge(guestId);
        laundryCounts[bucket] += 1;
      });

      const isYearToDate = monthIndex <= currentMonth;
      let newGuestsThisMonth = 0;

      if (isYearToDate) {
        monthGuestSet.forEach((guestId) => {
          ytdGuestSet.add(guestId);
          const bucket = categorizeAge(guestId);
          ytdParticipantAgeSets[bucket].add(guestId);
        });
        laundryGuestSet.forEach((guestId) => {
          ytdLaundrySet.add(guestId);
          const bucket = categorizeAge(guestId);
          ytdLaundryAgeSets[bucket].add(guestId);
        });
        newGuestsThisMonth = [...monthGuestSet].filter(
          (guestId) => guestFirstMonth.get(guestId) === monthIndex,
        ).length;
        runningNewGuests += newGuestsThisMonth;

        totalsAccumulator.programDays += programDaysSet.size;
        totalsAccumulator.showersProvided += showersForMonth.length;
        totalsAccumulator.laundryLoadsProcessed += laundryForMonth.length;
      } else {
        newGuestsThisMonth = [...monthGuestSet].filter(
          (guestId) => guestFirstMonth.get(guestId) === monthIndex,
        ).length;
      }

      rows.push({
        month: monthName,
        programDays: programDaysSet.size,
        showersProvided: showersForMonth.length,
        participantsAdult: participantsCounts.adult,
        participantsSenior: participantsCounts.senior,
        participantsChild: participantsCounts.child,
        totalParticipants:
          participantsCounts.adult +
          participantsCounts.senior +
          participantsCounts.child,
        newGuests: newGuestsThisMonth,
        ytdTotalUnduplicatedGuests: ytdGuestSet.size,
        laundryLoadsProcessed: laundryForMonth.length,
        unduplicatedLaundryUsers: laundryGuestSet.size,
        laundryAdult: laundryCounts.adult,
        laundrySenior: laundryCounts.senior,
        laundryChild: laundryCounts.child,
        ytdNewGuestsLaundry: runningNewGuests,
        ytdTotalUnduplicatedLaundryUsers: ytdLaundrySet.size,
        isYearToDate,
      });
    });

    const totals = {
      month: "Year to Date",
      programDays: totalsAccumulator.programDays,
      showersProvided: totalsAccumulator.showersProvided,
      participantsAdult: ytdParticipantAgeSets.adult.size,
      participantsSenior: ytdParticipantAgeSets.senior.size,
      participantsChild: ytdParticipantAgeSets.child.size,
      totalParticipants:
        ytdParticipantAgeSets.adult.size +
        ytdParticipantAgeSets.senior.size +
        ytdParticipantAgeSets.child.size,
      newGuests: runningNewGuests,
      ytdTotalUnduplicatedGuests: ytdGuestSet.size,
      laundryLoadsProcessed: totalsAccumulator.laundryLoadsProcessed,
      unduplicatedLaundryUsers: ytdLaundrySet.size,
      laundryAdult: ytdLaundryAgeSets.adult.size,
      laundrySenior: ytdLaundryAgeSets.senior.size,
      laundryChild: ytdLaundryAgeSets.child.size,
      ytdNewGuestsLaundry: runningNewGuests,
      ytdTotalUnduplicatedLaundryUsers: ytdLaundrySet.size,
    };

    return {
      rows,
      totals,
    };
  }, [guests, laundryRecords, showerRecords]);

  // Export data to CSV
  const handleExportCSV = () => {
    const csvData = [
      ...monthlyData.months.map(row => ({
        Month: row.month,
        "Monday": row.mondayMeals,
        "Wednesday": row.wednesdayMeals,
        "Saturday": row.saturdayMeals,
        "Friday": row.fridayMeals,
        "Day Worker Center": row.dayWorkerMeals,
        "Extra Meals": row.extraMeals,
        "RV Wed+Sat": row.rvWedSat,
        "RV Mon+Thu": row.rvMonThu,
        "Lunch Bags": row.lunchBags,
        "TOTAL HOT MEALS": row.totalHotMeals,
        "Total w/ Lunch Bags": row.totalWithLunchBags,
        "Onsite Hot Meals": row.onsiteHotMeals,
      })),
      // Add totals row
      {
        Month: monthlyData.totals.month,
        "Monday": monthlyData.totals.mondayMeals,
        "Wednesday": monthlyData.totals.wednesdayMeals,
        "Saturday": monthlyData.totals.saturdayMeals,
        "Friday": monthlyData.totals.fridayMeals,
        "Day Worker Center": monthlyData.totals.dayWorkerMeals,
        "Extra Meals": monthlyData.totals.extraMeals,
        "RV Wed+Sat": monthlyData.totals.rvWedSat,
        "RV Mon+Thu": monthlyData.totals.rvMonThu,
        "Lunch Bags": monthlyData.totals.lunchBags,
        "TOTAL HOT MEALS": monthlyData.totals.totalHotMeals,
        "Total w/ Lunch Bags": monthlyData.totals.totalWithLunchBags,
        "Onsite Hot Meals": monthlyData.totals.onsiteHotMeals,
      },
    ];

    csvData.push({});
    csvData.push({ Month: "Bicycle Services Summary" });
    csvData.push(
      ...bicycleSummary.rows.map((row) => ({
        Month: row.month,
        "New Bikes": row.newBikes,
        "Bike Services": row.services,
        Total: row.total,
      })),
    );
    csvData.push({
      Month: "Year to Date",
      "New Bikes": bicycleSummary.totals.newBikes,
      "Bike Services": bicycleSummary.totals.services,
      Total: bicycleSummary.totals.total,
    });

    csvData.push({});
    csvData.push({ Month: "Shower & Laundry Services Summary" });
    csvData.push(
      ...showerLaundrySummary.rows.map((row) => ({
        Month: row.month,
        "Program Days in Month": row.programDays,
        "Showers Provided": row.showersProvided,
        "Participants: Adult": row.participantsAdult,
        "Participants: Senior": row.participantsSenior,
        "Participants: Child": row.participantsChild,
        "Total Participants": row.totalParticipants,
        "New Guests This Month": row.newGuests,
        "YTD Total Unduplicated Guests": row.ytdTotalUnduplicatedGuests,
        "Laundry Loads Processed": row.laundryLoadsProcessed,
        "Unduplicated Laundry Users": row.unduplicatedLaundryUsers,
        "Laundry Users: Adult": row.laundryAdult,
        "Laundry Users: Senior": row.laundrySenior,
        "Laundry Users: Child": row.laundryChild,
        "YTD New Guests (Laundry)": row.ytdNewGuestsLaundry,
        "YTD Total Unduplicated Laundry Users":
          row.ytdTotalUnduplicatedLaundryUsers,
      })),
    );
    csvData.push({
      Month: showerLaundrySummary.totals.month,
      "Program Days in Month": showerLaundrySummary.totals.programDays,
      "Showers Provided": showerLaundrySummary.totals.showersProvided,
      "Participants: Adult": showerLaundrySummary.totals.participantsAdult,
      "Participants: Senior": showerLaundrySummary.totals.participantsSenior,
      "Participants: Child": showerLaundrySummary.totals.participantsChild,
      "Total Participants": showerLaundrySummary.totals.totalParticipants,
      "New Guests This Month": showerLaundrySummary.totals.newGuests,
      "YTD Total Unduplicated Guests":
        showerLaundrySummary.totals.ytdTotalUnduplicatedGuests,
      "Laundry Loads Processed":
        showerLaundrySummary.totals.laundryLoadsProcessed,
      "Unduplicated Laundry Users":
        showerLaundrySummary.totals.unduplicatedLaundryUsers,
      "Laundry Users: Adult": showerLaundrySummary.totals.laundryAdult,
      "Laundry Users: Senior": showerLaundrySummary.totals.laundrySenior,
      "Laundry Users: Child": showerLaundrySummary.totals.laundryChild,
      "YTD New Guests (Laundry)": showerLaundrySummary.totals.ytdNewGuestsLaundry,
      "YTD Total Unduplicated Laundry Users":
        showerLaundrySummary.totals.ytdTotalUnduplicatedLaundryUsers,
    });

    exportDataAsCSV(csvData, `monthly-summary-2025-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success("Monthly summary exported to CSV");
  };

  const handleExportBicycleCSV = () => {
    const csvData = [
      ...bicycleSummary.rows.map((row) => ({
        Month: row.month,
        "New Bikes": row.newBikes,
        "Bike Services": row.services,
        Total: row.total,
      })),
      {
        Month: "Year to Date",
        "New Bikes": bicycleSummary.totals.newBikes,
        "Bike Services": bicycleSummary.totals.services,
        Total: bicycleSummary.totals.total,
      },
    ];

    exportDataAsCSV(
      csvData,
      `bicycle-summary-2025-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("Bicycle services summary exported to CSV");
  };

  const handleExportShowerLaundryCSV = () => {
    const csvData = [
      ...showerLaundrySummary.rows.map((row) => ({
        Month: row.month,
        "Program Days in Month": row.programDays,
        "Showers Provided": row.showersProvided,
        "Participants: Adult": row.participantsAdult,
        "Participants: Senior": row.participantsSenior,
        "Participants: Child": row.participantsChild,
        "Total Participants": row.totalParticipants,
        "New Guests This Month": row.newGuests,
        "YTD Total Unduplicated Guests": row.ytdTotalUnduplicatedGuests,
        "Laundry Loads Processed": row.laundryLoadsProcessed,
        "Unduplicated Laundry Users": row.unduplicatedLaundryUsers,
        "Laundry Users: Adult": row.laundryAdult,
        "Laundry Users: Senior": row.laundrySenior,
        "Laundry Users: Child": row.laundryChild,
        "YTD New Guests (Laundry)": row.ytdNewGuestsLaundry,
        "YTD Total Unduplicated Laundry Users":
          row.ytdTotalUnduplicatedLaundryUsers,
      })),
      {
        Month: showerLaundrySummary.totals.month,
        "Program Days in Month": showerLaundrySummary.totals.programDays,
        "Showers Provided": showerLaundrySummary.totals.showersProvided,
        "Participants: Adult": showerLaundrySummary.totals.participantsAdult,
        "Participants: Senior": showerLaundrySummary.totals.participantsSenior,
        "Participants: Child": showerLaundrySummary.totals.participantsChild,
        "Total Participants": showerLaundrySummary.totals.totalParticipants,
        "New Guests This Month": showerLaundrySummary.totals.newGuests,
        "YTD Total Unduplicated Guests":
          showerLaundrySummary.totals.ytdTotalUnduplicatedGuests,
        "Laundry Loads Processed":
          showerLaundrySummary.totals.laundryLoadsProcessed,
        "Unduplicated Laundry Users":
          showerLaundrySummary.totals.unduplicatedLaundryUsers,
        "Laundry Users: Adult": showerLaundrySummary.totals.laundryAdult,
        "Laundry Users: Senior": showerLaundrySummary.totals.laundrySenior,
        "Laundry Users: Child": showerLaundrySummary.totals.laundryChild,
        "YTD New Guests (Laundry)":
          showerLaundrySummary.totals.ytdNewGuestsLaundry,
        "YTD Total Unduplicated Laundry Users":
          showerLaundrySummary.totals.ytdTotalUnduplicatedLaundryUsers,
      },
    ];

    exportDataAsCSV(
      csvData,
      `shower-laundry-summary-2025-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    toast.success("Shower & laundry summary exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Monthly Summary Report - 2025
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive breakdown of meals by month and type
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            Export to CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                  Month
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-gray-100">
                  Monday
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-gray-100">
                  Wednesday
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-gray-100">
                  Saturday
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-blue-50">
                  Friday
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Day Worker Center
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Extra Meals
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-orange-50">
                  RV Wed+Sat
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-orange-50">
                  RV Mon+Thu
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-purple-50">
                  Lunch Bags
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  TOTAL HOT MEALS
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Total w/ Lunch Bags
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Onsite Hot Meals
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Month rows */}
              {monthlyData.months.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">
                    {row.month}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                    {row.mondayMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                    {row.wednesdayMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                    {row.saturdayMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                    {row.fridayMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                    {row.dayWorkerMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                    {row.extraMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-orange-50">
                    {row.rvWedSat.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-orange-50">
                    {row.rvMonThu.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                    {row.lunchBags.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white font-semibold">
                    {row.totalHotMeals.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white font-semibold">
                    {row.totalWithLunchBags.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-white font-semibold">
                    {row.onsiteHotMeals.toLocaleString()}
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-gray-200 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-gray-900">
                  {monthlyData.totals.month}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                  {monthlyData.totals.mondayMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                  {monthlyData.totals.wednesdayMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-gray-100">
                  {monthlyData.totals.saturdayMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                  {monthlyData.totals.fridayMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.dayWorkerMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.extraMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-orange-50">
                  {monthlyData.totals.rvWedSat.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-orange-50">
                  {monthlyData.totals.rvMonThu.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                  {monthlyData.totals.lunchBags.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.totalHotMeals.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.totalWithLunchBags.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-white">
                  {monthlyData.totals.onsiteHotMeals.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300"></div>
            <span className="text-gray-700">Weekday Guest Meals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-gray-300"></div>
            <span className="text-gray-700">Friday Meals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-50 border border-gray-300"></div>
            <span className="text-gray-700">RV Meals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-50 border border-gray-300"></div>
            <span className="text-gray-700">Lunch Bags</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">Calculation Notes:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>TOTAL HOT MEALS:</strong> Sum of all meal types except lunch bags</li>
            <li><strong>Total w/ Lunch Bags:</strong> TOTAL HOT MEALS + Lunch Bags</li>
            <li><strong>Onsite Hot Meals:</strong> Guest meals + Extra meals on Mon/Wed/Sat/Fri only</li>
            <li><strong>RV Meals:</strong> Split by service days (Mon+Thu and Wed+Sat)</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-sky-600" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Bicycle Services Summary
              </h3>
              <p className="text-sm text-gray-600">
                Year-to-date breakdown of new bicycles and service types provided in 2025
              </p>
            </div>
          </div>
          <button
            onClick={handleExportBicycleCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Download size={16} />
            Export Bicycle CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                  Month
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-emerald-50">
                  New Bikes
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-sky-50">
                  Bike Services
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-white">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {bicycleSummary.rows.map((row) => (
                <tr key={row.month} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">
                    {row.month}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50">
                    {row.newBikes.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right bg-sky-50">
                    {row.services.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right">
                    {row.total.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-gray-900">
                  Year to Date
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50">
                  {bicycleSummary.totals.newBikes.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-sky-50">
                  {bicycleSummary.totals.services.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {bicycleSummary.totals.total.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <ShowerHead className="text-amber-600" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Shower & Laundry Services Summary
              </h3>
              <p className="text-sm text-gray-600">
                Participant trends and laundry loads from January through YTD 2025
              </p>
            </div>
          </div>
          <button
            onClick={handleExportShowerLaundryCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Download size={16} />
            Export Shower & Laundry CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                  Month
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-yellow-50">
                  Program Days in Month
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-yellow-50">
                  Showers Provided
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-emerald-50">
                  Participants: Adult
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-emerald-50">
                  Participants: Senior
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-emerald-50">
                  Participants: Child
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-emerald-50">
                  Total Participants
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-blue-50">
                  New Guests This Month
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-blue-50">
                  YTD Total Unduplicated Guests
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-purple-50">
                  Laundry Loads Processed
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-purple-50">
                  Unduplicated Laundry Users
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-purple-50">
                  Laundry Users: Adult
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-purple-50">
                  Laundry Users: Senior
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-purple-50">
                  Laundry Users: Child
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-blue-50">
                  YTD New Guests (Laundry)
                </th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 bg-purple-50">
                  YTD Total Unduplicated Laundry Users
                </th>
              </tr>
            </thead>
            <tbody>
              {showerLaundrySummary.rows.map((row) => (
                <tr
                  key={row.month}
                  className={row.isYearToDate ? "hover:bg-gray-50" : "bg-gray-50 text-gray-500"}
                >
                  <td
                    className={`border border-gray-300 px-3 py-2 font-medium ${row.isYearToDate ? "text-gray-900" : "text-gray-500"}`}
                  >
                    {row.month}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.programDays.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.showersProvided.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-emerald-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.participantsAdult.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-emerald-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.participantsSenior.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-emerald-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.participantsChild.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-emerald-50 font-semibold ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.totalParticipants.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-blue-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.newGuests.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-blue-50 font-semibold ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.ytdTotalUnduplicatedGuests.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-purple-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.laundryLoadsProcessed.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-purple-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.unduplicatedLaundryUsers.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-purple-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.laundryAdult.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-purple-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.laundrySenior.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-purple-50 ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.laundryChild.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-blue-50 font-semibold ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.ytdNewGuestsLaundry.toLocaleString()}
                  </td>
                  <td
                    className={`border border-gray-300 px-3 py-2 text-right bg-purple-50 font-semibold ${row.isYearToDate ? "" : "text-gray-500"}`}
                  >
                    {row.ytdTotalUnduplicatedLaundryUsers.toLocaleString()}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-gray-900">
                  {showerLaundrySummary.totals.month}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-yellow-50">
                  {showerLaundrySummary.totals.programDays.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-yellow-50">
                  {showerLaundrySummary.totals.showersProvided.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50">
                  {showerLaundrySummary.totals.participantsAdult.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50">
                  {showerLaundrySummary.totals.participantsSenior.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50">
                  {showerLaundrySummary.totals.participantsChild.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-emerald-50">
                  {showerLaundrySummary.totals.totalParticipants.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                  {showerLaundrySummary.totals.newGuests.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                  {showerLaundrySummary.totals.ytdTotalUnduplicatedGuests.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                  {showerLaundrySummary.totals.laundryLoadsProcessed.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                  {showerLaundrySummary.totals.unduplicatedLaundryUsers.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                  {showerLaundrySummary.totals.laundryAdult.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                  {showerLaundrySummary.totals.laundrySenior.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                  {showerLaundrySummary.totals.laundryChild.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                  {showerLaundrySummary.totals.ytdNewGuestsLaundry.toLocaleString()}
                </td>
                <td className="border border-gray-300 px-3 py-2 text-right bg-purple-50">
                  {showerLaundrySummary.totals.ytdTotalUnduplicatedLaundryUsers.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryReport;
