import type { ListingFormFieldView, ListingFormResponses } from "@core/contracts/roster-listings";
import { isGridField } from "@/modules/roster-listings/domain/listing-form";

const labelClass = "block text-sm font-medium text-white/85 mb-1.5";

const answerBox =
  "rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-4 py-3 text-sm text-white/90 whitespace-pre-wrap";

const emptyBox =
  "rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/30 italic";

const choiceBase = "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm";
const choiceSelected = `${choiceBase} border-emerald-400/30 bg-emerald-500/[0.08] text-white/90`;
const choiceUnselected = `${choiceBase} border-white/[0.06] bg-white/[0.02] text-white/40`;

type Props = {
  fields: ListingFormFieldView[];
  values: ListingFormResponses;
};

function hasTextAnswer(value: ListingFormResponses[string] | undefined): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function TextAnswer({ value }: { value: ListingFormResponses[string] | undefined }) {
  if (!hasTextAnswer(value)) {
    return <div className={emptyBox}>No answer</div>;
  }
  if (typeof value === "string") {
    return <div className={answerBox}>{value}</div>;
  }
  return null;
}

export default function ListingFormFieldsReadOnly({ fields, values }: Props) {
  if (fields.length === 0) {
    return <p className="text-sm text-white/45">No additional questions for this listing.</p>;
  }

  return (
    <div className="space-y-8">
      {fields.map((field) => {
        if (field.fieldType === "SECTION_HEADING") {
          return (
            <div key={field.id} className="border-t border-white/[0.08] pt-8 first:border-t-0 first:pt-0">
              <h2 className="font-display text-xl font-semibold text-white">{field.label}</h2>
            </div>
          );
        }

        if (field.fieldType === "DESCRIPTION") {
          return (
            <div key={field.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              {field.label ? (
                <p className="text-sm font-medium text-white/70 mb-1">{field.label}</p>
              ) : null}
              {field.helpText ? (
                <p className="text-sm leading-relaxed text-white/50">{field.helpText}</p>
              ) : null}
            </div>
          );
        }

        const value = values[field.id];

        return (
          <div key={field.id}>
            <p className={labelClass}>
              {field.label}
              {field.required ? <span className="text-rose-400/80 ml-1">*</span> : null}
            </p>
            {field.helpText ? (
              <p className="mb-2 text-xs leading-relaxed text-white/40">{field.helpText}</p>
            ) : null}

            {field.fieldType === "SHORT_TEXT" || field.fieldType === "LONG_TEXT" ? (
              <TextAnswer value={value} />
            ) : null}

            {field.fieldType === "DATE" || field.fieldType === "TIME" ? (
              <TextAnswer value={value} />
            ) : null}

            {field.fieldType === "DROPDOWN" ? (
              <TextAnswer value={typeof value === "string" ? value : undefined} />
            ) : null}

            {field.fieldType === "SINGLE_CHOICE" ? (
              <div className="space-y-2">
                {field.options.map((opt) => (
                  <div key={opt} className={value === opt ? choiceSelected : choiceUnselected}>
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border ${
                        value === opt ? "border-emerald-400 bg-emerald-400/30" : "border-white/20"
                      }`}
                    />
                    {opt}
                  </div>
                ))}
              </div>
            ) : null}

            {field.fieldType === "MULTIPLE_CHOICE" ? (
              <div className="space-y-2">
                {field.options.map((opt) => {
                  const selected = Array.isArray(value) ? value : [];
                  const checked = selected.includes(opt);
                  return (
                    <div key={opt} className={checked ? choiceSelected : choiceUnselected}>
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                          checked ? "border-emerald-400 bg-emerald-400/20 text-emerald-200" : "border-white/20"
                        }`}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      {opt}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {field.fieldType === "LINEAR_SCALE" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{field.scaleMinLabel ?? field.scaleMin}</span>
                  <span>{field.scaleMaxLabel ?? field.scaleMax}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: field.scaleMax - field.scaleMin + 1 }, (_, i) => {
                    const n = String(field.scaleMin + i);
                    const selected = value === n;
                    return (
                      <div
                        key={n}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm ${
                          selected
                            ? "border-emerald-400/40 bg-emerald-500/15 text-white"
                            : "border-white/10 text-white/40"
                        }`}
                      >
                        {n}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {isGridField(field.fieldType) ? (
              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                      <th className="px-3 py-2 text-white/40" />
                      {field.gridColumns.map((col) => (
                        <th key={col} className="px-3 py-2 text-xs font-medium text-white/55">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {field.gridRows.map((row) => {
                      const gridValue =
                        value && typeof value === "object" && !Array.isArray(value) ? value : {};
                      return (
                        <tr key={row} className="border-b border-white/[0.04]">
                          <td className="px-3 py-2 text-white/70">{row}</td>
                          {field.gridColumns.map((col) => {
                            const selected =
                              field.fieldType === "MULTIPLE_CHOICE_GRID"
                                ? gridValue[row] === col
                                : Array.isArray(gridValue[row]) && gridValue[row].includes(col);
                            return (
                              <td
                                key={col}
                                className={`px-3 py-2 text-center ${
                                  selected ? "bg-emerald-500/10" : ""
                                }`}
                              >
                                <span
                                  className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                                    selected
                                      ? "border-emerald-400 bg-emerald-400/25"
                                      : "border-white/15"
                                  }`}
                                >
                                  {selected ? (
                                    <span className="text-[9px] text-emerald-200">✓</span>
                                  ) : null}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {field.fieldType === "FILE_UPLOAD" ? (
              <div>
                {typeof value === "string" && value ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex ${answerBox} hover:border-emerald-400/40`}
                  >
                    View uploaded file →
                  </a>
                ) : (
                  <div className={emptyBox}>No file uploaded</div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
