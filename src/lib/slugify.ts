/**
 * Sanitize a product name to be used as a safe URL slug.
 * Removes illegal characters for Windows filesystem and URL safety.
 */
export function slugify(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove characters that break URLs: < > : " / \ | ? * # % & ( ) [ ]
    .replace(/[<>:"/\\|?*#%&()[\]]/g, '')
    // Replace multiple spaces or dashes with a single dash
    .replace(/[\s-]+/g, '-')
    // Final trim of dashes from start/end
    .replace(/^-+|-+$/g, '');
}