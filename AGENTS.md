# Extra template fields
- Store new values by field-definition ID and template, keeping legacy school-keyed definitions and student values as read fallbacks; this prevents collisions between uploaded templates without deleting old records.
- Map template fields manually only (click-to-assign plus a mapping panel); no AI, OCR or label-guessing, so uploads stay free and predictable. Mappings and display settings live in `report_templates.fields`, never in the uploaded file.
- Resolve extra values in the shared PDF renderer with period-specific values overriding all-period values; this keeps preview, print and download consistent.

# Report rendering
- Render report previews from the same PDF builder used for download and print; separate HTML layouts drift from the final document.
- Keep an uploaded template's own page size and orientation in output; clear mapped sample regions (unless a field opts out) before drawing values, and masks must never erase newly drawn data.
- Resolve academic level centrally, preferring explicit class level fields and falling back to legacy names only when absent; the shared PDF builder selects school-scoped active templates by level and the custom renderer rejects mismatches so every report path is consistent.- The built-in A-Level design draws only record data; the shared builder loads school grading bands and the next term's start date before drawing, so the layout never carries sample values.
