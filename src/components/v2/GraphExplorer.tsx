import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { Search, Sparkles, X } from 'lucide-react';
import { IconButton } from './ui/IconButton.tsx';
import { Pill } from './ui/Pill.tsx';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import {
  computeEgoNetworkCanonical,
  intersectNeighborhoods,
  isStaple,
  mostConstrainingPick,
  DEFAULT_DEGREE_CAP,
} from '../../utils/graphExplorer.ts';
import { getAtlasGraph, getProfile } from '../../utils/atlas.ts';
import { MAX_SLOTS } from '../../hooks/useSlots.ts';
import { CATEGORY_COLORS, TASTE_COLORS } from '../../utils/colors.ts';
import { categoryLabel } from '../../utils/categoryLabels.ts';
import { ingredientProfiles } from '../../data/ingredientProfiles.ts';
import type { IngredientProfile } from '../../types.ts';

// The Graph Explorer ("Atlas view"): the flavor map made visible. An ego network centered
// on one ingredient — its partners around it plus the edges *among* those partners, which
// is what reveals clusters. Click a node to hop the whole database like Wikipedia links.
// Build mode turns the same view into a constraint-first composer: pick anchors and watch
// the mutual-compatibility algorithm prune the candidate pool live.
//
// ⚠️ This is a read-only visualization of utils/graphExplorer.ts, which reads the canonical
// flavor map and never relaxes it. Every edge drawn is a real pairing; every node that
// survives a prune is mutually compatible with all picks. No "nearby but not compatible"
// nodes, ever.

const TASTE_KEYS = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'] as const;
const NEUTRAL_NODE = '#9aa3b2';
/** Build-mode picks are unlimited — every added pick only tightens the intersection
 *  pool (and the dead-end guidance catches an empty one). Only the Classic-mode handoff
 *  is capped: the main app's slot system (roles, sliders, hero display, generation) is
 *  built around MAX_SLOTS slots, so "Use this combo" needs the picks to fit. */
const HANDOFF_MAX = MAX_SLOTS;
type Lens = 'category' | 'taste';

interface SimNode extends SimulationNodeDatum {
  id: string;
  isCenter: boolean;
  isPick: boolean;
  profile: IngredientProfile | null;
  degree: number;
  r: number;
}
interface SimLink extends SimulationLinkDatum<SimNode> {
  toCenter: boolean;
  /** Rim ties (partner↔partner / candidate↔candidate): drawn only for the active node. */
  rim: boolean;
}

/** Dominant-taste color for the taste lens: the highest flavor dimension, or neutral gray
 *  when nothing clears the threshold (a genuinely mild ingredient shouldn't be miscolored). */
