# Monthly Report Feature Requirements

## Overview

The Monthly Report feature provides board members, staff, and administrators with a comprehensive summary of Hope's Corner services and guest demographics for any selected month. Reports can be previewed on-screen and downloaded as PDF documents for board meetings and record-keeping.

---

## Access Control

| Role | Access |
|------|--------|
| Admin | ✅ Full access |
| Board | ✅ Full access |
| Staff | ✅ Full access |
| Checkin | ❌ No access |

---

## Functional Requirements

### 1. Month Selection

- Users can select any past month from a dropdown
- Available months span the last 24 months
- Current month is selected by default
- Changing the month clears any previously generated report

### 2. Report Generation

- User clicks "Generate Report" to fetch and display data
- Loading indicator shown while data is being retrieved
- Error messages displayed if report generation fails
- Success notification shown when report is ready

### 3. Report Content

#### Service Statistics

The report displays two columns for each metric:
- **Month**: Total for the selected month only
- **YTD (Year-to-Date)**: Total from January 1st through the end of the selected month

| Metric | Description |
|--------|-------------|
| **Total Meals** | Sum of all meal types served |
| On-Site Hot Meals | Guest meals served during regular dining service |
| Bag Lunch | Bagged lunch meals distributed |
| RV / Safe Park | Meals delivered to RV/Safe Park program participants |
| Day Worker | Meals served to day workers |
| **Showers** | Completed shower appointments |
| **Laundry** | Completed laundry loads |
| **Bike Service** | Bicycle repairs performed (excludes new bicycle gifts) |
| **New Bicycles** | New bicycles gifted to guests |
| **Haircuts** | Haircut services provided |

#### Guest Demographics

Demographics are calculated based on **guests who received meals** during the selected month.

| Category | Details |
|----------|---------|
| **Housing Status** | Breakdown by: Unhoused, Housed, Temp. shelter, RV or vehicle |
| **Top 5 Locations** | Most common guest locations/cities |
| **Age Groups** | Breakdown by: Adult 18-59, Senior 60+, Child 0-17 |

Each demographic category shows:
- Count of guests
- Percentage of total guests served

### 4. PDF Download

- Users can download the report as a PDF file
- PDF filename format: `hopes-corner-report-YYYY-MM.pdf`
- PDF includes:
  - Report title and month/year
  - Service statistics table
  - Guest demographics summary
  - Generation date footer

---

## User Interface

### Report Generator Card
- Title: "Monthly Report Generator"
- Month selector dropdown with calendar icon
- "Generate Report" button (purple)

### Report Preview
- Purple header with report title and selected month
- "Download PDF" button in header
- Service statistics displayed in a clean table format
- Demographics shown in three cards: Housing Status, Top 5 Locations, Age Groups
- Footer showing generation date and data range

### States
- **Empty**: Instructions to select a month and generate report
- **Loading**: Spinner with "Generating..." text
- **Error**: Red alert box with error message
- **Success**: Full report preview with download option

---

## Data Definitions

### "Active Guest" for Demographics
A guest is considered active for a given month if they received **at least one meal** during that month.

### YTD Calculation
Year-to-Date always uses the **calendar year** (January 1st through the end of the selected month).

### New Bicycle Detection
A bicycle record is counted as "New Bicycle" (gifted) if its repair types include "New Bicycle". All other bicycle repairs are counted as "Bike Service".

### Completed Services
- **Showers**: Status = "done"
- **Laundry**: Status = "done", "picked_up", or "offsite_picked_up"
- **Bicycles**: Status = "done" or "in_progress"

---

## Location in App

The Monthly Report tab appears in the Admin Dashboard navigation:
1. Overview
2. Analytics
3. **Monthly Report** ← New
4. Meal Report
5. Monthly Summary
6. Batch Upload (admin only)
7. Data Export
