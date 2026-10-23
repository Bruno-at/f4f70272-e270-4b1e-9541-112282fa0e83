# Report rendering
- Render report previews from the same PDF builder used for download and print; separate HTML layouts drift from the final document.
- Normalize uploaded report output to A4 portrait and clear all mapped sample regions before drawing values; masks must never erase newly drawn data.
- Resolve academic level centrally, preferring explicit class level fields and falling back to legacy names only when absent; the shared PDF builder selects school-scoped active templates by level and the custom renderer rejects mismatches so every report path is consistent.