export type FieldNotice = {
  text: string;
  hint: string;
};

export function FieldNoticeView({ notice }: { notice: FieldNotice | null }) {
  if (!notice) return null;
  return (
    <p className="field-notice" role="alert">
      <strong>{notice.text}</strong>
      <span>{notice.hint}</span>
    </p>
  );
}
