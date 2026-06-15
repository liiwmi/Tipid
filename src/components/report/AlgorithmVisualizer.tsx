// src/components/report/AlgorithmVisualizer.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type {
  AlgorithmReport,
  SortedAppliance,
} from "../../services/optimizer";
import type { AppColors } from "../../styles/theme";
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from "../../styles/theme";

interface Props {
  report: AlgorithmReport;
  colors: AppColors;
}

type Tab = "dfs" | "mergesort" | "replay";

const TABS: { key: Tab; label: string }[] = [
  { key: "dfs", label: "DFS Tree" },
  { key: "mergesort", label: "Merge Sort" },
  { key: "replay", label: "Step Replay" },
];

function shortName(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 5);
  return words
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 4);
}

// ── DFS Tree ──────────────────────────────────────────────────────────────────
// Shows all nodes at once. Play highlights them level by level with a pulse.
const MAX_DEPTH = 4;

type FlatNode = {
  name: string;
  included: boolean | null;
  pruned: boolean;
  level: number;
  pos: number;
  totalInLevel: number;
};

function buildFlat(report: AlgorithmReport): FlatNode[] {
  const names = report.sortedAppliances.slice(0, MAX_DEPTH).map((a) => a.name);
  const flat: FlatNode[] = [];

  // Root
  flat.push({
    name: "Start",
    included: null,
    pruned: false,
    level: 0,
    pos: 0,
    totalInLevel: 1,
  });

  for (let lvl = 0; lvl < Math.min(names.length, MAX_DEPTH); lvl++) {
    const count = Math.pow(2, lvl);
    for (let pos = 0; pos < count; pos++) {
      const isInclude = pos % 2 === 0;
      const logEntry = report.pruningLog.find(
        (s) => s.appliance === names[lvl],
      );
      const pruned = (logEntry?.pruned ?? false) && isInclude;
      flat.push({
        name: names[lvl],
        included: lvl === 0 ? null : isInclude,
        pruned,
        level: lvl + 1,
        pos,
        totalInLevel: count,
      });
    }
  }
  return flat;
}

