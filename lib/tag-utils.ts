export const TAG_COLORS = [
  { name: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' },
  { name: 'blue', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', dot: 'bg-blue-500' },
  { name: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-500' },
  { name: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', dot: 'bg-rose-500' },
  { name: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-500' },
  { name: 'violet', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100', dot: 'bg-violet-500' },
  { name: 'cyan', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', dot: 'bg-cyan-500' },
  { name: 'fuchsia', bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-100', dot: 'bg-fuchsia-500' },
];

export function getTagColor(tag: string) {
  const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}
