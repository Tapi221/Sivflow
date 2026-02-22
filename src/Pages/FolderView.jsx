import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

export default function FolderView() {
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('id');
  const openCreationMode = searchParams.get('openCreationMode');

  const next = new URLSearchParams();
  if (folderId) next.set('folderId', folderId);
  if (openCreationMode === '1') next.set('openCreationMode', '1');

  const to = next.toString() ? `/Folders?${next.toString()}` : '/Folders';
  return <Navigate to={to} replace />;
}
