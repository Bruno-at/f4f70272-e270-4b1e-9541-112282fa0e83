# Extra template fields
- [x] Add template-scoped definitions and typed school/student period values with legacy compatibility.
- [x] Improve automatic mapping, detection review and manual field management.
- [x] Use saved values in the shared PDF renderer; verify scoped resolution and detection rules.
- [ ] Verify signed-in field saving and generated reports with school records. Blocked: external unmanaged authentication is unavailable for automated checks.

# Report output correction
- [x] Use the generated PDF for an A4 portrait preview.
- [x] Correct margins, fitted text, and structured subject rows in downloaded and printed reports.
- [x] Reserve the print window during the click; verify sample PDF and desktop/mobile preview.
- [ ] Verify signed-in report download and print with school records. Blocked: external unmanaged authentication is unavailable for automated checks.

# Marksheet and template education levels
- [x] Remove marksheet statistics/comment sections and expand the grading scale.
- [x] Require and allow correcting uploaded template levels; activate separately per level.
- [x] Match report generation to class level and test mismatch prevention.
- [ ] Verify signed-in template upload and generation. Blocked: external unmanaged authentication is unavailable for automated checks.
# Fixed template + manual field mapping
- [x] Remove AI/OCR detection; upload stores the original and opens mapping.
- [x] Click-to-assign on the real template preview and a mapped/unmapped field panel.
- [x] Custom fields with label, type (incl. multiline, percentage), description, scope, default, position; confirm before removal.
- [x] Keep the template's page size/orientation in preview, download and print.
- [ ] Verify signed-in upload, mapping save and generated report. Blocked: external unmanaged authentication is unavailable for automated checks.

# Subject unassignment cleanup
- [x] Removing a subject from a student deletes that student's marks for it in the same database step.
- [x] Reports (O-Level and A-Level preview, download, print) show only the student's assigned subjects.
- [x] Block saving marks for unassigned subjects.
- [ ] Verify signed-in unassignment and report regeneration. Blocked: external unmanaged authentication is unavailable for automated checks.
