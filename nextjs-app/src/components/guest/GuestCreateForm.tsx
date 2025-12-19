'use client';

import React, { FormEvent, ChangeEvent, RefObject } from 'react';
import { UserPlus, X, AlertCircle, Plus, MapPin } from 'lucide-react';
import {
  HOUSING_STATUSES,
  AGE_GROUPS,
  GENDERS,
  BAY_AREA_CITIES,
  HousingStatus,
  AgeGroup,
  Gender,
} from '@/lib/constants';

export interface GuestFormData {
  firstName: string;
  lastName: string;
  preferredName: string;
  housingStatus: HousingStatus;
  age: AgeGroup | '';
  gender: Gender | '';
  location: string;
  notes: string;
  bicycleDescription: string;
}

export interface FieldErrors {
  firstName?: string;
  lastName?: string;
  age?: string;
  gender?: string;
  location?: string;
}

interface GuestCreateFormProps {
  formData: GuestFormData;
  fieldErrors: FieldErrors;
  isCreating: boolean;
  createError: string | null;
  duplicateWarning: string | null;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onNameBlur: () => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
  onLocationChange: (value: string) => void;
  firstNameRef?: RefObject<HTMLInputElement | null>;
}

const locationOptions = [
  ...BAY_AREA_CITIES.map((c) => ({ value: c, label: c })),
  { value: 'Outside Santa Clara County', label: 'Outside Santa Clara County' },
];

export function GuestCreateForm({
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
}: GuestCreateFormProps) {
  return (
    <div
      className="bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6"
      role="dialog"
      aria-labelledby="create-guest-title"
      aria-describedby="create-guest-description"
    >
      <div className="flex justify-between items-center mb-6">
        <h3
          id="create-guest-title"
          className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white"
        >
          <UserPlus size={20} className="text-blue-600" /> Create New Guest
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close create guest form"
          type="button"
        >
          <X size={20} />
        </button>
      </div>

      {createError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-300">{createError}</span>
        </div>
      )}

      {duplicateWarning && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
          <span className="text-amber-800 dark:text-amber-300">{duplicateWarning}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* First Name */}
          <div>
            <label
              htmlFor="guest-first-name"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              First Name*
            </label>
            <input
              id="guest-first-name"
              type="text"
              name="firstName"
              ref={firstNameRef}
              value={formData.firstName}
              onChange={onChange}
              onBlur={onNameBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white ${
                fieldErrors.firstName
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter first name"
              required
              disabled={isCreating}
            />
            {fieldErrors.firstName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="guest-last-name"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Last Name*
            </label>
            <input
              id="guest-last-name"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={onChange}
              onBlur={onNameBlur}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white ${
                fieldErrors.lastName
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="Enter last name"
              required
              disabled={isCreating}
            />
            {fieldErrors.lastName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.lastName}</p>
            )}
          </div>

          {/* Preferred Name */}
          <div>
            <label
              htmlFor="guest-preferred-name"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Preferred Name
            </label>
            <input
              id="guest-preferred-name"
              type="text"
              name="preferredName"
              value={formData.preferredName}
              onChange={onChange}
              onBlur={onNameBlur}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="What should we call them?"
              disabled={isCreating}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Shown with the legal name for staff awareness.
            </p>
          </div>

          {/* Housing Status */}
          <div>
            <label
              htmlFor="guest-housing-status"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Housing Status
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 flex items-start gap-1.5">
              <span className="text-blue-500 font-medium">💙</span>
              <span>
                Please ask: "Do you have stable housing right now?" Select the option that best
                describes their current situation.
                <span className="block mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                  Spanish: "¿Tiene una vivienda estable en este momento?"
                </span>
                <span className="block mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                  Mandarin: "您现在有稳定的住处吗？"
                </span>
              </span>
            </p>
            <select
              id="guest-housing-status"
              name="housingStatus"
              value={formData.housingStatus}
              onChange={onChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isCreating}
            >
              {HOUSING_STATUSES.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Age Group */}
          <div>
            <label
              htmlFor="guest-age-group"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Age Group*
            </label>
            <select
              id="guest-age-group"
              name="age"
              value={formData.age}
              onChange={onChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isCreating}
              required
            >
              <option value="">Select age group</option>
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label
              htmlFor="guest-gender"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Gender*
            </label>
            <select
              id="guest-gender"
              name="gender"
              value={formData.gender}
              onChange={onChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isCreating}
              required
            >
              <option value="">Select gender</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="guest-location"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Location*
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin size={18} className="text-gray-400" />
              </div>
              <select
                id="guest-location"
                value={formData.location}
                onChange={(e) => onLocationChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isCreating}
              >
                <option value="">Select location</option>
                {locationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="guest-notes"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Notes
          </label>
          <textarea
            id="guest-notes"
            name="notes"
            value={formData.notes}
            onChange={onChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-700 dark:text-white"
            rows={3}
            placeholder="Any additional information (optional)"
            disabled={isCreating}
          />
        </div>

        {/* Bicycle Description */}
        <div>
          <label
            htmlFor="guest-bicycle-description"
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
          >
            Bicycle Description
          </label>
          <textarea
            id="guest-bicycle-description"
            name="bicycleDescription"
            value={formData.bicycleDescription}
            onChange={onChange}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-700 dark:text-white"
            rows={2}
            placeholder="Bike make, color, or unique markers (optional)"
            disabled={isCreating}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Helps confirm it's the same bicycle when logging repairs.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isCreating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={18} /> {isCreating ? 'Creating...' : 'Create Guest'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default GuestCreateForm;
