"use client";

export function TherapyMultiPick({
  therapies,
  selected,
  onChange,
  disabled,
}: {
  therapies: { id: string; therapyName: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  return (
    <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
      {therapies.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada master terapi.</p>
      ) : (
        therapies.map((t) => (
          <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={disabled}
              checked={selected.includes(t.id)}
              onChange={() => toggle(t.id)}
            />
            {t.therapyName}
          </label>
        ))
      )}
    </div>
  );
}
