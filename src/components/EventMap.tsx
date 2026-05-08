import { useEffect, useState } from "react";

export function EventMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const [Comp, setComp] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const L = await import("leaflet");
      const RL = await import("react-leaflet");
      await import("leaflet/dist/leaflet.css");
      // Fix default icon (Leaflet expects images at ./images/)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      if (mounted) setComp({ MapContainer: RL.MapContainer, TileLayer: RL.TileLayer, Marker: RL.Marker, Popup: RL.Popup });
    })();
    return () => { mounted = false; };
  }, []);

  if (!Comp) return <div className="rounded-2xl bg-muted h-[180px] animate-pulse" />;
  const { MapContainer, TileLayer, Marker, Popup } = Comp;
  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height: 180 }}>
      <MapContainer center={[lat, lng]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          {label && <Popup>{label}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}
