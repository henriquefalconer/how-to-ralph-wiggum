"use client";

import type { ChartData } from "@/lib/dashboards";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
];

function emptyLabel(label: string, dictionary: Dictionary): string {
  return label.trim() ? label : dictionary.dashboards.builder.emptyValueLabel;
}

function NumberViz({ data }: { data: ChartData }) {
  const value = data.total;
  const display = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return (
    <div
      data-testid="chart-number-value"
      className="flex h-full items-center justify-center text-5xl font-semibold text-gray-700"
    >
      {display}
    </div>
  );
}

function BarViz({
  data,
  dictionary,
}: { data: ChartData; dictionary: Dictionary }) {
  const max = Math.max(1, ...data.points.map((p) => p.value));
  return (
    <div className="flex h-full flex-col justify-end gap-1.5 overflow-x-auto p-2">
      {data.points.map((point, i) => (
        <div
          key={`${point.label}-${i.toString()}`}
          className="flex items-center gap-2 text-xs"
        >
          <span className="w-20 shrink-0 truncate text-gray-500">
            {emptyLabel(point.label, dictionary)}
          </span>
          <div className="h-3 flex-1 rounded bg-gray-100">
            <div
              className="h-3 rounded"
              style={{
                width: `${Math.max(2, (point.value / max) * 100)}%`,
                backgroundColor: PALETTE[i % PALETTE.length],
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-gray-700">
            {point.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function LineOrAreaViz({ data, filled }: { data: ChartData; filled: boolean }) {
  const points = data.points;
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = 100;
  const h = 40;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : w / 2;
    const y = h - (p.value / max) * h;
    return `${x},${y}`;
  });
  const linePath = `M${coords.join(" L")}`;
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-label="chart"
    >
      {filled && <path d={areaPath} fill="#2563eb22" />}
      <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="1.5" />
    </svg>
  );
}

function PieViz({
  data,
  dictionary,
}: { data: ChartData; dictionary: Dictionary }) {
  const total = data.points.reduce((s, p) => s + p.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gray-400">
        {dictionary.dashboards.builder.noResults}
      </div>
    );
  }
  let acc = 0;
  const segments = data.points.map((p, i) => {
    const start = (acc / total) * 360;
    acc += p.value;
    const end = (acc / total) * 360;
    return `${PALETTE[i % PALETTE.length]} ${start}deg ${end}deg`;
  });
  return (
    <div className="flex h-full items-center gap-3 p-2">
      <div
        className="h-16 w-16 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${segments.join(", ")})` }}
      />
      <div className="flex flex-col gap-1 overflow-y-auto text-xs">
        {data.points.map((p, i) => (
          <div
            key={`${p.label}-${i.toString()}`}
            className="flex items-center gap-1.5"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
            />
            <span className="text-gray-600">
              {emptyLabel(p.label, dictionary)}
            </span>
            <span className="text-gray-400">({p.value.toLocaleString()})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScatterViz({ data }: { data: ChartData }) {
  const points = data.points;
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="h-full w-full"
      role="img"
      aria-label="chart"
    >
      {points.map((p, i) => {
        const x = points.length > 1 ? (i / (points.length - 1)) * 100 : 50;
        const y = 40 - (p.value / max) * 40;
        return (
          <circle
            key={`${p.label}-${i.toString()}`}
            cx={x}
            cy={y}
            r="1.6"
            fill="#2563eb"
          />
        );
      })}
    </svg>
  );
}

function CalendarViz({
  data,
  dictionary,
}: { data: ChartData; dictionary: Dictionary }) {
  const max = Math.max(1, ...data.points.map((p) => p.value));
  return (
    <div className="grid grid-cols-7 gap-1 p-2">
      {data.points.map((p, i) => {
        const intensity = p.value / max;
        return (
          <div
            key={`${p.label}-${i.toString()}`}
            title={`${emptyLabel(p.label, dictionary)}: ${p.value}`}
            className="aspect-square rounded"
            style={{
              backgroundColor: `rgba(37, 99, 235, ${Math.max(0.1, intensity)})`,
            }}
          />
        );
      })}
    </div>
  );
}

function TableViz({
  data,
  dictionary,
}: { data: ChartData; dictionary: Dictionary }) {
  return (
    <table className="w-full text-left text-xs" data-testid="chart-table">
      <tbody>
        {data.points.map((p, i) => (
          <tr
            key={`${p.label}-${i.toString()}`}
            className="border-b border-gray-100"
          >
            <td className="py-1 text-gray-600">
              {emptyLabel(p.label, dictionary)}
            </td>
            <td className="py-1 text-right font-medium text-gray-800">
              {p.value.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ChartTile({
  vizType,
  data,
  dictionary,
}: {
  vizType: string;
  data: ChartData;
  dictionary: Dictionary;
}) {
  switch (vizType) {
    case "number":
      return <NumberViz data={data} />;
    case "bar":
      return <BarViz data={data} dictionary={dictionary} />;
    case "line":
      return <LineOrAreaViz data={data} filled={false} />;
    case "area":
      return <LineOrAreaViz data={data} filled />;
    case "pie":
      return <PieViz data={data} dictionary={dictionary} />;
    case "scatter":
      return <ScatterViz data={data} />;
    case "calendar":
      return <CalendarViz data={data} dictionary={dictionary} />;
    default:
      return <TableViz data={data} dictionary={dictionary} />;
  }
}