const dominantTasteColor = (profile: IngredientProfile | null): string => {
  if (!profile) return NEUTRAL_NODE;
  let bestKey: (typeof TASTE_KEYS)[number] | null = null;
  let bestVal = 0;
  for (const k of TASTE_KEYS) {
    const v = (profile.flavorProfile as Record<string, number>)[k] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  if (!bestKey || bestVal < 3) return NEUTRAL_NODE;
  return TASTE_COLORS[bestKey];
};

const nodeColor = (node: SimNode, lens: Lens): string => {
  if (lens === 'taste') return dominantTasteColor(node.profile);
  const cat = node.profile?.category;
  return (cat && CATEGORY_COLORS[cat]) || NEUTRAL_NODE;
};

/** Partner-node radius, gently degree-scaled like the validated mockup — versatile hubs
 *  (parmesan) read bigger than one-note loners (brown butter) without dwarfing them. */
const partnerRadius = (degree: number): number => 10 + Math.min(8, Math.sqrt(degree) * 0.5);

/** Cluster key for the active lens: same bucketing as the node color, so nodes gather
 *  with the neighbors they share a color with (category groups, or dominant-taste
 *  groups under the taste lens). Purely a layout hint — never a pairing statement. */
const groupKeyOf = (profile: IngredientProfile | null, lens: Lens): string =>
  lens === 'taste' ? dominantTasteColor(profile) : profile?.category ?? 'Other';

/** Anchor pull per node role. The center is held firmly mid-canvas (strong enough to
 *  rubber-band back from a drag, soft enough to feel organic — it replaces the old hard
 *  fx/fy pin); picks cluster near the middle; partners drift gently to their group. */
const anchorStrength = (n: SimNode): number => (n.isCenter ? 0.5 : n.isPick ? 0.2 : 0.09);

interface GraphModel {
  nodes: Array<{ name: string; isCenter: boolean; isPick: boolean; profile: IngredientProfile | null; degree: number }>;
  edges: Array<{ source: string; target: string; toCenter: boolean; rim: boolean }>;
  /** Partner/candidate count before any degree cap. */
  total: number;
  /** Names dropped by the degree cap (the "+N more" list). */
  hidden: string[];
}

interface GraphExplorerProps {
  /** Ingredient the graph is centered on; null renders nothing (closed). */
  ingredient: string | null;
  onClose: () => void;
  /** Re-center the graph on another ingredient (pushes history via useGraphRoute). */
  onNavigate: (name: string) => void;
  /** Hand a finished build-mode combo to the main app selection. */
  onUseCombo: (names: string[]) => void;
  /** Open the read-only list Atlas for full detail (optional). */
  onOpenAtlas?: (name: string) => void;
  /** Seed a fresh open in build mode with these picks (the "see this combo on the
   *  map" entry). Applied only on the closed→open transition, never on in-graph
   *  hops, so exiting build mode or re-centering behaves exactly as an unseeded
   *  open would. Names not in the graph are dropped. */
  initialPicks?: string[] | null;
  isMobile: boolean;
}

export const GraphExplorer: React.FC<GraphExplorerProps> = ({
  ingredient,
  onClose,
  onNavigate,
  onUseCombo,
  onOpenAtlas,
  initialPicks = null,
  isMobile,
}) => {
  const center = ingredient ? ingredient.trim().toLowerCase() : null;
  const { isDarkMode } = useTheme();

  // Taste is the default lens — it matches how the standard view sorts ingredients.
  const [lens, setLens] = useState<Lens>('taste');
  const [buildMode, setBuildMode] = useState(false);
  // "Hide staples": drop ubiquitous hubs (garlic, lemon, olive oil…) from the DRAWN
  // pool so distinctive partners get the room. Persists across hops and mode switches
  // (unlike the legend filter) — it's a noise preference, not a per-view query.
  const [hideStaples, setHideStaples] = useState(false);
  const [picks, setPicks] = useState<string[]>([]);
  const [focusName, setFocusName] = useState<string | null>(center);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [morePanelOpen, setMorePanelOpen] = useState(false);
  // Legend filter: tapped legend groups (lens-specific keys from groupKeyOf). Empty =
  // show everything. Narrows which partners/candidates are DRAWN — a view filter over
  // pool inputs, never a change to the pairing math.
  const [groupFilter, setGroupFilter] = useState<Set<string>>(new Set());

  // Reset transient view state whenever the center changes (a hop or a fresh open).
  // On the closed→open transition only, an `initialPicks` seed starts the session in
  // build mode with those picks (the "see this combo on the map" entry); a close
  // clears build state so the next plain open starts in explore mode, not with a
  // stale build. Seeding changes which picks the intersection runs over — a pool
  // input, never the pairing math.
  const prevCenterRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevCenterRef.current;
    prevCenterRef.current = center;
    setFocusName(center);
    setMorePanelOpen(false);
    setSearch('');
    setSearchOpen(false);
    setGroupFilter(new Set());
    if (!center) {
      setBuildMode(false);
      setPicks([]);
      return;
    }
    if (prev === null) {
      const g = getAtlasGraph();
      const seeds = Array.from(
        new Set((initialPicks ?? []).map(n => n.trim().toLowerCase()).filter(n => g.has(n)))
      );
      setBuildMode(seeds.length > 0);
      setPicks(seeds);
    }
  }, [center, initialPicks]);

  // Leaving build mode clears the anchors; entering seeds it with the current center.
  const enterBuild = useCallback(() => {
    if (!center) return;
    setPicks([center]);
    setBuildMode(true);
    setFocusName(center);
  }, [center]);
  const exitBuild = useCallback(() => {
    setBuildMode(false);
    setPicks([]);
    setFocusName(center);
  }, [center]);

  const graph = getAtlasGraph();

  // Stable memo key for the filter: a Set's identity changes on every toggle, and the
  // group keys only mean anything under the lens that minted them.
  const filterKey = groupFilter.size
    ? `${lens}|${Array.from(groupFilter).sort().join('|')}`
    : '';

  // --- The graph model: ego network (explore) or picks + pruned candidates (build) -----
  const model: GraphModel = useMemo(() => {
    if (!center) return { nodes: [], edges: [], total: 0, hidden: [] };

    // Desktop has room for a fuller neighborhood than a phone (Matt's call after using
    // both); the "+N more" list still catches the overflow either way.
    const degreeCap = isMobile ? DEFAULT_DEGREE_CAP : 40;

    // Tapped legend groups and the staples toggle narrow the drawn pool BEFORE the
    // degree cap, so filtering digs deeper into what's left (hiding garlic-tier hubs
    // surfaces partners the default mix never had room for).
    const include =
      groupFilter.size > 0 || hideStaples
        ? (n: string) =>
            (!hideStaples || !isStaple(graph, n)) &&
            (groupFilter.size === 0 || groupFilter.has(groupKeyOf(getProfile(n), lens)))
        : undefined;

    if (buildMode) {
      const candidateSet = intersectNeighborhoods(graph, picks);
      // `total` stays the unfiltered pool size — the honest "N compatible" number.
      const total = candidateSet.size;
      // Cap the candidate ring for readability, keeping the highest-degree (most
      // versatile) candidates; the rest live behind the "+N more" list.
      let candidates = Array.from(candidateSet)
        .filter(n => !include || include(n))
        .sort(
          (a, b) => (graph.get(b)?.size ?? 0) - (graph.get(a)?.size ?? 0) || a.localeCompare(b)
        );
      let hidden: string[] = [];
      if (candidates.length > degreeCap) {
        hidden = candidates.slice(degreeCap).sort((a, b) => a.localeCompare(b));
        candidates = candidates.slice(0, degreeCap);
      }

      const nodes = [
        ...picks.map(name => ({
          name,
          isCenter: name === center,
          isPick: true,
          profile: getProfile(name),
          degree: graph.get(name)?.size ?? 0,
        })),
        ...candidates.map(name => ({
          name,
          isCenter: false,
          isPick: false,
          profile: getProfile(name),
          degree: graph.get(name)?.size ?? 0,
        })),
      ];

      const edges: GraphModel['edges'] = [];
      // Anchor-to-anchor edges: the picks form a mutually-compatible clique by construction.
      for (let i = 0; i < picks.length; i++) {
        for (let j = i + 1; j < picks.length; j++) {
          edges.push({ source: picks[i], target: picks[j], toCenter: true, rim: false });
        }
      }
      // Each candidate pairs with every pick (that's what the intersection guarantees).
      // intersectNeighborhoods already excludes the picks themselves, so candidates and
      // picks never overlap.
      candidates.forEach(c => {
        // Structural, not rim: the candidate↔pick spokes are the receipt that a
        // candidate matches the whole combo, so they stay visible at rest.
        picks.forEach(p => edges.push({ source: c, target: p, toCenter: false, rim: false }));
      });
      // Rim edges among the candidates themselves — same as explore mode's partner-to-
      // partner edges. They reveal cluster structure and make hovering a candidate show
      // its mutual connections instead of dimming everything else out.
      const candidateVisible = new Set(candidates);
      const seenRim = new Set<string>();
      candidates.forEach(c => {
        graph.get(c)?.forEach(n => {
          if (!candidateVisible.has(n)) return;
          const key = c < n ? `${c} ${n}` : `${n} ${c}`;
          if (seenRim.has(key)) return;
          seenRim.add(key);
          edges.push({ source: c, target: n, toCenter: false, rim: true });
        });
      });
      return { nodes, edges, total, hidden };
    }

    const net = computeEgoNetworkCanonical(center, { degreeCap, include });
    return {
      nodes: net.nodes.map(n => ({
        name: n.name,
        isCenter: n.isCenter,
        isPick: false,
        profile: n.profile,
        degree: n.degree,
      })),
      edges: net.edges.map(e => ({ ...e, rim: !e.toCenter })),
      total: net.totalPartners,
      hidden: net.hiddenPartners,
    };
    // groupFilter + lens enter via filterKey (a Set's identity churns every toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, buildMode, picks, graph, isMobile, filterKey, hideStaples]);

  // --- Canvas + d3-force simulation ----------------------------------------------------
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const sizeRef = useRef({ w: 0, h: 0 });
  // Cluster layout: per-node anchor targets (group centroids on a wide ellipse). Read
  // dynamically by the force accessors via this ref so resize can retarget in place;
  // rebuilt by the sim effect (owns the node list) and refreshed by resize().
  const layoutRef = useRef<{ anchor: (n: SimNode) => { x: number; y: number } } | null>(null);
  const buildLayoutRef = useRef<((w: number, h: number) => void) | null>(null);

  // Live view state read inside the render loop / pointer handlers without re-subscribing.
  const viewRef = useRef({ lens, focusName, isDarkMode, isMobile, hovered: null as string | null });
  viewRef.current.lens = lens;
  viewRef.current.focusName = focusName;
  viewRef.current.isDarkMode = isDarkMode;
  viewRef.current.isMobile = isMobile;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { w, h } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const { lens: L, focusName: focus, hovered, isDarkMode: dark, isMobile: mobile } = viewRef.current;
    // Desktop dimming follows the LIVE hover only — hover off a node and the graph
    // returns to fully lit (the info panel still remembers the last ingredient). Mobile
    // has no hover, so the tap-focus drives the highlight there instead.
    const active = hovered ?? (mobile ? focus : null);
    const activeNeighbors = new Set<string>();
    if (active) {
      linksRef.current.forEach(l => {
        const s = (l.source as SimNode).id;
        const t = (l.target as SimNode).id;
        if (s === active) activeNeighbors.add(t);
        if (t === active) activeNeighbors.add(s);
      });
    }
    const dim = active != null;

    // Edges
    linksRef.current.forEach(l => {
      const s = l.source as SimNode;
      const t = l.target as SimNode;
      if (s.x == null || t.x == null) return;
      // Rim ties draw only for the active node: at rest the view shows just the
      // structural spokes; hover (or tap-focus on mobile) reveals a node's own web.
      // This is what keeps ~700 cross-edges from reading as a hairball.
      if (l.rim && !(active && (s.id === active || t.id === active))) return;
      const lit = !dim || s.id === active || t.id === active;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x!, t.y!);
      ctx.strokeStyle = lit
        ? l.toCenter
          ? 'rgba(120,120,130,0.55)'
          : l.rim
            ? 'rgba(150,150,160,0.5)' // revealed on hover — the payoff, so draw it clearly
            : 'rgba(150,150,160,0.32)'
        : 'rgba(150,150,160,0.06)';
      ctx.lineWidth = lit && l.toCenter ? 1.4 : 1;
      ctx.stroke();
    });

    // Nodes
    nodesRef.current.forEach(n => {
      if (n.x == null || n.y == null) return;
      const isActive = n.id === active;
      const lit = !dim || isActive || activeNeighbors.has(n.id);
      const color = nodeColor(n, L);
      ctx.globalAlpha = lit ? 1 : 0.18;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      // One fill grammar across both modes: solid = "in your hand" (the explore
      // center, or a build-mode pick), hollow = compatible possibility (partner or
      // candidate). The hollow background fill masks edges passing underneath.
      if (n.isCenter || n.isPick) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.fillStyle = dark ? '#111827' : '#f9fafb';
        ctx.fill();
        ctx.lineWidth = isActive ? 2.5 : 2;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Labels: every node gets one — the degree cap keeps the view at mockup density,
      // and an unlabeled dot is useless to a cook. Theme-aware ink with a background-
      // colored halo so labels stay legible over edge clutter in both modes.
      const big = n.isCenter || n.isPick || isActive;
      ctx.font = `${big ? 600 : 400} ${big ? 13 : 12}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = lit ? 1 : 0.15;
      const label = n.id;
      const y = n.y + n.r + 4;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = dark ? 'rgba(17,24,39,0.85)' : 'rgba(255,255,255,0.88)';
      ctx.strokeText(label, n.x, y);
      ctx.fillStyle = big
        ? dark ? '#f9fafb' : '#1f2430'
        : dark ? '#d1d5db' : '#4b5563';
      ctx.fillText(label, n.x, y);
      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }, []);

  // The simulation only repaints while it's warm (alpha > 0). Lens, focus, and theme
  // changes must repaint on their own once the graph has settled.
  useEffect(() => {
    draw();
  }, [lens, focusName, isDarkMode, draw]);

  // (Re)build the simulation whenever the model changes. Positions of surviving nodes are
  // preserved so a prune reads as the pool settling, not a full reshuffle.
  useEffect(() => {
    if (!center || model.nodes.length === 0) {
      simRef.current?.stop();
      nodesRef.current = [];
      linksRef.current = [];
      draw();
      return;
    }
    // sizeRef can be stale-zero on the very first in-app open (the resize effect hasn't
    // fired for the freshly-mounted canvas yet) — measure the container directly so the
    // simulation never seeds around a phantom 300×300 origin in an unsized canvas.
    let { w, h } = sizeRef.current;
    if ((!w || !h) && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        w = rect.width;
        h = rect.height;
        sizeRef.current = { w, h };
      }
    }
    const cx = w / 2 || 300;
    const cy = h / 2 || 300;

    const simNodes: SimNode[] = model.nodes.map(n => {
      const prev = positionsRef.current.get(n.name);
      return {
        id: n.name,
        isCenter: n.isCenter,
        isPick: n.isPick,
        profile: n.profile,
        degree: n.degree,
        r: n.isCenter ? 26 : n.isPick ? 18 : partnerRadius(n.degree),
        x: prev?.x ?? cx + (Math.random() - 0.5) * 240,
        y: prev?.y ?? cy + (Math.random() - 0.5) * 240,
        // No hard pin on the center — a strong anchor (see anchorStrength) holds it
        // mid-canvas AND rubber-bands it back after a drag instead of letting the
        // user strand it in a corner.
      };
    });
    const byId = new Map(simNodes.map(n => [n.id, n]));
    const simLinks: SimLink[] = model.edges
      .filter(e => byId.has(e.source) && byId.has(e.target))
      .map(e => ({ source: e.source, target: e.target, toCenter: e.toCenter, rim: e.rim }));

    nodesRef.current = simNodes;
    linksRef.current = simLinks;

    // --- Cluster layout: like gathers with like -----------------------------------------
    // Each node is pulled gently toward its lens-group's anchor (category groups by
    // default, dominant-taste groups under the taste lens). Anchors sit on a wide
    // ellipse — deliberately wider than tall, so a desktop window spreads horizontally
    // instead of knotting in the middle. Groups are ordered biggest-first around the
    // ellipse. This is layout only: every edge is still a real pairing, and clusters
    // never imply compatibility on their own.
    const buildLayout = (bw: number, bh: number) => {
      const bcx = bw / 2 || 300;
      const bcy = bh / 2 || 300;
      // Read the lens live (viewRef, not the closed-over prop) so the lens-change
      // effect can rebuild anchors without recreating the whole simulation.
      const liveLens = viewRef.current.lens;
      const counts = new Map<string, number>();
      simNodes.forEach(n => {
        if (n.isCenter || n.isPick) return;
        const g = groupKeyOf(n.profile, liveLens);
        counts.set(g, (counts.get(g) ?? 0) + 1);
      });
      const ordered = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([g]) => g);
      const rx = Math.max(150, bw * 0.34);
      const ry = Math.max(110, bh * 0.28);
      const anchors = new Map<string, { x: number; y: number }>();
      ordered.forEach((g, i) => {
        const angle = -Math.PI / 2 + (i / Math.max(1, ordered.length)) * Math.PI * 2;
        anchors.set(g, { x: bcx + rx * Math.cos(angle), y: bcy + ry * Math.sin(angle) });
      });
      layoutRef.current = {
        anchor: n =>
          n.isCenter || n.isPick
            ? { x: bcx, y: bcy }
            : anchors.get(groupKeyOf(n.profile, liveLens)) ?? { x: bcx, y: bcy },
      };
    };
    buildLayout(w, h);
    // d3's forceX/forceY sample their accessor once per node at initialization and
    // cache the targets — so retargeting a live sim (lens switch, resize) must re-set
    // the accessors, not just rebuild layoutRef.
    buildLayoutRef.current = (bw, bh) => {
      buildLayout(bw, bh);
      const s = simRef.current;
      (s?.force('x') as any)?.x((n: SimNode) => layoutRef.current!.anchor(n).x);
      (s?.force('y') as any)?.y((n: SimNode) => layoutRef.current!.anchor(n).y);
    };

    simRef.current?.stop();
    // Spacing: strong repulsion + generous link lengths + a collide radius that reserves
    // room for the always-on label. `spread` stretches distances on large canvases.
    // Rim links (partner↔partner / candidate↔candidate) get almost no pull — they're
    // receipts to see, not springs; the cluster anchors own the layout.
    const spread = Math.max(1, Math.min(1.7, Math.min(w, h) / 620));
    const sim = forceSimulation<SimNode>(simNodes)
      .force('charge', forceManyBody<SimNode>().strength(-380 * spread))
      .force(
        'link',
        forceLink<SimNode, SimLink>(simLinks)
          .id(n => n.id)
          .distance(l => (l.toCenter ? 150 : 110) * spread)
          .strength(l => (l.toCenter ? 0.12 : 0.02))
      )
      .force(
        'x',
        forceX<SimNode>(n => layoutRef.current!.anchor(n).x).strength(anchorStrength)
      )
      .force(
        'y',
        forceY<SimNode>(n => layoutRef.current!.anchor(n).y).strength(anchorStrength)
      )
      .force('collide', forceCollide<SimNode>(n => n.r + 18))
      .on('tick', () => {
        // Clamp to the canvas so no node (or its label) drifts out of view — matters
        // most on small screens where the repulsion outguns the container.
        const { w: cw, h: ch } = sizeRef.current;
        simNodes.forEach(n => {
          if (n.x == null || n.y == null) return;
          if (cw > 0 && ch > 0) {
            // Side padding is generous because labels are centered under nodes and
            // wider than the node itself — "chicken stock" needs the elbow room.
            n.x = Math.max(n.r + 30, Math.min(cw - n.r - 30, n.x));
            n.y = Math.max(n.r + 10, Math.min(ch - n.r - 24, n.y)); // room for the label below
          }
          positionsRef.current.set(n.id, { x: n.x, y: n.y });
        });
        draw();
      });
    sim.alpha(0.9).restart();
    simRef.current = sim;
    return () => {
      sim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, center, buildMode]);

  // Lens switch = same nodes, new grouping (category ↔ dominant taste). Rebuild the
  // anchors in place and reheat gently so the clusters glide to their new arrangement
  // instead of the whole simulation restarting from scratch.
  useEffect(() => {
    const { w, h } = sizeRef.current;
    if (buildLayoutRef.current && w > 0 && h > 0) {
      buildLayoutRef.current(w, h);
      simRef.current?.alpha(0.5).restart();
    }
  }, [lens]);

  // Size the canvas to its container (dpr-aware) and keep the center pinned on resize.
  //
  // `center` MUST be a dependency: while the overlay is closed the component renders
  // null, so on the first in-app open this effect has already run (and bailed) against
  // null refs — without re-running when the canvas mounts, it stays at the 300×150
  // default and the whole graph draws as a smeared blob in the top-left corner. Deep
  // links never hit this (the overlay is open from the very first render), which is
  // how it slipped past initial verification.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: rect.width, h: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const sim = simRef.current;
      if (sim) {
        // Retarget the cluster anchors to the new canvas — never poke the x/y forces
        // directly, that would replace their per-node anchor accessors with a constant.
        buildLayoutRef.current?.(rect.width, rect.height);
        sim.alpha(0.4).restart();
      }
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw, buildMode, center]);

  // --- Pointer interaction (hover / drag / tap) ----------------------------------------
  const pointer = useRef({ downId: null as string | null, downX: 0, downY: 0, moved: false, dragging: false });

  const toCanvas = (e: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const nodeAt = (x: number, y: number): SimNode | null => {
    // Topmost first: iterate in reverse so larger/late nodes win ties.
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i];
      if (n.x == null || n.y == null) continue;
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy <= (n.r + 4) * (n.r + 4)) return n;
    }
    return null;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const { x, y } = toCanvas(e);
    const n = nodeAt(x, y);
    pointer.current = {
      downId: n?.id ?? null,
      downX: x,
      downY: y,
      moved: false,
      dragging: !!n,
    };
    if (n) {
      try {
        canvasRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Capture can fail for exotic pointer states; the drag still works without it.
      }
      n.fx = n.x;
      n.fy = n.y;
      simRef.current?.alphaTarget(0.15).restart();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = toCanvas(e);
    const p = pointer.current;
    if (p.dragging && p.downId) {
      const n = nodesRef.current.find(nn => nn.id === p.downId);
      if (n) {
        n.fx = x;
        n.fy = y;
      }
      if (Math.hypot(x - p.downX, y - p.downY) > 4) p.moved = true;
      return;
    }
    // Hover hit-test (desktop): update highlight + info focus.
    const hit = nodeAt(x, y);
    const prev = viewRef.current.hovered;
    viewRef.current.hovered = hit?.id ?? null;
    if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'default';
    if (hit && hit.id !== prev && !isMobile) setFocusName(hit.id);
    if (hit?.id !== prev) draw();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const p = pointer.current;
    const n = p.downId ? nodesRef.current.find(nn => nn.id === p.downId) : null;
    if (n) {
      n.fx = undefined;
      n.fy = undefined;
      simRef.current?.alphaTarget(0);
      // After a real drag, reheat so the anchors tug the node back toward its spot —
      // partway for partners, firmly for the center — instead of stranding it.
      if (p.moved) simRef.current?.alpha(0.3).restart();
    }
    if (n && !p.moved) handleTap(n.id);
    pointer.current = { downId: null, downX: 0, downY: 0, moved: false, dragging: false };
  };

  // A tap on a node: build mode toggles it as an anchor; explore mode selects then hops.
  const handleTap = (name: string) => {
    if (buildMode) {
      setPicks(prev => {
        if (prev.includes(name)) {
          // Removing an anchor re-opens the pool (but keep at least one).
          const next = prev.filter(p => p !== name);
          return next.length ? next : prev;
        }
        return [...prev, name];
      });
      setFocusName(name);
      return;
    }
    if (name === center) return; // already centered
    if (isMobile && focusName !== name) {
      setFocusName(name); // first tap selects
      return;
    }
    onNavigate(name); // desktop click, or mobile second tap → hop
  };

  // --- Search ---------------------------------------------------------------------------
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return ingredientProfiles
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map(p => p.name);
  }, [search]);

  // --- Info panel focus -----------------------------------------------------------------
  const focusProfile = focusName ? getProfile(focusName) : null;
  const focusDegree = focusName ? graph.get(focusName)?.size ?? 0 : 0;

  // Legend for the active lens, most frequent group first. Now that the chips are tap-
  // to-filter controls, they're computed from the UNFILTERED pool (every partner /
  // candidate, not just the nodes on screen) — so a group never vanishes from the
  // legend because it missed the degree cap or because another chip is active.
  const legend = useMemo(() => {
    const names = buildMode
      ? Array.from(intersectNeighborhoods(graph, picks))
      : center
        ? Array.from(graph.get(center) ?? [])
        : [];
    const counts = new Map<string, { label: string; color: string; count: number }>();
    names.forEach(n => {
      const profile = getProfile(n);
      const key = groupKeyOf(profile, lens);
      let label: string;
      let color: string;
      if (lens === 'taste') {
        color = key; // under the taste lens the group key IS the dominant-taste color
        const entry = TASTE_KEYS.find(k => TASTE_COLORS[k] === color);
        label = entry ?? 'neutral';
      } else {
        const cat = profile?.category;
        label = cat ? categoryLabel(cat) : 'Other';
        color = (cat && CATEGORY_COLORS[cat]) || NEUTRAL_NODE;
      }
      const cur = counts.get(key);
      if (cur) cur.count += 1;
      else counts.set(key, { label, color, count: 1 });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
      .map(([key, v]) => ({ key, label: v.label, color: v.color, count: v.count }));
  }, [graph, center, buildMode, picks, lens]);

  // Whole-database scale, for the mockup's "1 of 638 ingredients · 14,800 pairings"
  // footer. Edge count = half the sum of neighborhood sizes (each edge counted twice).
  const dbStats = useMemo(() => {
    let edges = 0;
    graph.forEach(set => {
      edges += set.size;
    });
    return { ingredients: graph.size, pairings: Math.round(edges / 2) };
  }, [graph]);

  if (!ingredient) return null;

  const candidateCount = model.total;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-white dark:bg-gray-900"
      role="dialog"
      aria-modal="true"
      aria-label={`Flavor map centered on ${center}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={18} className="text-gray-400 shrink-0" aria-hidden="true" />
          <p className="font-display font-bold text-gray-900 dark:text-white lowercase truncate">
            {buildMode ? 'build a combo' : center}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Lens toggle */}
          <div className="flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 text-xs font-medium mr-1">
            {(['category', 'taste'] as Lens[]).map(l => (
              <button
                key={l}
                onClick={() => {
                  setLens(l);
                  // Filter keys are lens-specific — clear in the same render so the
                  // model never evaluates category keys under the taste lens (or
                  // vice versa), which would flash an empty graph.
                  setGroupFilter(new Set());
                }}
                className={`px-3 py-1 rounded-full capitalize transition-colors ${
                  lens === l
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <IconButton
            label="Search ingredients"
            onClick={() => setSearchOpen(o => !o)}
            className="rounded-full text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <Search size={18} strokeWidth={2} />
          </IconButton>
          <IconButton
            label="Close flavor map"
            onClick={onClose}
            className="rounded-full text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={20} strokeWidth={2} />
          </IconButton>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="relative px-4 sm:px-6 py-2 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Jump to an ingredient…"
            className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
          />
          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 sm:left-6 sm:right-6 mt-1 z-10 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700 max-h-64 overflow-y-auto">
              {searchResults.map(name => (
                <button
                  key={name}
                  onClick={() => {
                    setSearch('');
                    setSearchOpen(false);
                    if (buildMode) handleTap(name);
                    else onNavigate(name);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm lowercase text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Body: graph + info panel */}
      <div className={`flex-1 min-h-0 flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {/* Graph column: legend row / canvas / stats row. The legend and counts live in
            normal flow (NOT overlaid on the canvas) so chrome never covers a node —
            on a phone the floating version sat right on top of ingredients. */}
        {/* min-w-0 + absolutely-positioned canvas: the canvas carries a fixed pixel width
            (set by the resize observer), and without these the flex container refuses to
            shrink below it — squeezing the window then pushes the info panel off-screen
            instead of shrinking the graph. */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col">
          {/* Lens legend — every group in the (unfiltered) pool, and each chip is a
              tap-to-filter toggle: active chips fill with their group color and the
              graph narrows to those groups. One scrollable line on mobile (wrapping
              would eat canvas height), wrapping on desktop. */}
          <div
            className={`shrink-0 px-4 sm:px-6 py-2 flex items-center gap-x-1.5 gap-y-1.5 ${
              isMobile ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'
            }`}
          >
            {legend.map(item => (
              <Pill
                key={item.key}
                active={groupFilter.has(item.key)}
                accent={item.color}
                className="!px-2.5 !py-1 !text-xs whitespace-nowrap shrink-0"
                onClick={() =>
                  setGroupFilter(prev => {
                    const next = new Set(prev);
                    if (next.has(item.key)) next.delete(item.key);
                    else next.add(item.key);
                    return next;
                  })
                }
              >
                {item.label}
              </Pill>
            ))}
            {groupFilter.size > 0 && (
              <button
                onClick={() => setGroupFilter(new Set())}
                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2 whitespace-nowrap shrink-0 px-1"
              >
                show all
              </button>
            )}
          </div>

          <div ref={containerRef} className="relative flex-1 min-h-0 bg-gray-50 dark:bg-gray-900/40 touch-none">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => {
              viewRef.current.hovered = null;
              draw();
            }}
            className="absolute inset-0"
          />
          {/* Dead-end guidance stays overlaid: it's a transient warning, not chrome,
              and only appears when the candidate ring is empty anyway. */}
          {buildMode && candidateCount === 0 && (
            <span className="absolute bottom-3 left-3 max-w-[240px] px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-xs text-amber-800 dark:text-amber-200 shadow-sm">
              Nothing pairs with all {picks.length}. Try removing{' '}
              <button
                className="underline font-medium lowercase"
                onClick={() => {
                  const worst = mostConstrainingPick(graph, picks);
                  if (worst) setPicks(prev => prev.filter(p => p !== worst));
                }}
              >
                {mostConstrainingPick(graph, picks)}
              </button>
              .
            </span>
          )}

          {/* "+N more" list */}
          {morePanelOpen && model.hidden.length > 0 && (
            <div className="absolute top-3 right-3 w-56 max-h-[70%] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {model.hidden.length} more
                </p>
                <button onClick={() => setMorePanelOpen(false)} aria-label="Close list">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {model.hidden.map(name => (
                  <button
                    key={name}
                    onClick={() => (buildMode ? handleTap(name) : onNavigate(name))}
                    className="px-2 py-0.5 rounded-full text-xs lowercase text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Offscreen accessible mirror of the visible graph */}
          <div className="sr-only" aria-live="polite">
            {buildMode
              ? `Building a combo from ${picks.join(', ')}. ${candidateCount} compatible ingredients.`
              : `${center} pairs with ${model.nodes
                  .filter(n => !n.isCenter)
                  .map(n => n.name)
                  .join(', ')}.`}
          </div>
          </div>

          {/* Counts + database scale, in flow below the canvas (mockup footer) */}
          <div className="shrink-0 px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-200 tabular-nums">
              {(() => {
                // Count what's actually drawn: the cap AND the legend filter both
                // shrink the view, and "18 of 301 partners shown" stays honest for both.
                const drawn = model.nodes.filter(n => !n.isCenter && !n.isPick).length;
                if (buildMode) {
                  return drawn < candidateCount
                    ? `${drawn} of ${candidateCount} compatible shown`
                    : `${candidateCount} compatible`;
                }
                return drawn < model.total
                  ? `${drawn} of ${model.total} partners shown`
                  : `${model.total} partner${model.total === 1 ? '' : 's'}`;
              })()}
            </span>
            {model.hidden.length > 0 && (
              <button
                onClick={() => setMorePanelOpen(o => !o)}
                className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                +{model.hidden.length} more
              </button>
            )}
            {/* Mood lens: two peer modes, not a cleanup toggle. Everyday keeps the
                pantry staples (the connectors — maximum buildability); Adventurous
                mutes the garlic-tier hubs so deep cuts get the spotlight. Same
                segmented shape as the Category|Taste switcher — this is a lens over
                WHO is drawn. View filter only; the pairing math never changes. */}
            <div className="flex items-center rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 text-xs font-medium">
              {([
                ['everyday', false, 'The whole map, pantry staples included — everything on screen builds with everything'],
                ['adventurous', true, 'Mute the ubiquitous staples (garlic, lemon, olive oil…) and spotlight the deep cuts'],
              ] as Array<[string, boolean, string]>).map(([label, staplesHidden, hint]) => (
                <button
                  key={label}
                  onClick={() => setHideStaples(staplesHidden)}
                  title={hint}
                  aria-pressed={hideStaples === staplesHidden}
                  className={`px-3 py-1 rounded-full capitalize transition-colors ${
                    hideStaples === staplesHidden
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
              {dbStats.ingredients} ingredients · {dbStats.pairings.toLocaleString()} pairings
              in the map
            </span>
          </div>
        </div>

        {/* Info / build panel */}
        <div
          className={`shrink-0 bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/60 overflow-y-auto ${
            isMobile ? 'border-t max-h-[42%]' : 'w-80 border-l'
          }`}
        >
          <div className="p-4 sm:p-5">
            {buildMode ? (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Your combo · {picks.length}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {picks.map(name => (
                    <button
                      key={name}
                      onClick={() => setPicks(prev => (prev.length > 1 ? prev.filter(p => p !== name) : prev))}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm lowercase text-white shadow-sm"
                      style={{ backgroundColor: (getProfile(name)?.category && CATEGORY_COLORS[getProfile(name)!.category]) || NEUTRAL_NODE }}
                      title="Remove from combo"
                    >
                      {name}
                      {picks.length > 1 && <X size={12} strokeWidth={2.5} />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onUseCombo(picks);
                    }}
                    disabled={picks.length < 1 || picks.length > HANDOFF_MAX}
                    className="flex-1 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    Use this combo
                  </button>
                  <button
                    onClick={exitBuild}
                    className="px-4 py-2.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
                {picks.length > HANDOFF_MAX && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                    Keep exploring — but the main app fits {HANDOFF_MAX} ingredients, so
                    remove {picks.length - HANDOFF_MAX} to use this combo.
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Tap a node to add or remove it. The pool is every ingredient that pairs
                  with all your picks.
                </p>
              </div>
            ) : (
              <button
                onClick={enterBuild}
                className="w-full mb-4 py-2.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Build a combo from here
              </button>
            )}

            {/* Focused ingredient profile */}
            {focusProfile ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: (CATEGORY_COLORS[focusProfile.category]) || NEUTRAL_NODE }}
                      aria-hidden="true"
                    />
                    <p className="font-display font-bold text-lg text-gray-900 dark:text-white lowercase">
                      {focusName}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {categoryLabel(focusProfile.category)}
                    {focusProfile.subcategory ? ` · ${focusProfile.subcategory}` : ''} ·{' '}
                    {focusDegree} pairings
                  </p>
                </div>
                {focusProfile.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {focusProfile.description}
                  </p>
                )}
                {/* Taste bars */}
                <div className="space-y-1">
                  {TASTE_KEYS.map(k => {
                    const v = (focusProfile.flavorProfile as Record<string, number>)[k] ?? 0;
                    return (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-14 text-[11px] capitalize text-gray-400 dark:text-gray-500">
                          {k}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${v * 10}%`, backgroundColor: TASTE_COLORS[k] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Texture / function / intensity / methods */}
                <div className="flex flex-wrap gap-1">
                  {(focusProfile.textures ?? []).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {t}
                    </span>
                  ))}
                  {(focusProfile.functions ?? []).map(f => (
                    <span key={f} className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {f}
                    </span>
                  ))}
                </div>
                {(focusProfile.cookingMethods?.length || focusProfile.intensity) && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {focusProfile.intensity ? `intensity ${focusProfile.intensity}/10` : ''}
                    {focusProfile.intensity && focusProfile.cookingMethods?.length ? ' · ' : ''}
                    {(focusProfile.cookingMethods ?? []).join(', ')}
                  </p>
                )}
                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {!buildMode && focusName && focusName !== center && (
                    <button
                      onClick={() => onNavigate(focusName)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Center here
                    </button>
                  )}
                  {buildMode && focusName && (
                    <button
                      onClick={() => handleTap(focusName)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {picks.includes(focusName) ? 'Remove from combo' : 'Add to combo'}
                    </button>
                  )}
                  {onOpenAtlas && focusName && (
                    <button
                      onClick={() => onOpenAtlas(focusName)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Full details
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Hover or tap a node to see it.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphExplorer;
