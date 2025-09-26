# Attendance CSV Import Feature

## Overview
The Attendance CSV Import feature allows administrators to bulk import legacy attendance data from other programs into Hope's Corner Check-in App. This feature supports the six main service types: Meal, Shower, Laundry, Bicycle, Hair Cut, and Holiday.

## Accessing the Feature
1. Log in as an administrator
2. Navigate to the Admin Dashboard
3. Click on the "Batch Upload" tab
4. Scroll down to the "Batch Attendance Upload" section

## CSV Format Requirements

### Required Columns
- **Attendance_ID**: Unique identifier for each attendance record
- **Guest_ID**: Required - must match an existing guest in the system
- **Count**: Number of services/items (integer, defaults to 1 if empty)
- **Program**: Type of service (must match supported program types)
- **Date_Submitted**: Date of service (YYYY-MM-DD or MM/DD/YYYY format)

## Supported Program Types

All programs are guest-specific and require a valid Guest_ID:

- **Meal**: Meal service for individual guests
- **Shower**: Shower booking for individual guests
- **Laundry**: Laundry service for individual guests
- **Bicycle**: Bicycle repair service for individual guests
- **Hair Cut**: Haircut service for individual guests
- **Holiday**: Holiday-related services for individual guests

## CSV Template Example

```csv
Attendance_ID,Guest_ID,Count,Program,Date_Submitted
ATT001,123,1,Meal,2024-01-15
ATT002,456,1,Shower,2024-01-15
ATT003,789,1,Laundry,01/15/2024
ATT004,123,1,Bicycle,2024-01-15
ATT005,456,1,Hair Cut,2024-01-15
ATT006,789,1,Holiday,01/16/2024
```

## Data Validation

### Guest ID Validation
- Guest_ID is required for all programs
- Guest IDs are matched against both the internal ID and any imported guest_id field
- Error will be shown if Guest_ID is missing or not found

### Date Format Validation
- Accepts YYYY-MM-DD format (e.g., 2024-01-15)
- Accepts MM/DD/YYYY format (e.g., 01/15/2024)
- Invalid date formats will show an error with row number

### Program Type Validation
- Program names are case-insensitive
- Invalid program types will show available options
- Must match exactly one of the supported program types

## Import Process

1. **File Selection**: Click "Upload Attendance CSV" and select your CSV file
2. **Validation**: The system validates:
   - CSV format and structure
   - Required columns presence
   - Data types and formats
   - Guest ID existence
   - Date formats
   - Program type validity
3. **Import**: Valid records are imported into the appropriate service categories
4. **Results**: Success/error summary is displayed with details

## Error Handling

### Common Error Messages
- "Missing required column(s)": CSV missing required columns
- "Invalid program type": Program name not recognized
- "Guest with ID not found": Guest_ID doesn't exist in system
- "Invalid date format": Date doesn't match accepted formats
- "Guest_ID is required for program": Missing Guest_ID

### Partial Success
If some records fail validation, successful records are still imported. The error message will show:
- Number of successful imports
- Number of failed records
- First few error messages

## Best Practices

### Data Preparation
1. **Clean Guest IDs**: Ensure Guest_IDs match existing records in the system
2. **Consistent Dates**: Use consistent date format throughout the file
3. **Validate Programs**: Check program names against supported types (case-insensitive)
4. **Test Small Batches**: Start with small test files to validate format

### Guest Management
1. **Import Guests First**: If importing legacy data, import guest records before attendance data
2. **Guest ID Mapping**: Maintain a mapping between legacy and new Guest IDs
3. **Backup Data**: Always backup existing data before large imports

## Troubleshooting

### "Guest not found" Errors
- Verify Guest_ID format matches your guest records
- Check if guests were imported with different ID format
- Use the Guest Batch Upload feature first if needed

### Date Import Issues
- Excel may change date formats when saving CSV
- Use text editors to verify CSV format
- Save as CSV UTF-8 to avoid encoding issues

### Large File Issues
- Break large files into smaller batches (recommended: <1000 records)
- Monitor browser console for performance issues
- Consider importing during off-peak hours

## Sample Files
- A sample CSV file is available at `/public/attendance_sample.csv`
- Download the template from the upload interface for the correct format

## Technical Notes

### Data Storage
- Records are stored in Firebase Firestore collections
- Local storage backup maintained for offline access
- Records are timestamped and include audit trails

### Performance Considerations
- Large imports may take time to process
- Each record is validated individually
- Firebase write operations are batched for efficiency

## Support
For technical issues or questions about the CSV import feature, contact the system administrator or refer to the main application documentation.