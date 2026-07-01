type UpgradePanelProps = {
  compact?: boolean;
};



const UpgradePanel = ({ compact = false }: UpgradePanelProps) => {
  if (compact) {
    return null;
  }

  return (
    <div className="app-sidebar__trial">
      <p>
        トライアル期間の残り <strong>6 日</strong>
        <br />
        すべての機能をお試しいただけます。
      </p>
      <button type="button">アップグレード</button>
    </div>
  );
};



export { UpgradePanel };
