interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export default function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: SliderProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 font-semibold tracking-wider uppercase">
        {label} ({value})
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-runnable-track]:bg-teal-700 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:h-2
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-teal-700 [&::-webkit-slider-thumb]:-mt-1
          [&::-moz-range-track]:bg-teal-700 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:h-2
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-teal-700"
      />
    </div>
  );
}
