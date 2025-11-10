export const createWaiverMutations = ({
  supabaseEnabled,
  supabaseClient,
  pushAction,
  toast,
}) => {
  /**
   * Fetch waivers for a guest
   * @param {string} guestId - Guest ID
   * @returns {Promise<Object>} Object with shower and laundry waiver status
   */
  const fetchGuestWaivers = async (guestId) => {
    if (!supabaseEnabled || !supabaseClient) {
      return { shower: null, laundry: null };
    }

    try {
      const { data, error } = await supabaseClient
        .from("service_waivers")
        .select("*")
        .eq("guest_id", guestId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch waivers:", error);
        return { shower: null, laundry: null };
      }

      // Find active (not dismissed) waivers for each service
      const waiversByService = {};
      (data || []).forEach((waiver) => {
        if (!waiversByService[waiver.service_type]) {
          waiversByService[waiver.service_type] = waiver;
        }
      });

      return {
        shower: waiversByService.shower || null,
        laundry: waiversByService.laundry || null,
      };
    } catch (error) {
      console.error("Error fetching waivers:", error);
      return { shower: null, laundry: null };
    }
  };

  /**
   * Check if a guest needs a waiver reminder for a service
   * @param {string} guestId - Guest ID
   * @param {string} serviceType - 'shower' or 'laundry'
   * @returns {Promise<boolean>}
   */
  const guestNeedsWaiverReminder = async (guestId, serviceType) => {
    if (!supabaseEnabled || !supabaseClient) {
      return false;
    }

    try {
      // Call the stored function
      const { data, error } = await supabaseClient.rpc(
        "guest_needs_waiver_reminder",
        {
          p_guest_id: guestId,
          p_service_type: serviceType,
        }
      );

      if (error) {
        console.error("Error checking waiver reminder:", error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error("Error in guestNeedsWaiverReminder:", error);
      return false;
    }
  };

  /**
   * Dismiss/acknowledge a waiver for a guest
   * Staff dismisses after confirming external waiver is signed
   * @param {string} guestId - Guest ID
   * @param {string} serviceType - 'shower' or 'laundry'
   * @param {string} reason - Optional reason for dismissal (default: 'signed_by_staff')
   * @returns {Promise<boolean>} True if successful
   */
  const dismissWaiver = async (guestId, serviceType, reason = "signed_by_staff") => {
    if (!supabaseEnabled || !supabaseClient) {
      toast.error("Offline mode - cannot dismiss waiver");
      return false;
    }

    try {
      const { error } = await supabaseClient.rpc("dismiss_waiver", {
        p_guest_id: guestId,
        p_service_type: serviceType,
        p_dismissed_reason: reason,
      });

      if (error) {
        console.error("Failed to dismiss waiver:", error);
        toast.error(`Unable to dismiss ${serviceType} waiver`);
        return false;
      }

      pushAction({
        id: Date.now() + Math.random(),
        type: "WAIVER_DISMISSED",
        timestamp: new Date().toISOString(),
        data: { guestId, serviceType, reason },
        description: `${serviceType} waiver confirmed for guest`,
      });

      toast.success(`${serviceType === "shower" ? "Shower" : "Laundry"} waiver confirmed for this year`);
      return true;
    } catch (error) {
      console.error("Error dismissing waiver:", error);
      toast.error("Failed to acknowledge waiver");
      return false;
    }
  };

  /**
   * Check if a guest has an active waiver for a service
   * @param {string} guestId - Guest ID
   * @param {string} serviceType - 'shower' or 'laundry'
   * @returns {Promise<boolean>}
   */
  const hasActiveWaiver = async (guestId, serviceType) => {
    if (!supabaseEnabled || !supabaseClient) {
      return false;
    }

    try {
      const { data, error } = await supabaseClient.rpc("has_active_waiver", {
        p_guest_id: guestId,
        p_service_type: serviceType,
      });

      if (error) {
        console.error("Error checking active waiver:", error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error("Error in hasActiveWaiver:", error);
      return false;
    }
  };

  /**
   * Fetch guests needing waivers (from view)
   * @returns {Promise<Array>} Array of guests needing waivers
   */
  const fetchGuestsNeedingWaivers = async () => {
    if (!supabaseEnabled || !supabaseClient) {
      return [];
    }

    try {
      const { data, error } = await supabaseClient
        .from("guests_needing_waivers")
        .select("*")
        .eq("service_needed", "shower")
        .or("service_needed.eq.laundry");

      if (error) {
        console.error("Failed to fetch guests needing waivers:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching guests needing waivers:", error);
      return [];
    }
  };

  /**
   * Get waiver status summary for a guest
   * @param {string} guestId - Guest ID
   * @returns {Promise<Object>} { showerNeeds: bool, laundryNeeds: bool, showerWaiver: obj|null, laundryWaiver: obj|null }
   */
  const getWaiverStatusSummary = async (guestId) => {
    if (!supabaseEnabled || !supabaseClient) {
      return {
        showerNeeds: false,
        laundryNeeds: false,
        showerWaiver: null,
        laundryWaiver: null,
      };
    }

    try {
      // Fetch current waivers
      const waivers = await fetchGuestWaivers(guestId);

      // Check if needs reminder for each service
      const [showerNeeds, laundryNeeds] = await Promise.all([
        guestNeedsWaiverReminder(guestId, "shower"),
        guestNeedsWaiverReminder(guestId, "laundry"),
      ]);

      return {
        showerNeeds,
        laundryNeeds,
        showerWaiver: waivers.shower,
        laundryWaiver: waivers.laundry,
      };
    } catch (error) {
      console.error("Error getting waiver status summary:", error);
      return {
        showerNeeds: false,
        laundryNeeds: false,
        showerWaiver: null,
        laundryWaiver: null,
      };
    }
  };

  return {
    fetchGuestWaivers,
    guestNeedsWaiverReminder,
    dismissWaiver,
    hasActiveWaiver,
    fetchGuestsNeedingWaivers,
    getWaiverStatusSummary,
  };
};
