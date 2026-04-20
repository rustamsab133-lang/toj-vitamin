/**
 * Sanitize a product name to be used as a safe URL slug.
 * Removes illegal characters for Windows filesystem and URL safety.
 */
export function slugify(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    // Remove illegal Windows filename characters: < > : " / \ | ? *
    .replace(/[<>:"/\\|?*]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ');
}