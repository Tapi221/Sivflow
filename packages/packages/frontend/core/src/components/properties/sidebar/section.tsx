import { CategoryDivider } from '@affine/core/modules/app-sidebar/views/category-divider';
import { useI18n } from '@affine/i18n';

export const WorkspacePropertyListSidebarSection = ({
  children,
}: React.PropsWithChildren) => {
  const t = useI18n();
  return (
    <CategoryDivider
      label={t['com.affine.propertySidebar.property-list.section']()}
    >
      {children}
    </CategoryDivider>
  );
};

export const AddWorkspacePropertySidebarSection = () => {
  const t = useI18n();
  return (
    <CategoryDivider
      label={t['com.affine.propertySidebar.add-more.section']()}
    />
  );
};
