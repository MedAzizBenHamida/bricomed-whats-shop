import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Extract the storage path from a signed/public URL of our bucket, else null. */
export function storagePathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1 || !url.includes("/storage/v1/object/")) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

export async function removeStorageImages(urls: string[]) {
  const paths = urls.map(storagePathFromUrl).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

export function ProductImagesInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation(["admin", "common"]);
  const [urlDraft, setUrlDraft] = useState("");

  const addUrl = () => {
    const u = urlDraft.trim();
    if (!u) return;
    onChange([...value, u]);
    setUrlDraft("");
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <Label>{t("admin:products.dialog.images")}</Label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((src, i) => (
            <div key={`${src}-${i}`} className="relative h-24 w-24 overflow-hidden rounded-md border bg-muted">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={t("common:actions.delete")}
                className="absolute end-1 top-1 rounded bg-background/90 p-1 text-destructive shadow"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3">
        <div className="rounded-md border border-dashed p-3">
          <p className="mb-2 text-sm font-medium">🔗 {t("admin:products.images.urlTitle")}</p>
          <div className="flex gap-2">
            <Input
              value={urlDraft}
              placeholder="https://…"
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUrl();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addUrl}>
              <Link2 className="h-4 w-4" />
              {t("admin:products.images.addUrl")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
