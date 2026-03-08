import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'motion/react';
import { Building2, Search, MapPin, Info, ChevronRight, Hash, Route, Accessibility, Clock3 } from 'lucide-react';

import buildingData from "../../imports/building-data.json";

type RoutePoint = [number, number];
type GraphNode = {
  id: string;
  building: string;
  point: RoutePoint;
};

function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;

  const [lat1, lng1] = a;
  const [lat2, lng2] = b;

  const latDiff = toRad(lat2 - lat1);
  const lngDiff = toRad(lng2 - lng1);

  const x =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(lngDiff / 2) * Math.sin(lngDiff / 2);

  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadius * y;
}

function estimateWalkingMinutes(distanceMeters: number, accessibleRoute: boolean): number {
  const walkSpeedMps = accessibleRoute ? 1.15 : 1.35;
  return Math.max(1, Math.round(distanceMeters / walkSpeedMps / 60));
}

function toMinutes(timeValue: string): number | null {
  if (!timeValue) return null;
  const [hour, minute] = timeValue.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function buildCampusGraph(routeBuildings: any[], accessibleRoute: boolean): {
  nodes: GraphNode[];
  adjacency: Map<string, Array<{ to: string; cost: number }>>;
} {
  const nodes: GraphNode[] = routeBuildings.map((building: any, index: number) => ({
    id: `${building.building}-${index}`,
    building: String(building.building),
    point: [building.lat, building.lng],
  }));

  const adjacency = new Map<string, Array<{ to: string; cost: number }>>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const source of nodes) {
    const nearest = nodes
      .filter((target) => target.id !== source.id)
      .map((target) => ({
        target,
        distance: haversineMeters(source.point, target.point),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    for (const { target, distance } of nearest) {
      const baseCost = distance;
      const accessibilityPenalty = accessibleRoute ? 1.08 : 1;
      const longEdgePenalty = distance > 600 ? 1.25 : 1;
      const edgeCost = baseCost * accessibilityPenalty * longEdgePenalty;

      adjacency.get(source.id)?.push({ to: target.id, cost: edgeCost });
      adjacency.get(target.id)?.push({ to: source.id, cost: edgeCost });
    }
  }

  return { nodes, adjacency };
}

function dijkstraPath(
  nodes: GraphNode[],
  adjacency: Map<string, Array<{ to: string; cost: number }>>,
  startBuilding: string,
  endBuilding: string,
): RoutePoint[] {
  const start = nodes.find((node) => node.building === startBuilding);
  const end = nodes.find((node) => node.building === endBuilding);

  if (!start || !end) return [];
  if (start.id === end.id) return [start.point];

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>(nodes.map((node) => node.id));

  for (const node of nodes) {
    distances.set(node.id, Number.POSITIVE_INFINITY);
    previous.set(node.id, null);
  }
  distances.set(start.id, 0);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let currentDist = Number.POSITIVE_INFINITY;

    for (const candidateId of unvisited) {
      const candidateDist = distances.get(candidateId) ?? Number.POSITIVE_INFINITY;
      if (candidateDist < currentDist) {
        currentDist = candidateDist;
        currentId = candidateId;
      }
    }

    if (!currentId || currentDist === Number.POSITIVE_INFINITY) break;
    if (currentId === end.id) break;

    unvisited.delete(currentId);

    const edges = adjacency.get(currentId) || [];
    for (const edge of edges) {
      if (!unvisited.has(edge.to)) continue;
      const altDistance = currentDist + edge.cost;
      if (altDistance < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, altDistance);
        previous.set(edge.to, currentId);
      }
    }
  }

  const pathIds: string[] = [];
  let cursor: string | null = end.id;

  while (cursor) {
    pathIds.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  if (pathIds[0] !== start.id) {
    return [start.point, end.point];
  }

  return pathIds
    .map((pathId) => nodes.find((node) => node.id === pathId)?.point)
    .filter((point): point is RoutePoint => Array.isArray(point));
}

function getIndoorHints(startBuilding: string, endBuilding: string, accessibleRoute: boolean, distanceMeters: number): string[] {
  const hints: string[] = [];
  const start = (startBuilding || '').toUpperCase();
  const end = (endBuilding || '').toUpperCase();

  if (distanceMeters < 120) {
    hints.push('Likely same complex: check indoor corridor connectors before exiting outside.');
  }

  if (accessibleRoute) {
    hints.push('Accessibility mode: prioritize ramp approaches and elevator lobbies over stair shortcuts.');
  }

  if (start.includes('ECS') && end.includes('ECS')) {
    hints.push('ECS corridor tip: use interconnected ECS hallways to minimize outdoor transitions.');
  } else if (end.includes('JSOM') || end.includes('SOM')) {
    hints.push('JSOM tip: enter through main atrium access points for closest elevator access.');
  } else {
    hints.push('Look for the nearest main lobby once inside for the fastest room lookup and vertical access.');
  }

  return hints.slice(0, 3);
}

// Component to handle map fly-to animations
function MapController({ activeBuilding, routePoints }: { activeBuilding: any; routePoints: RoutePoint[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (routePoints.length >= 2) {
      map.fitBounds(routePoints, {
        padding: [70, 70],
        duration: 1.2,
        maxZoom: 17,
      });
      return;
    }

    if (activeBuilding && activeBuilding.lat && activeBuilding.lng) {
      map.flyTo([activeBuilding.lat, activeBuilding.lng], 18, {
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [activeBuilding, map, routePoints]);
  
  return null;
}

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const customIcon = new L.DivIcon({
  className: 'custom-icon',
  html: `<div style="background: linear-gradient(135deg, #22d3ee, #3b82f6); width: 20px; height: 20px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 0 15px rgba(34, 211, 238, 0.8);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

const routeStartIcon = new L.DivIcon({
  className: 'route-start-icon',
  html: `<div style="background: linear-gradient(135deg, #10b981, #22d3ee); width: 18px; height: 18px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); box-shadow: 0 0 15px rgba(16,185,129,0.5);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const routeEndIcon = new L.DivIcon({
  className: 'route-end-icon',
  html: `<div style="background: linear-gradient(135deg, #f97316, #ef4444); width: 18px; height: 18px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.85); box-shadow: 0 0 15px rgba(239,68,68,0.5);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

export function CampusMap() {
  const [search, setSearch] = useState("");
  const [activeBuilding, setActiveBuilding] = useState<any>(null);
  const [routeStartBuilding, setRouteStartBuilding] = useState("");
  const [routeEndBuilding, setRouteEndBuilding] = useState("");
  const [currentClassEndTime, setCurrentClassEndTime] = useState("10:45");
  const [nextClassStartTime, setNextClassStartTime] = useState("11:00");
  const [useAccessibleRoute, setUseAccessibleRoute] = useState(true);
  const [showSmartRoute, setShowSmartRoute] = useState(true);
  
  // Center of UT Dallas
  const center = [32.987, -96.750] as [number, number];

  // Search logic allowing dot/space agnostic matches (e.g. "2120" matches "2.120")
  const normalizedSearch = search.toLowerCase().replace(/[\s.]/g, '');

  const filteredBuildings = useMemo(() => {
    // Include all buildings in the sidebar, even those without lat/lng
    return buildingData.filter((b: any) => {
      if (!normalizedSearch) return true;
      const bName = (b.building || "").toLowerCase().replace(/[\s.]/g, '');
      const matchBuilding = bName.includes(normalizedSearch);
      const matchRoom = (b.rooms || []).some((r: any) => {
        const rName = (r.room || "").toLowerCase().replace(/[\s.]/g, '');
        return rName.includes(normalizedSearch);
      });
      return matchBuilding || matchRoom;
    });
  }, [normalizedSearch]);

  const routeBuildings = useMemo(() => {
    const byBuilding = new Map<string, any>();
    for (const building of buildingData as any[]) {
      const name = (building?.building || '').trim();
      if (!name || !building?.lat || !building?.lng) continue;
      if (!byBuilding.has(name)) {
        byBuilding.set(name, building);
      }
    }

    return [...byBuilding.values()].sort((a, b) => String(a.building).localeCompare(String(b.building)));
  }, []);

  const routeStart = useMemo(
    () => routeBuildings.find((building: any) => building.building === routeStartBuilding) || null,
    [routeBuildings, routeStartBuilding],
  );
  const routeEnd = useMemo(
    () => routeBuildings.find((building: any) => building.building === routeEndBuilding) || null,
    [routeBuildings, routeEndBuilding],
  );

  const routePoints = useMemo(() => {
    if (!showSmartRoute || !routeStart || !routeEnd) return [] as RoutePoint[];
    const { nodes, adjacency } = buildCampusGraph(routeBuildings, useAccessibleRoute);
    return dijkstraPath(nodes, adjacency, routeStart.building, routeEnd.building);
  }, [showSmartRoute, routeStart, routeEnd, routeBuildings, useAccessibleRoute]);

  const routeDistanceMeters = useMemo(() => {
    if (routePoints.length < 2) return 0;
    let total = 0;
    for (let index = 1; index < routePoints.length; index += 1) {
      total += haversineMeters(routePoints[index - 1], routePoints[index]);
    }
    return total;
  }, [routePoints]);

  const walkingMinutes = useMemo(() => estimateWalkingMinutes(routeDistanceMeters, useAccessibleRoute), [routeDistanceMeters, useAccessibleRoute]);

  const classGapMinutes = useMemo(() => {
    const currentEnd = toMinutes(currentClassEndTime);
    const nextStart = toMinutes(nextClassStartTime);
    if (currentEnd == null || nextStart == null) return null;
    return Math.max(0, nextStart - currentEnd);
  }, [currentClassEndTime, nextClassStartTime]);

  const arrivalStatus = useMemo(() => {
    if (classGapMinutes == null || !routeStart || !routeEnd) return null;
    const buffer = classGapMinutes - walkingMinutes;
    if (buffer >= 5) return `On time with ~${buffer} min buffer.`;
    if (buffer >= 0) return `Tight transfer: only ~${buffer} min buffer.`;
    return `Likely late by ~${Math.abs(buffer)} min. Consider leaving early.`;
  }, [classGapMinutes, walkingMinutes, routeStart, routeEnd]);

  const indoorHints = useMemo(() => {
    if (!routeStart || !routeEnd) return [] as string[];
    return getIndoorHints(routeStart.building, routeEnd.building, useAccessibleRoute, routeDistanceMeters);
  }, [routeStart, routeEnd, useAccessibleRoute, routeDistanceMeters]);

  return (
    <div className="h-full w-full flex flex-col md:flex-row relative bg-[#0a0f1c]">
      {/* Sidebar Panel for Map */}
      <div className="w-full md:w-[350px] bg-white/[0.02] backdrop-blur-xl border-r border-white/10 flex flex-col z-[1000] relative">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white flex items-center gap-3 mb-6">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Campus Map
          </h2>
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input 
              type="text" 
              placeholder="Search buildings or rooms (e.g. 2120)..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-[13px] text-white focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all placeholder:text-slate-500 shadow-[0_0_15px_rgba(0,0,0,0.2)]"
            />
          </div>

          <div className="mt-5 p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-slate-100 text-sm font-semibold tracking-wide">
              <Route className="w-4 h-4 text-cyan-400" />
              Dijkstra Routing
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 uppercase tracking-wider">From class building</label>
              <select
                value={routeStartBuilding}
                onChange={(event) => setRouteStartBuilding(event.target.value)}
                className="w-full bg-[#0a1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">Select start</option>
                {routeBuildings.map((building: any) => (
                  <option key={`start-${building.building}`} value={building.building} className="bg-[#0b1220]">
                    {building.building}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-400 uppercase tracking-wider">To next class building</label>
              <select
                value={routeEndBuilding}
                onChange={(event) => setRouteEndBuilding(event.target.value)}
                className="w-full bg-[#0a1120] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">Select destination</option>
                {routeBuildings.map((building: any) => (
                  <option key={`end-${building.building}`} value={building.building} className="bg-[#0b1220]">
                    {building.building}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider">Current class ends</label>
                <input
                  type="time"
                  value={currentClassEndTime}
                  onChange={(event) => setCurrentClassEndTime(event.target.value)}
                  className="w-full bg-[#0a1120] border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider">Next class starts</label>
                <input
                  type="time"
                  value={nextClassStartTime}
                  onChange={(event) => setNextClassStartTime(event.target.value)}
                  className="w-full bg-[#0a1120] border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            <button
              onClick={() => setUseAccessibleRoute((prev) => !prev)}
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                useAccessibleRoute
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-100'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              <Accessibility className="w-4 h-4" />
              Accessibility Route {useAccessibleRoute ? 'On' : 'Off'}
            </button>

            <button
              onClick={() => setShowSmartRoute((prev) => !prev)}
              disabled={!routeStart || !routeEnd}
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold bg-white text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {showSmartRoute ? 'Hide Dijkstra Route' : 'Show Dijkstra Route'}
            </button>

            {routeStart && routeEnd && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="text-[13px] text-white font-medium flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-cyan-400" />
                  ~{walkingMinutes} min walk • {(routeDistanceMeters / 1000).toFixed(2)} km
                </div>
                {arrivalStatus && (
                  <div className="text-xs text-cyan-100/80 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2.5 py-2">
                    {arrivalStatus}
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Indoor path hints</div>
                  {indoorHints.map((hint, hintIndex) => (
                    <div key={`${hint}-${hintIndex}`} className="text-xs text-slate-300 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                      {hint}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden p-4 space-y-2">
          {filteredBuildings.length === 0 ? (
            <div className="text-center text-slate-500 text-[13px] py-10">
              No buildings found matching "{search}"
            </div>
          ) : (
            filteredBuildings.map((b: any, i: number) => {
              const isActive = activeBuilding?.building === b.building;
              const hasCoords = b.lat && b.lng;
              
              // Sort matching rooms to the top
              const sortedRooms = [...(b.rooms || [])].sort((r1, r2) => {
                 if (!normalizedSearch) return 0;
                 const match1 = (r1.room || "").toLowerCase().replace(/[\s.]/g, '').includes(normalizedSearch) ? -1 : 1;
                 const match2 = (r2.room || "").toLowerCase().replace(/[\s.]/g, '').includes(normalizedSearch) ? -1 : 1;
                 return match1 - match2;
              });

              return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className={`w-full text-left rounded-xl border transition-all overflow-hidden ${
                  isActive 
                    ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15"
                }`}
              >
                <button
                  onClick={() => setActiveBuilding(isActive ? null : b)}
                  className="w-full p-4 block"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-200">{b.building || 'Unnamed'}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "text-cyan-400 rotate-90" : "text-slate-600"}`} />
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {b.rooms?.length || 0} Rooms Data
                    </div>
                    {!hasCoords && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md text-slate-400 font-medium tracking-wide">OFF MAP</span>}
                  </div>
                </button>
                
                {isActive && (
                  <div className="px-3 pb-3 max-h-[250px] overflow-y-auto [&::-webkit-scrollbar]:hidden border-t border-white/10 pt-3">
                    <div className="text-[10px] font-semibold text-cyan-400/80 uppercase tracking-widest mb-3 px-1">Room Directory</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {sortedRooms.map((r, idx) => {
                        const isMatch = normalizedSearch && (r.room || "").toLowerCase().replace(/[\s.]/g, '').includes(normalizedSearch);
                        return (
                          <div key={idx} className={`flex justify-between items-center py-2 px-3 rounded-lg border transition-colors ${isMatch ? "bg-cyan-500/20 border-cyan-500/40 text-white shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "bg-white/5 border-white/5 text-slate-300"}`}>
                            <div className="flex items-center gap-2">
                              <Hash className={`w-3.5 h-3.5 ${isMatch ? "text-cyan-400" : "text-slate-500"}`} />
                              <span className="font-medium text-[13px]">{r.room || 'General Area'}</span>
                            </div>
                            {r.capacity ? (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${isMatch ? "bg-cyan-500/30 text-cyan-100" : "bg-white/10 text-slate-400"}`}>
                                {r.capacity} SEATS
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          }))}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-[#061021]">
        <MapContainer 
          center={center} 
          zoom={16} 
          zoomControl={false}
          className="w-full h-full z-10"
        >
          {/* Dark theme tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <ZoomControl position="bottomright" />
          <MapController activeBuilding={activeBuilding} routePoints={routePoints} />

          {routePoints.length >= 2 && (
            <Polyline
              positions={routePoints}
              pathOptions={{
                color: useAccessibleRoute ? '#22d3ee' : '#f97316',
                weight: 5,
                opacity: 0.9,
                dashArray: useAccessibleRoute ? '6 6' : undefined,
              }}
            />
          )}

          {routeStart && routeEnd && routePoints.length >= 2 && (
            <>
              <Marker position={[routeStart.lat, routeStart.lng]} icon={routeStartIcon}>
                <Popup>Start: {routeStart.building}</Popup>
              </Marker>
              <Marker position={[routeEnd.lat, routeEnd.lng]} icon={routeEndIcon}>
                <Popup>Destination: {routeEnd.building}</Popup>
              </Marker>
            </>
          )}
          
          {filteredBuildings.map((b: any, i: number) => {
            if (!b.lat || !b.lng) return null; // Don't try to render marker if no coords
            return (
            <Marker 
              key={i} 
              position={[b.lat, b.lng]} 
              icon={customIcon}
              eventHandlers={{
                click: () => {
                  setActiveBuilding(b);
                }
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[200px]">
                  <h3 className="text-[16px] font-bold text-slate-800 mb-1 border-b pb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-600" />
                    Building {b.building || 'Unnamed'}
                  </h3>
                  <div className="text-[12px] text-slate-600 mt-2 mb-3">
                    <span className="font-semibold">Coordinates:</span><br/>
                    {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                  </div>
                  
                  <div className="max-h-[150px] overflow-y-auto pr-1 text-[12px]">
                    <div className="font-semibold text-slate-700 mb-1">Rooms & Capacities:</div>
                    {(b.rooms || []).map((r: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                        <span className="font-medium text-slate-600">{r.room || 'General'}</span>
                        <span className="text-cyan-600 font-medium bg-cyan-50 px-2 py-0.5 rounded-md text-[10px]">
                          {r.capacity ? `${r.capacity} seats` : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MapContainer>
        
        {/* Active Building Overlay Widget (Optional extra detail) */}
        {activeBuilding && activeBuilding.lat && activeBuilding.lng && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute top-6 right-6 z-[1000] bg-[#0a0f1c]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-2xl w-80 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] pointer-events-none hidden lg:block"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{activeBuilding.building}</h3>
                  <div className="text-[11px] text-slate-400 font-medium tracking-wide">UNIVERSITY OF TEXAS AT DALLAS</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Rooms</div>
                <div className="text-lg font-semibold text-white">{activeBuilding.rooms?.length || 0}</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Max Capacity</div>
                <div className="text-lg font-semibold text-white">
                  {Math.max(0, ...(activeBuilding.rooms || []).map((r:any) => r.capacity || 0)) || 'N/A'}
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />
            
            <div className="text-[12px] text-slate-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-500" />
              Click marker on map for full room directory.
            </div>
          </motion.div>
        )}
      </div>
      
      {/* CSS for Leaflet elements inside dark theme */}
      <style>{`
        .leaflet-container {
          background: #050b14;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .custom-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.95);
        }
        .leaflet-control-zoom a {
          background-color: #1e293b !important;
          color: #94a3b8 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #334155 !important;
          color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
