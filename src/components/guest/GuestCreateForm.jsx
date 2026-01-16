import React from "react";
import { UserPlus, X, AlertCircle } from "lucide-react";
import Selectize from "../Selectize";
import {
  HOUSING_STATUSES,
  AGE_GROUPS,
  GENDERS,
} from "../../context/constants";
import { BAY_AREA_CITIES } from "../../constants/locations";

const GuestCreateForm = ({
  formData,
  fieldErrors,
  isCreating,
  createError,
  duplicateWarning,
  onChange,
  onNameBlur,
  onSubmit,
  onCancel,
  onLocationChange,
  firstNameRef,
}) => {
  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + Enter to submit from anywhere
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit(e);
        return;
      }

      const target = e.target;
      const tagName = target?.tagName;

      // Ignore single-key shortcuts while typing or interacting with selects
      if (tagName === "TEXTAREA" || tagName === "SELECT" || tagName === "INPUT") {
        return;
      }
      if (target?.closest && target.closest("select")) {
        return;
      }

      const key = e.key.toLowerCase();

      // Housing Status shortcuts

      if (key === "u") onChange({ target: { name: "housingStatus", value: "Unhoused" } });
      if (key === "h") onChange({ target: { name: "housingStatus", value: "Housed" } });
      if (key === "s") onChange({ target: { name: "housingStatus", value: "Temp. shelter" } });
      if (key === "v") onChange({ target: { name: "housingStatus", value: "RV or vehicle" } });

      // Age Group (1=Adult, 2=Senior, 3=Child)
      if (key === "1") onChange({ target: { name: "age", value: AGE_GROUPS[0] } });
      if (key === "2") onChange({ target: { name: "age", value: AGE_GROUPS[1] } });
      if (key === "3") onChange({ target: { name: "age", value: AGE_GROUPS[2] } });

      // Gender (m=Male, f=Female, n=Non-binary, x=Unknown)
      if (key === "m") onChange({ target: { name: "gender", value: "Male" } });
      if (key === "f") onChange({ target: { name: "gender", value: "Female" } });
      if (key === "n") onChange({ target: { name: "gender", value: "Non-binary" } });
      if (key === "x") onChange({ target: { name: "gender", value: "Unknown" } });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange, onSubmit, formData]);

  return (
    <div
      className="bg-white border-2 border-blue-200 rounded-xl p-5 shadow-xl"
      role="dialog"
      aria-labelledby="create-guest-title"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 id="create-guest-title" className="text-lg font-bold flex items-center gap-2 text-gray-800">
          <UserPlus size={20} className="text-blue-600" /> Fast Create Guest
          <span className="text-xs font-normal text-gray-400 ml-2">Shortcut: [Cmd/Ctrl+Enter] to save</span>
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors" type="button">
          <X size={20} />
        </button>
      </div>

      {createError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="text-red-600" />
          <span className="text-red-800">{createError}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="guest-first-name" className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name*</label>
            <input
              id="guest-first-name"
              type="text"
              name="firstName"
              ref={firstNameRef}
              value={formData.firstName}
              onChange={onChange}
              onBlur={onNameBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${fieldErrors.firstName ? "border-red-300 focus:ring-red-200" : "border-gray-300 focus:ring-blue-100"
                }`}
              placeholder="First Name"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="guest-last-name" className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name*</label>
            <input
              id="guest-last-name"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={onChange}
              onBlur={onNameBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${fieldErrors.lastName ? "border-red-300 focus:ring-red-200" : "border-gray-300 focus:ring-blue-100"
                }`}
              placeholder="Last Name"
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="guest-preferred-name" className="block text-xs font-bold text-gray-500 uppercase mb-1">Preferred</label>
            <input
              id="guest-preferred-name"
              type="text"
              name="preferredName"
              value={formData.preferredName}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Nickname"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Status & Location Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="guest-housing-status" className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">
              Housing Status <span>[U, H, S, V]</span>
            </label>
            <select
              id="guest-housing-status"
              name="housingStatus"
              value={formData.housingStatus}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
            >
              <option value="Unhoused">Unhoused (U)</option>
              <option value="Housed">Housed (H)</option>
              <option value="Temp. shelter">Shelter (S)</option>
              <option value="RV or vehicle">Vehicle (V)</option>
            </select>
          </div>
          <div>
            <label htmlFor="guest-age-group" className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Age Group* <span>[1, 2, 3]</span>
            </label>
            <select
              id="guest-age-group"
              name="age"
              value={formData.age}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
              required
            >
              <option value="">Select (1-3)</option>
              {AGE_GROUPS.map((a, i) => (
                <option key={a} value={a}>
                  {i + 1}. {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="guest-gender" className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Gender* <span>[M, F, N, X]</span>
            </label>
            <select
              id="guest-gender"
              name="gender"
              value={formData.gender}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none bg-white"
              required
            >
              <option value="">Select (M/F/N/X)</option>
              <option value="Male">Male (M)</option>
              <option value="Female">Female (F)</option>
              <option value="Non-binary">Non-binary (N)</option>
              <option value="Unknown">Unknown (X)</option>
            </select>
          </div>
        </div>

        {/* Location & Notes Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="guest-location" className="block text-xs font-bold text-gray-500 uppercase mb-1">Location*</label>
            <Selectize
              id="guest-location"
              options={[
                ...BAY_AREA_CITIES.map((c) => ({ value: c, label: c })),
                { value: "Outside Santa Clara County", label: "Outside Santa Clara County" },
              ]}
              value={formData.location}
              onChange={onLocationChange}
              placeholder="Search city..."
              size="sm"
              buttonClassName="w-full px-3 py-2 border border-gray-300 rounded-lg text-left bg-white h-[42px]"
              searchable
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="guest-notes" className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
              <input
                id="guest-notes"
                type="text"
                name="notes"
                value={formData.notes || ""}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none h-[42px]"
                placeholder="Notes..."
              />
            </div>
            <div>
              <label htmlFor="guest-bicycle-description" className="block text-xs font-bold text-gray-500 uppercase mb-1">Bicycle Description</label>
              <input
                id="guest-bicycle-description"
                type="text"
                name="bicycleDescription"
                value={formData.bicycleDescription || ""}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none h-[42px]"
                placeholder="Bicycle..."
              />
            </div>
          </div>
        </div>


        {duplicateWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs">
            <AlertCircle size={16} className="text-amber-600" />
            <span className="text-amber-800 font-medium">{duplicateWarning}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              {isCreating ? "Saving..." : "Save Guest [Cmd/Ctrl+Enter]"}
            </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-200 text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default GuestCreateForm;
