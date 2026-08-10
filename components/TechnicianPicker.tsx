import { OptionPicker } from "./OptionPicker";
import type { Profile } from "../types/database.types";

/**
 * Searchable technician selector — a thin TechnicianPicker-shaped wrapper
 * around the generic OptionPicker, so every call site keeps working with
 * Profile[] directly instead of mapping to {id,label} itself.
 */
export function TechnicianPicker({
  technicians,
  value,
  onChange,
  label = "Technician",
  nullLabel = "Unassigned",
  showNullOption = true,
}: {
  technicians: Profile[] | undefined;
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  nullLabel?: string;
  showNullOption?: boolean;
}) {
  const options = technicians?.map((t) => ({
    id: t.id,
    label: t.full_name ?? "Unnamed technician",
  }));

  return (
    <OptionPicker
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      nullLabel={nullLabel}
      showNullOption={showNullOption}
    />
  );
}
