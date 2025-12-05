type Props = {
  label: string;
  children: React.ReactNode;
};

export function FormField({ label, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
