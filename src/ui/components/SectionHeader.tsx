interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h3 className="text-xs text-gray-500 font-semibold tracking-wider uppercase mb-2">
      {title}
    </h3>
  );
}
