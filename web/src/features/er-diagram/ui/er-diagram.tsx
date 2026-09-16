import { useMemo, useState } from 'react';
import { Focus, GripVertical, Maximize2, Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { DatabaseDetails, TableMetadata } from '@/shared/api/contracts';
import { Button } from '@/shared/ui';

type Point = { x: number; y: number };
type DiagramNode = { id: string; schema: string; table: TableMetadata; position: Point };

const CARD_WIDTH = 264;
const CANVAS_WIDTH = 1800;
const CANVAS_HEIGHT = 1160;

function layoutKey(database: DatabaseDetails) {
  return `database-enjoyer:er-layout:${database.id}:${database.importedAt}`;
}

function defaultPosition(index: number): Point {
  const columns = 5;
  return {
    x: 40 + (index % columns) * 344,
    y: 44 + Math.floor(index / columns) * 310,
  };
}

function readLayout(database: DatabaseDetails, ids: string[]): Record<string, Point> {
  try {
    const value = JSON.parse(localStorage.getItem(layoutKey(database)) ?? '{}') as Record<
      string,
      Point
    >;
    return ids.reduce<Record<string, Point>>((layout, id) => {
      const point = value[id];
      if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) layout[id] = point;
      return layout;
    }, {});
  } catch {
    return {};
  }
}

function relationLabel(constraint: { columns: string[]; referencedColumns?: string[] }) {
  const source = constraint.columns.join(', ') || '—';
  const target = constraint.referencedColumns?.join(', ') || '—';
  return `${source} → ${target}`;
}

