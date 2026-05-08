import { useEffect, useRef, useState } from "react";
import { Search, Loader2, MapPin } from "lucide-react";

export type Place = { name: string; address: string; lat: number; lng: number };

export function AddressSearch({ value, onSelect }: { value?: Place | null; onSelect: (p: Place) => void }) {
  const [q, setQ] = useState(value?.name ?? "");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useRef<number | null>(null);

  useEffect(() => { if (value) setQ(value.name); }, [value]);

  useEffect(() => {
    if (!q || q.length < 3 || (value && q === value.name)) { setResults([]); return; }
    if (t.current) window.clearTimeout(t.current);
    t.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=br&q=${encodeURIComponent(q)}`,
          { headers: { "Accept-Language": "pt-BR" } },
        );
        const data = await res.json();
        setResults(
          (data as any[]).map((d) => ({
            name: d.display_name.split(",")[0],
            address: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
          }))
        );
        setOpen(true);
      } catch { setResults([]); }
      setLoading(false);
    }, 500);
    return () => { if (t.current) window.clearTimeout(t.current); };
  }, [q, value]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="input pl-10"
          placeholder="Busque um endereço, arena, parque..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-2xl border border-border bg-card shadow-lg max-h-72 overflow-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(r); setQ(r.name); setOpen(false); }}
              className="w-full flex items-start gap-2 p-3 text-left hover:bg-muted border-b border-border last:border-0"
            >
              <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground truncate">{r.address}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
