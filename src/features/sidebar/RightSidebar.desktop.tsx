type RightSidebarDesktopProps = {
  open: boolean;
};

export const RightSidebarDesktop = ({ open }: RightSidebarDesktopProps) => {
  if (!open) {
    return null;
  }

  return <aside className="app-right-sidebar" aria-label="Right sidebar" />;
};
