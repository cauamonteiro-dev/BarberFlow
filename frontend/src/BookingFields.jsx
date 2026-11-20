import { useId, useRef, useState } from "react";
import "./booking-experience.css";

export const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
const parse = (value) => new Date(`${value}T12:00:00`);
const fullDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" });
const monthDate = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});
const firstOfMonth = (date, shift = 0) =>
  new Date(date.getFullYear(), date.getMonth() + shift, 1, 12);

export function DateField({
  label,
  value,
  onChange,
  min,
  max,
  required,
  name,
  disabled,
}) {
  const id = useId();
  const toggle = useRef(null);
  const calendar = useRef(null);
  const [month, setMonth] = useState(null);
  const [year, monthIndex] = dateKey(month ?? parse(value || today()))
    .split("-")
    .map(Number);
  const first = new Date(year, monthIndex - 1, 1, 12);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, monthIndex, 0, 12).getDate();
  const close = () => {
    setMonth(null);
    toggle.current?.focus();
  };
  const open = () => {
    const pivot = value || today();
    const inRange = min && pivot < min ? min : max && pivot > max ? max : pivot;
    setMonth(firstOfMonth(parse(inRange)));
    requestAnimationFrame(() =>
      calendar.current
        ?.querySelector('[aria-current="date"]:enabled, [data-day]:enabled')
        ?.focus(),
    );
  };
  return (
    <div
      className="date-field"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setMonth(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && month) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className="date-field-input">
        <input
          id={id}
          type="date"
          name={name}
          value={value}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          className="date-calendar-toggle"
          type="button"
          ref={toggle}
          disabled={disabled}
          aria-label={`Abrir calendário: ${label}`}
          aria-expanded={Boolean(month)}
          aria-controls={month ? `${id}-calendar` : undefined}
          onClick={() => (month ? close() : open())}
        >
          <CalendarIcon />
        </button>
      </div>
      {month && (
        <div
          id={`${id}-calendar`}
          className="date-calendar"
          ref={calendar}
          role="group"
          aria-label={`Calendário: ${label}`}
        >
          <div className="date-calendar-heading">
            <button
              type="button"
              aria-label="Mês anterior"
              disabled={Boolean(
                min && dateKey(new Date(year, monthIndex - 1, 0, 12)) < min,
              )}
              onClick={() => setMonth(firstOfMonth(month, -1))}
            >
              ‹
            </button>
            <strong aria-live="polite">{monthDate.format(month)}</strong>
            <button
              type="button"
              aria-label="Mês seguinte"
              disabled={Boolean(max && dateKey(firstOfMonth(month, 1)) > max)}
              onClick={() => setMonth(firstOfMonth(month, 1))}
            >
              ›
            </button>
          </div>
          <div className="date-calendar-grid">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => (
              <span key={day}>{day}</span>
            ))}
            {Array.from({ length: start }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = new Date(year, monthIndex - 1, i + 1, 12);
              const key = dateKey(date);
              return (
                <button
                  key={key}
                  type="button"
                  data-day
                  aria-label={fullDate.format(date)}
                  aria-current={key === today() ? "date" : undefined}
                  aria-pressed={key === value}
                  disabled={Boolean((min && key < min) || (max && key > max))}
                  onClick={() => {
                    onChange(key);
                    close();
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      role="presentation"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M7.5 3v5M16.5 3v5M3.5 10.5h17" />
    </svg>
  );
}

const periods = ["Manhã", "Tarde", "Noite"];
function periodOf(value) {
  const hour = Number(value.slice(11, 13));
  return hour < 12 ? 0 : hour < 18 ? 1 : 2;
}
export function SlotPicker({ slots, value, state, onChange }) {
  const id = useId();
  const [chosenPeriod, setPeriod] = useState(null);
  const groups = periods.map((_, period) =>
    slots.filter((slot) => periodOf(slot.inicio) === period),
  );
  const initial =
    value && slots.some((slot) => slot.inicio === value)
      ? periodOf(value)
      : groups.findIndex((group) => group.length);
  const active = groups[chosenPeriod]?.length ? chosenPeriod : initial;
  return (
    <fieldset className="slot-picker full" aria-busy={state === "loading"}>
      <legend>Horário disponível</legend>
      {state === "success" && slots.length > 0 && (
        <>
          <div
            className="slot-periods"
            role="group"
            aria-label="Período do dia"
          >
            {groups.map(
              (group, i) =>
                group.length > 0 && (
                  <button
                    key={periods[i]}
                    type="button"
                    aria-pressed={i === active}
                    onClick={() => setPeriod(i)}
                  >
                    {periods[i]} <span>{group.length}</span>
                  </button>
                ),
            )}
          </div>
          <div className="slot-options">
            {groups[active].map((slot) => (
              <label className="slot-option" key={slot.inicio}>
                <input
                  type="radio"
                  className="sr-only"
                  name={id}
                  checked={slot.inicio === value}
                  onChange={() => onChange(slot.inicio)}
                />
                <span>
                  <strong>{slot.inicio.slice(11, 16)}</strong>
                  <small>até {slot.fim.slice(11, 16)}</small>
                </span>
              </label>
            ))}
          </div>
          {value && slots.some((slot) => slot.inicio === value) && (
            <p className="slot-selected">
              Selecionado às <strong>{value.slice(11, 16)}</strong>
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
