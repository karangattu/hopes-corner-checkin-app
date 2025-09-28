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

    if (!formData.name.trim()) {
      setError("Please enter a guest name");
      return;
    }

    setIsSubmitting(true);

    try {
      addGuest(formData);
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
            className="block text-sm font-semibold text-gray-700"
          >
            Guest Name*
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              id="guest-name-input"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter guest name"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="housing-status-select"
            className="block text-sm font-semibold text-gray-700"
          >
            Housing Status
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Home size={18} className="text-gray-400" />
            </div>
            <select
              name="housingStatus"
              value={formData.housingStatus}
              onChange={handleChange}
              id="housing-status-select"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white"
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
          <label className="block text-sm font-semibold text-gray-700">
            Location
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin size={18} className="text-gray-400" />
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
              buttonClassName="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-left"
              searchable
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="notes-textarea"
            className="block text-sm font-semibold text-gray-700"
          >
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            id="notes-textarea"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            rows="3"
            placeholder="Any additional information"
            disabled={isSubmitting}
          ></textarea>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="bicycle-description"
            className="block text-sm font-semibold text-gray-700"
          >
            Bicycle description
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Bike size={18} className="text-gray-400" />
            </div>
            <textarea
              name="bicycleDescription"
              value={formData.bicycleDescription}
              onChange={handleChange}
              id="bicycle-description"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              rows="2"
              placeholder="Bike make, color, or identifying details"
              disabled={isSubmitting}
            />
          </div>
          <p className="text-xs text-gray-500">
            Capturing bike details helps ensure each guest registers only one
            bicycle for repairs.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          {isSubmitting ? "Registering..." : "Register Guest"}
        </button>
      </form>
    </div>
  );
};

export default GuestForm;
