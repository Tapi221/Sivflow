/**
 * Utility functions for avatar display
 */

// Elegant pastel/soft palette matching the app's theme
const AVATAR_COLORS = [
  "#E0F2F1", // Teal 50
  "#E3F2FD", // Blue 50
  "#F3E5F5", // Purple 50
  "#FCE4EC", // Pink 50
  "#FFEBEE", // Red 50
  "#FFF3E0", // Orange 50
  "#FFF8E1", // Amber 50
  "#F1F8E9", // Light Green 50
];
const TEXT_COLORS = [
  "#00695C", // Teal 800
  "#1565C0", // Blue 800
  "#6A1B9A", // Purple 800
  "#AD1457", // Pink 800
  "#C62828", // Red 800
  "#EF6C00", // Orange 800
  "#FF8F00", // Amber 800
  "#2E7D32", // Light Green 800
];



/**
 * Generates a deterministic color pair (bg, text) from a string input (e.g. username)
 */
const getAvatarColors = (name: string | undefined | null) => {
  if (!name) return { bg: "#F8FAFB", text: "#64748B" }; // Slate-400 equivalent default

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash % AVATAR_COLORS.length);

  return {
    bg: AVATAR_COLORS[index],
    text: TEXT_COLORS[index],
  };
};
/**
 * Get initials from display name
 */
const getInitials = (name: string | undefined | null) => {
  if (!name) return "U";
  return name.charAt(0).toUpperCase();
};



export { getAvatarColors, getInitials };
