'use client';

import { useMemo } from 'react';
import { GoogleMap as GMap, Marker, useJsApiLoader } from '@react-google-maps/api';

type Props = {
  lat: number;
  lng: number;
  height?: number | string;
  zoom?: number;
};

export default function GoogleMap({ lat, lng, height = 320, zoom = 14 }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-maps-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
  });

  const center = useMemo(() => ({ lat, lng }), [lat, lng]);

  if (loadError) {
    return <div className="text-sm text-red-600">Failed to load Google Maps.</div>;
  }

  if (!isLoaded) {
    return <div className="text-sm text-gray-500">Loading map…</div>;
  }

  return (
    <div style={{ width: '100%', height }}>
      <GMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={zoom}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
        }}
      >
        <Marker position={center} />
      </GMap>
    </div>
  );
}