export function ErDiagram({
  database,
  editable,
}: {
  database: DatabaseDetails;
  editable: boolean;
}) {
  const rawNodes = useMemo(
    () =>
      database.schemas.flatMap((schema) =>
        schema.tables.map((table, index) => ({
          id: `${schema.name}.${table.name}`,
          schema: schema.name,
          table,
          position: defaultPosition(index),
        })),
      ),
    [database.schemas],
  );
  const [positions, setPositions] = useState<Record<string, Point>>(() =>
    readLayout(
      database,
      rawNodes.map((node) => node.id),
    ),
  );
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState<{ id: string; offset: Point }>();

  const nodes: DiagramNode[] = rawNodes.map((node) => ({
    ...node,
    position: positions[node.id] ?? node.position,
  }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = nodes.flatMap((node) =>
    (node.table.constraints ?? [])
      .filter((constraint) => constraint.kind === 'foreign_key' && constraint.referencedObject)
      .map((constraint) => {
        const targetId = `${constraint.referencedNamespace ?? node.schema}.${constraint.referencedObject}`;
        return {
          source: node,
          target: nodeById.get(targetId),
          constraint,
          id: `${node.id}:${constraint.name}`,
        };
      })
      .filter((edge): edge is typeof edge & { target: DiagramNode } => Boolean(edge.target)),
  );

  function save(next: Record<string, Point>) {
    setPositions(next);
    localStorage.setItem(layoutKey(database), JSON.stringify(next));
  }

  function reset() {
    localStorage.removeItem(layoutKey(database));
    setPositions({});
    setZoom(1);
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const next = {
      x: Math.max(
        16,
        Math.min(
          CANVAS_WIDTH - CARD_WIDTH - 16,
          (event.clientX - bounds.left) / zoom - drag.offset.x,
        ),
      ),
      y: Math.max(
        16,
        Math.min(CANVAS_HEIGHT - 80, (event.clientY - bounds.top) / zoom - drag.offset.y),
      ),
    };
    save({ ...positions, [drag.id]: next });
  }

  if (!nodes.length)
    return (
      <p className="p-10 text-center text-sm text-muted">
        В каталоге нет объектов для ER-диаграммы.
      </p>
    );

  return (
    <div className="space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-relaxed text-muted">
          {editable
            ? 'Перетаскивайте карточки за заголовок. Раскладка сохраняется только в этом браузере.'
            : 'Режим просмотра: импортированный снимок нельзя менять.'}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Уменьшить масштаб"
            onClick={() => setZoom((value) => Math.max(0.65, Number((value - 0.1).toFixed(2))))}
            className="rounded-md p-2 text-muted transition hover:bg-elevated hover:text-ink"
          >
            <ZoomOut size={15} />
          </button>
          <span className="w-11 text-center text-[11px] text-muted">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Увеличить масштаб"
            onClick={() => setZoom((value) => Math.min(1.35, Number((value + 0.1).toFixed(2))))}
            className="rounded-md p-2 text-muted transition hover:bg-elevated hover:text-ink"
          >
            <ZoomIn size={15} />
          </button>
          <Button variant="secondary" className="min-h-8 px-2.5 py-1.5 text-xs" onClick={reset}>
            <RotateCcw size={14} />
            Сбросить
          </Button>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-line bg-sidebar p-3">
        <div
          className="relative origin-top-left touch-none"
          style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom }}
          onPointerMove={move}
          onPointerUp={() => setDrag(undefined)}
          onPointerCancel={() => setDrag(undefined)}
          onPointerLeave={() => setDrag(undefined)}
        >
          <div
            className="absolute top-0 left-0 overflow-hidden rounded-lg bg-[radial-gradient(circle_at_1px_1px,rgba(128,158,145,0.18)_1px,transparent_0)] shadow-inner"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundSize: '20px 20px',
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id="er-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-accent" />
                </marker>
              </defs>
              {edges.map(({ source, target, constraint, id }) => {
                const from = source.position;
                const to = target.position;
                const sourceRight = from.x + CARD_WIDTH;
                const targetLeft = to.x;
                const movingRight = sourceRight <= targetLeft;
                const startX = movingRight ? sourceRight : from.x;
                const endX = movingRight ? targetLeft : targetLeft + CARD_WIDTH;
                const startY = from.y + 56;
                const endY = to.y + 56;
                const bend = Math.max(70, Math.abs(endX - startX) * 0.45);
                return (
                  <g key={id}>
                    <path
                      d={`M ${startX} ${startY} C ${startX + (movingRight ? bend : -bend)} ${startY}, ${endX - (movingRight ? bend : -bend)} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke="currentColor"
                      className="text-accent/70"
                      strokeWidth="1.5"
                      markerEnd="url(#er-arrow)"
                    >
                      <title>{`${source.schema}.${source.table.name}: ${relationLabel(constraint)}`}</title>
                    </path>
                  </g>
                );
              })}
            </svg>
            {nodes.map((node) => (
              <article
                key={node.id}
                className="absolute w-[264px] overflow-hidden rounded-lg border border-line bg-surface shadow-[0_12px_32px_rgba(15,42,33,0.12)]"
                style={{ left: node.position.x, top: node.position.y }}
              >
                <button
                  type="button"
                  disabled={!editable}
                  onPointerDown={(event) => {
                    if (!editable) return;
                    const card = event.currentTarget.parentElement!.getBoundingClientRect();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDrag({
                      id: node.id,
                      offset: {
                        x: (event.clientX - card.left) / zoom,
                        y: (event.clientY - card.top) / zoom,
                      },
                    });
                  }}
                  className={`flex w-full items-center gap-2 border-b border-line bg-elevated px-3 py-2.5 text-left ${editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                >
                  {editable ? (
                    <GripVertical size={14} className="text-muted" />
                  ) : (
                    <Focus size={14} className="text-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">
                    {node.table.name}
                  </span>
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent">
                    {node.schema}
                  </span>
                </button>
                <div className="divide-y divide-line">
                  {node.table.columns.slice(0, 12).map((column) => (
                    <div
                      key={column.name}
                      className="flex items-center gap-2 px-3 py-1.5 text-[11px]"
                    >
                      <span
                        className={`size-1.5 rounded-full ${column.primaryKey ? 'bg-accent' : column.nullable ? 'bg-muted/50' : 'bg-warning'}`}
                      />
                      <span className="min-w-0 flex-1 truncate font-mono">{column.name}</span>
                      <span className="max-w-24 truncate text-[10px] text-muted">
                        {column.dataType}
                      </span>
                    </div>
                  ))}
                  {node.table.columns.length > 12 && (
                    <p className="px-3 py-2 text-[10px] text-muted">
                      + {node.table.columns.length - 12} полей
                    </p>
                  )}
                </div>
              </article>
            ))}
            <div className="absolute right-5 bottom-5 flex items-center gap-2 rounded-md border border-line bg-surface/90 px-3 py-2 text-[10px] text-muted shadow-sm">
              <Move size={12} /> {nodes.length} объектов · {edges.length} связей
              <Maximize2 size={12} className="ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