function DFSTree({
  report,
  colors,
  playing,
  onStop,
}: {
  report: AlgorithmReport;
  colors: AppColors;
  playing: boolean;
  onStop: () => void;
}) {
  const flat = buildFlat(report);
  const LEVELS = Math.min(report.sortedAppliances.length, MAX_DEPTH) + 1;

  // highlightedLevel: which level is currently glowing (-1 = none)
  const [highlightedLevel, setHighlightedLevel] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      setHighlightedLevel(0);
      let lvl = 0;
      intervalRef.current = setInterval(() => {
        lvl += 1;
        if (lvl >= LEVELS) {
          clearInterval(intervalRef.current!);
          setHighlightedLevel(-1);
          onStop();
          return;
        }
        setHighlightedLevel(lvl);
      }, 800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setHighlightedLevel(-1);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  const NODE_SIZE = 44;
  const H_GAP = 10;
  const V_GAP = 52;
  const MAX_IN_ROW = Math.pow(2, LEVELS - 1);
  const WIDTH = MAX_IN_ROW * (NODE_SIZE + H_GAP);
  const HEIGHT = LEVELS * (NODE_SIZE + V_GAP) + 40;

  function nodeColor(node: FlatNode): string {
    if (node.included === null) return colors.primary;
    if (node.pruned) return colors.priorityHighText;
    if (node.included) return colors.secondary;
    return colors.textSecondary;
  }

  function xFor(pos: number, total: number): number {
    const slotW = WIDTH / total;
    return slotW * pos + slotW / 2 - NODE_SIZE / 2;
  }

  function yFor(level: number): number {
    return level * (NODE_SIZE + V_GAP);
  }

  // Group by level
  const byLevel: FlatNode[][] = [];
  for (const n of flat) {
    if (!byLevel[n.level]) byLevel[n.level] = [];
    byLevel[n.level].push(n);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ width: WIDTH, height: HEIGHT, position: "relative" }}>
        {byLevel.map((levelNodes, lvl) =>
          levelNodes.map((node, pos) => {
            const x = xFor(pos, levelNodes.length);
            const y = yFor(lvl);
            const bg = nodeColor(node);
            const isHighlight = highlightedLevel === lvl;
            const dimmed = highlightedLevel !== -1 && !isHighlight;

            return (
              <View key={`${lvl}-${pos}`}>
                {/* Connector */}
                {lvl > 0 &&
                  (() => {
                    const parentNodes = byLevel[lvl - 1];
                    const parentPos = Math.floor(pos / 2);
                    const px =
                      xFor(parentPos, parentNodes.length) + NODE_SIZE / 2;
                    const py = yFor(lvl - 1) + NODE_SIZE;
                    const cx = x + NODE_SIZE / 2;
                    const cy = y;
                    const dx = cx - px;
                    const dy = cy - py;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    return (
                      <View
                        style={{
                          position: "absolute",
                          left: px,
                          top: py,
                          width: len,
                          height: 1.5,
                          backgroundColor: node.pruned
                            ? colors.priorityHighText + "60"
                            : colors.borderDefault,
                          opacity: dimmed ? 0.25 : 1,
                          transform: [{ rotate: `${angle}deg` }],
                          // @ts-ignore
                          transformOrigin: "0 50%",
                        }}
                      />
                    );
                  })()}

                {/* Node */}
                <View
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    width: NODE_SIZE,
                    height: NODE_SIZE,
                    borderRadius: NODE_SIZE / 2,
                    backgroundColor: bg,
                    opacity: dimmed ? 0.2 : 1,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: isHighlight ? 2.5 : 1.5,
                    borderColor: isHighlight ? "#fff" : bg,
                    // Glow via shadow when highlighted
                    shadowColor: isHighlight ? bg : "transparent",
                    shadowOpacity: isHighlight ? 0.7 : 0,
                    shadowRadius: isHighlight ? 8 : 0,
                    elevation: isHighlight ? 6 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 8,
                      fontWeight: "700",
                      color: "#fff",
                      textAlign: "center",
                    }}
                  >
                    {node.level === 0 ? "●" : shortName(node.name)}
                  </Text>
                  {node.level > 0 && (
                    <Text style={{ fontSize: 7, color: "#fff", opacity: 0.9 }}>
                      {node.included ? "IN" : "OUT"}
                    </Text>
                  )}
                </View>
              </View>
            );
          }),
        )}

        {/* Legend */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            flexDirection: "row",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {[
            { color: colors.secondary, label: "Included" },
            { color: colors.priorityHighText, label: "Pruned" },
            { color: colors.textSecondary, label: "Excluded" },
            { color: colors.primary, label: "Root" },
          ].map((l) => (
            <View
              key={l.label}
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: l.color,
                }}
              />
              <Text style={{ fontSize: 9, color: colors.textSecondary }}>
                {l.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ── AnimCard — defined outside MergeSortViz to prevent remounting on re-render
const PILL_COLORS: Record<number, string | undefined> = {};

function AnimCard({
  a,
  visible,
  final: isFinal,
  colors,
}: {
  a: SortedAppliance;
  visible: boolean;
  final: boolean;
  colors: AppColors;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const pillColor =
    a.priority === 3
      ? colors.priorityHighText
      : a.priority === 2
        ? colors.priorityMedText
        : colors.priorityLowText;

  const density =
    a.cost_per_day > 0 ? (a.priority / a.cost_per_day).toFixed(2) : "∞";

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
        backgroundColor: isFinal ? colors.secondary + "22" : colors.bgSecondary,
        borderWidth: 1,
        borderColor: isFinal ? colors.secondary : colors.borderDefault,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        alignItems: "center",
        minWidth: 68,
      }}
    >
      <Text
        style={{
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.bold,
          color: pillColor,
        }}
      >
        {shortName(a.name)}
      </Text>
      <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>
        P={a.priority}
      </Text>
      <Text style={{ fontSize: 9, color: colors.primary, marginTop: 1 }}>
        d={density}
      </Text>
    </Animated.View>
  );
}

// ── Merge Sort Visualizer ─────────────────────────────────────────────────────
function MergeSortViz({
  report,
  colors,
  playing,
  onStop,
}: {
  report: AlgorithmReport;
  colors: AppColors;
  playing: boolean;
  onStop: () => void;
}) {
  const items = report.sortedAppliances;
  const unsorted = [...items].reverse();
  const splitL = unsorted.slice(0, Math.ceil(items.length / 2));
  const splitR = unsorted.slice(Math.ceil(items.length / 2));

  const allStages = [
    { label: "Original order", row: unsorted, final: false },
    { label: "Split — left half", row: splitL, final: false },
    { label: "Split — right half", row: splitR, final: false },
    {
      label: "Merged by value density (Priority ÷ Cost)",
      row: items,
      final: true,
    },
  ];

  const [visibleCounts, setVisibleCounts] = useState<number[]>(
    allStages.map(() => 0),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      setVisibleCounts(allStages.map(() => 0)); // reset only on fresh play

      type Tick = { si: number; ci: number };
      const ticks: Tick[] = [];
      allStages.forEach((stage, si) => {
        stage.row.forEach((_, ci) => ticks.push({ si, ci }));
      });

      let t = 0;
      intervalRef.current = setInterval(() => {
        if (t >= ticks.length) {
          clearInterval(intervalRef.current!);
          onStop();
          return;
        }
        const { si, ci } = ticks[t];
        setVisibleCounts((prev) => {
          const next = [...prev];
          next[si] = ci + 1;
          return next;
        });
        t++;
      }, 400);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Don't reset — keep cards visible after stopping
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  return (
    <View style={{ gap: spacing.md }}>
      {allStages.map((stage, si) => (
        <View key={si} style={{ gap: 6 }}>
          <Text
            style={{
              fontSize: fontSizes.xs,
              color: colors.textSecondary,
              fontStyle: "italic",
            }}
          >
            {stage.label}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {stage.row.map((a, ci) => (
                <AnimCard
                  key={`${si}-${ci}-${a.name}`}
                  a={a}
                  visible={ci < visibleCounts[si]}
                  final={stage.final}
                  colors={colors}
                />
              ))}
            </View>
          </ScrollView>
          {si < allStages.length - 1 && (
            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              ↓
            </Text>
          )}
        </View>
      ))}
      <Text
        style={{
          fontSize: fontSizes.xs,
          color: colors.textSecondary,
          fontStyle: "italic",
          marginTop: spacing.sm,
        }}
      >
        P = priority weight · d = value density (priority ÷ ₱/day)
      </Text>
    </View>
  );
}

// ── Step Replay ───────────────────────────────────────────────────────────────
function StepReplay({
  report,
  colors,
  playing,
}: {
  report: AlgorithmReport;
  colors: AppColors;
  playing: boolean;
}) {
  const [step, setStep] = useState(0);
  const log = report.pruningLog;
  const budget = report.budgetThreshold;
  const total = log.length;

  if (!playing) {
    return (
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: fontSizes.sm,
          textAlign: "center",
          padding: spacing.lg,
        }}
      >
        Tap Play to start the replay
      </Text>
    );
  }

  if (total === 0) {
    return (
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: fontSizes.sm,
          textAlign: "center",
          padding: spacing.lg,
        }}
      >
        No steps to replay.
      </Text>
    );
  }

  const current = log[step];
  const fillPct = Math.min((current.cum_cost / budget) * 100, 100);
  const overBudget = current.cum_cost > budget;

  return (
    <View style={{ gap: spacing.md }}>
      <Text
        style={{
          fontSize: fontSizes.xs,
          color: colors.textSecondary,
          textAlign: "center",
        }}
      >
        Step {step + 1} of {total}
      </Text>

      {/* Decision card */}
      <View
        style={{
          borderRadius: borderRadius.lg,
          borderWidth: 1.5,
          borderColor: current.pruned
            ? colors.priorityHighText
            : colors.secondary,
          backgroundColor: current.pruned
            ? colors.priorityHighBg
            : colors.priorityLowBg,
          padding: spacing.lg,
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Text style={{ fontSize: 28 }}>{current.pruned ? "✂️" : "✅"}</Text>
        <Text
          style={{
            fontSize: fontSizes.lg,
            fontWeight: fontWeights.bold,
            color: colors.textPrimary,
          }}
        >
          {current.appliance}
        </Text>
        <View
          style={{
            backgroundColor: current.pruned
              ? colors.priorityHighText
              : colors.secondary,
            borderRadius: borderRadius.full,
            paddingHorizontal: spacing.md,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: fontSizes.sm,
              fontWeight: fontWeights.bold,
            }}
          >
            {current.pruned ? "PRUNED" : "INCLUDED"}
          </Text>
        </View>
        <Text
          style={{
            fontSize: fontSizes.sm,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {current.pruned
            ? `₱${current.cum_cost.toFixed(2)} exceeds budget ₱${budget.toFixed(2)}`
            : `₱${current.cum_cost.toFixed(2)} within budget ₱${budget.toFixed(2)}`}
        </Text>
      </View>

      {/* Budget bar */}
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: fontSizes.xs, color: colors.textSecondary }}>
            Cumulative Cost
          </Text>
          <Text style={{ fontSize: fontSizes.xs, color: colors.textSecondary }}>
            Budget ₱{budget.toFixed(2)}
          </Text>
        </View>
        <View
          style={{
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.borderDefault,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${fillPct}%`,
              height: "100%",
              backgroundColor: overBudget
                ? colors.priorityHighText
                : colors.secondary,
              borderRadius: 5,
            }}
          />
        </View>
        <Text
          style={{
            fontSize: fontSizes.xs,
            color: overBudget ? colors.priorityHighText : colors.secondary,
            textAlign: "right",
          }}
        >
          ₱{current.cum_cost.toFixed(2)} ({fillPct.toFixed(0)}% of budget)
        </Text>
      </View>

      {/* Log so far */}
      <Text
        style={{
          fontSize: fontSizes.xs,
          color: colors.textSecondary,
          fontWeight: fontWeights.semibold,
          marginTop: spacing.sm,
        }}
      >
        DECISIONS SO FAR
      </Text>
      <View style={{ gap: 4 }}>
        {log.slice(0, step + 1).map((s, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              opacity: i === step ? 1 : 0.5,
            }}
          >
            <Text style={{ fontSize: 12 }}>{s.pruned ? "✂️" : "✅"}</Text>
            <Text
              style={{
                fontSize: fontSizes.sm,
                color: colors.textPrimary,
                flex: 1,
              }}
            >
              {s.appliance}
            </Text>
            <Text
              style={{
                fontSize: fontSizes.xs,
                color: s.pruned ? colors.priorityHighText : colors.secondary,
              }}
            >
              {s.pruned ? "Pruned" : `₱${s.cum_cost.toFixed(2)}`}
            </Text>
          </View>
        ))}
      </View>

      {/* Prev / Next */}
      <View
        style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.borderDefault,
            alignItems: "center",
            opacity: step === 0 ? 0.4 : 1,
          }}
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontWeight: fontWeights.semibold,
            }}
          >
            ← Back
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            opacity: step === total - 1 ? 0.4 : 1,
          }}
          onPress={() => setStep((s) => Math.min(total - 1, s + 1))}
          disabled={step === total - 1}
        >
          <Text style={{ color: "#fff", fontWeight: fontWeights.semibold }}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>

      {step === total - 1 && (
        <TouchableOpacity
          style={{
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.borderDefault,
            alignItems: "center",
          }}
          onPress={() => setStep(0)}
        >
          <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm }}>
            ↩ Restart
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AlgorithmVisualizer({ report, colors }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("dfs");
  const [playing, setPlaying] = useState(false);

  const cardStyle = {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderDefault,
    borderWidth: 0.5,
    borderRadius: borderRadius.lg,
    overflow: "hidden" as const,
    padding: spacing.md,
  };

  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text
        style={{
          fontSize: fontSizes.xs,
          fontWeight: fontWeights.semibold,
          letterSpacing: 1,
          marginBottom: spacing.sm,
          marginLeft: spacing.xs,
          color: colors.textSecondary,
        }}
      >
        ALGORITHM VISUALIZER
      </Text>

      {/* Tab bar */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.bgSecondary,
          borderRadius: borderRadius.lg,
          padding: 3,
          marginBottom: spacing.md,
        }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              alignItems: "center",
              borderRadius: borderRadius.md,
              backgroundColor:
                activeTab === tab.key ? colors.bgCard : "transparent",
              elevation: activeTab === tab.key ? 2 : 0,
            }}
            onPress={() => {
              setActiveTab(tab.key);
              setPlaying(false);
            }}
          >
            <Text
              style={{
                fontSize: fontSizes.xs,
                fontWeight:
                  activeTab === tab.key
                    ? fontWeights.bold
                    : fontWeights.regular,
                color:
                  activeTab === tab.key ? colors.primary : colors.textSecondary,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Play / Stop */}
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          backgroundColor: playing ? colors.bgSecondary : colors.primary,
          borderRadius: borderRadius.lg,
          paddingVertical: spacing.sm,
          marginBottom: spacing.md,
          borderWidth: playing ? 1 : 0,
          borderColor: colors.borderDefault,
        }}
        onPress={() => setPlaying((p) => !p)}
      >
        <Text
          style={{
            color: playing ? colors.textSecondary : "#fff",
            fontWeight: fontWeights.bold,
            fontSize: fontSizes.sm,
          }}
        >
          {playing ? "Stop" : "Play Visualization"}
        </Text>
      </TouchableOpacity>

      {/* Content */}
      <View style={cardStyle}>
        {activeTab === "dfs" && (
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                fontSize: fontSizes.sm,
                color: colors.textSecondary,
                marginBottom: spacing.sm,
              }}
            >
              Each level lights up as the DFS traverses it. Green = included,
              Red = pruned, Grey = excluded. Showing first {MAX_DEPTH} levels.
            </Text>
            <DFSTree
              report={report}
              colors={colors}
              playing={playing}
              onStop={() => setPlaying(false)}
            />
          </View>
        )}

        {activeTab === "mergesort" && (
          <View style={{ gap: spacing.sm }}>
            <Text
              style={{
                fontSize: fontSizes.sm,
                color: colors.textSecondary,
                marginBottom: spacing.sm,
              }}
            >
              Cards slide in one by one showing how Merge Sort arranges
              appliances by value density before the search begins.
            </Text>
            <MergeSortViz
              report={report}
              colors={colors}
              playing={playing}
              onStop={() => setPlaying(false)}
            />
          </View>
        )}

        {activeTab === "replay" && (
          <StepReplay report={report} colors={colors} playing={playing} />
        )}
      </View>
    </View>
  );
}
