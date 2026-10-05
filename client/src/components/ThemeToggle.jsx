function ThemeToggle({ theme, onToggle, className = "" }) {
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === "dark"}
    >
      {theme === "dark" ? "☀ Light theme" : "☾ Dark theme"}
    </button>
  );
}

export default ThemeToggle;
