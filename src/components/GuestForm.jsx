import React, { useState } from "react";
import {
  User,
  Home,
  MapPin,
  Bike,
  Plus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Selectize from "./Selectize";
import { useAppContext } from "../context/useAppContext";
import { sanitizeString } from "../utils/validation";

const GuestForm = () => {
  const { addGuest } = useAppContext();
  const [formData, setFormData] = useState({
    name: "",
    housingStatus: "Unhoused",
    location: "",
    notes: "",
    bicycleDescription: "",
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const BAY_AREA_CITIES = [
    "Antioch",
    "Berkeley",
    "Concord",
    "Daly City",
    "Fremont",
    "Hayward",
    "Livermore",
    "Mountain View",
    "Oakland",
    "Palo Alto",
    "Redwood City",
    "Richmond",
    "San Francisco",
    "San Jose",
    "San Leandro",
    "San Mateo",
    "Santa Clara",
    "Santa Rosa",
    "Sunnyvale",
    "Vallejo",
    "Walnut Creek",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Sanitize and validate name
    const sanitizedName = sanitizeString(formData.name, { maxLength: 100 });
    if (!sanitizedName.trim()) {
      setError("Please enter a valid guest name");
      return;
    }

    // Sanitize notes and bicycle description to prevent XSS
    const sanitizedNotes = sanitizeString(formData.notes, {
      maxLength: 500,
      allowHTML: false
    });

    const sanitizedBicycleDesc = sanitizeString(formData.bicycleDescription, {
      maxLength: 200,
      allowHTML: false
    });

    // Validate location if provided
    const sanitizedLocation = sanitizeString(formData.location, { maxLength: 100 });

    setIsSubmitting(true);

    try {
      // Create guest with sanitized data
      await addGuest({
        ...formData,
        name: sanitizedName,
        location: sanitizedLocation,
        notes: sanitizedNotes,
        bicycleDescription: sanitizedBicycleDesc,
      });

      setFormData({
        name: "",
        housingStatus: "Unhoused",
        location: "",
        notes: "",
        bicycleDescription: "",
      });

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      setError(`Error creating guest: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {showSuccessMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} className="text-green-600" />
          <span className="text-green-800 font-medium">
            Guest registered successfully!
          </span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="guest-name-input"
            className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            Guest Name*
            <span className="text-xs font-normal text-gray-500">
              (Required)
            </span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User
                size={18}
                className="text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
            </div>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              id="guest-name-input"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-400"
              placeholder="Enter guest name"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="housing-status-select"
            className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            Housing Status
            <span className="text-xs font-normal text-gray-500">
              (Optional)
            </span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Home
                size={18}
                className="text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
            </div>
            <select
              name="housingStatus"
              value={formData.housingStatus}
              onChange={handleChange}
              id="housing-status-select"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white hover:border-gray-400 cursor-pointer"
              disabled={isSubmitting}
            >
              <option value="Unhoused">Unhoused</option>
              <option value="Temporarily Housed">Temporarily Housed</option>
              <option value="Transitional Housing">Transitional Housing</option>
              <option value="Sheltered">Sheltered</option>
              <option value="Housed">Housed</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
            Location
            <span className="text-xs font-normal text-gray-500">
              (Optional)
            </span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <MapPin
                size={18}
                className="text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
            </div>
            <Selectize
              options={[
                ...BAY_AREA_CITIES.map((c) => ({ value: c, label: c })),
                { value: "Outside SF Bay Area", label: "Outside SF Bay Area" },
              ]}
              value={formData.location}
              onChange={(val) => setFormData({ ...formData, location: val })}
              placeholder="Select location"
              size="sm"
              className="w-full"
              buttonClassName="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-left hover:border-gray-400 transition-all"
              searchable
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="notes-textarea"
            className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            Notes
            <span className="text-xs font-normal text-gray-500">
              (Optional)
            </span>
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            id="notes-textarea"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none hover:border-gray-400"
            rows="3"
            placeholder="Any additional information"
            disabled={isSubmitting}
          ></textarea>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="bicycle-description"
            className="block text-sm font-semibold text-gray-700 flex items-center gap-2"
          >
            Bicycle description
            <span className="text-xs font-normal text-gray-500">
              (Optional)
            </span>
          </label>
          <div className="relative group">
            <div className="absolute top-3 left-3 flex items-start pointer-events-none">
              <Bike
                size={18}
                className="text-gray-400 group-focus-within:text-blue-500 transition-colors"
              />
            </div>
            <textarea
              name="bicycleDescription"
              value={formData.bicycleDescription}
              onChange={handleChange}
              id="bicycle-description"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none hover:border-gray-400"
              rows="2"
              placeholder="Bike make, color, or identifying details"
              disabled={isSubmitting}
            />
          </div>
          <p className="text-xs text-gray-500 flex items-start gap-1.5">
            <span className="text-blue-500 font-medium">💡</span>
            <span>
              Capturing bike details helps ensure each guest registers only one
              bicycle for repairs.
            </span>
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} />
          {isSubmitting ? "Registering..." : "Register Guest"}
        </button>
      </form>
    </div>
  );
};

export default GuestForm;
