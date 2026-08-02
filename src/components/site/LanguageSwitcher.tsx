import { LANGUAGES } from "@/i18n";
import { useLanguage } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLanguage } = useLanguage();

  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border p-0.5", className)}>
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLanguage(l.code)}
          aria-pressed={lang === l.code}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            lang === l.code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
