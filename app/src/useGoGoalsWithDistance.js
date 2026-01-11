import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGoals } from "./goalsStore";

function toRad(v) {
  return (v * Math.PI) / 180;
}

export function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export function useGoGoalsWithDistance({ pollMs = 5000 } = {}) {
  const { goals } = useGoals();

  const [pos, setPos] = useState(null);
  const [lastFixAt, setLastFixAt] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;
      if (status !== "granted") return;

      const pull = async () => {
        try {
          const cur = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!mounted) return;
          setPos({
            latitude: cur.coords.latitude,
            longitude: cur.coords.longitude,
          });
          setLastFixAt(Date.now());
        } catch {}
      };

      await pull();
      pollRef.current = setInterval(pull, pollMs);
    };

    boot();

    return () => {
      mounted = false;
      try {
        if (pollRef.current) clearInterval(pollRef.current);
      } catch {}
    };
  }, [pollMs]);

  const goCoordGoals = useMemo(
    () => (goals || []).filter((g) => g?.coord && !g.done),
    [goals]
  );

  const goGoalsWithDistance = useMemo(() => {
    return goCoordGoals
      .map((g) => {
        if (!pos) return { ...g, meters: null };
        const c = g.coord;
        if (!c) return { ...g, meters: null };

        const meters = distanceMeters(
          { latitude: c.latitude, longitude: c.longitude },
          pos
        );

        return { ...g, meters: Number.isFinite(meters) ? meters : null };
      })
      .sort((a, b) => {
        const am = a.meters == null ? Number.POSITIVE_INFINITY : a.meters;
        const bm = b.meters == null ? Number.POSITIVE_INFINITY : b.meters;
        return am - bm;
      });
  }, [goCoordGoals, pos]);

  return { pos, lastFixAt, goCoordGoals, goGoalsWithDistance };
}
