type MobileCalendarEventComposerProps = {
  isOpen: boolean;
  onClose?: () => void;
};

const MobileCalendarEventComposer = ({ isOpen, onClose }: MobileCalendarEventComposerProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/10" role="presentation">
      <section className="w-full max-w-[720px] rounded-t-[24px] bg-white p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.16)]" role="dialog" aria-modal="true" aria-label="予定を追加">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#1c1c1e]">予定を追加</h2>
          <button type="button" className="text-sm text-[#007aff]" onClick={onClose}>
            閉じる
          </button>
        </div>
        <p className="mt-3 text-sm text-[#6d6d6d]">予定作成UIを読み込めませんでした。</p>
      </section>
    </div>
  );
};

export { MobileCalendarEventComposer };
