'use client';

import * as React from 'react';
import { useDraggable } from '@platejs/dnd';
import { Image, ImagePlugin, useMediaState } from '@platejs/media/react';
import { ResizableProvider, useResizableValue } from '@platejs/resizable';
import { PlateElement, withHOC } from 'platejs/react';
import { cn } from '@/lib/utils';
import { LOCAL_PLATE_MEDIA_USER_ID, parseLocalMediaUrl } from '@/registry/lib/local-media-url';
import { getOrCreateImageBlobUrl, pinImageBlobUrl, unpinImageBlobUrl } from '@/services/imageBlobUrlSessionCache';
import { Caption, CaptionTextarea } from './caption';
import { MediaToolbar } from './media-toolbar';
import { mediaResizeHandleVariants, Resizable, ResizeHandle } from './resize-handle';
import type { TImageElement } from 'platejs';
import type { PlateElementProps } from 'platejs/react';

const getImageUrl = (element: TImageElement): string => typeof element.url === 'string' ? element.url : '';

const useResolvedImageUrl = (sourceUrl: string): string | null => {
  const localBlobId = React.useMemo(() => parseLocalMediaUrl(sourceUrl), [sourceUrl]);
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(() => localBlobId ? null : sourceUrl);

  React.useEffect(() => {
    let mounted = true;

    if (!localBlobId) {
      setResolvedUrl(sourceUrl);
      return () => {};
    }

    setResolvedUrl(null);
    void getOrCreateImageBlobUrl(localBlobId, { userId: LOCAL_PLATE_MEDIA_USER_ID }).then((url) => {
      if (!mounted) return;
      setResolvedUrl(url);
      if (url) pinImageBlobUrl(localBlobId, { userId: LOCAL_PLATE_MEDIA_USER_ID });
    });

    return () => {
      mounted = false;
      unpinImageBlobUrl(localBlobId, { userId: LOCAL_PLATE_MEDIA_USER_ID });
    };
  }, [localBlobId, sourceUrl]);

  return resolvedUrl;
};

export const ImageElement = withHOC(
  ResizableProvider,
  function ImageElement(props: PlateElementProps<TImageElement>) {
    const { align = 'center', focused, readOnly, selected } = useMediaState();
    const width = useResizableValue('width');
    const sourceUrl = getImageUrl(props.element);
    const resolvedUrl = useResolvedImageUrl(sourceUrl);

    const { isDragging, handleRef } = useDraggable({
      element: props.element,
    });

    return (
      <MediaToolbar plugin={ImagePlugin}>
        <PlateElement {...props} className="py-2.5">
          <figure className="group relative m-0" contentEditable={false}>
            <Resizable
              align={align}
              options={{
                align,
                readOnly,
              }}
            >
              <ResizeHandle
                className={mediaResizeHandleVariants({ direction: 'left' })}
                options={{ direction: 'left' }}
              />
              <div>
                {resolvedUrl ? (
                  <Image
                    ref={handleRef}
                    className={cn(
                      'block w-full max-w-full cursor-pointer object-cover px-0',
                      'rounded-sm',
                      focused && selected && 'ring-2 ring-ring ring-offset-2',
                      isDragging && 'opacity-50'
                    )}
                    alt={props.attributes.alt as string | undefined}
                    src={resolvedUrl}
                  />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-sm bg-muted text-muted-foreground text-sm">
                    Loading image...
                  </div>
                )}
              </div>
              <ResizeHandle
                className={mediaResizeHandleVariants({
                  direction: 'right',
                })}
                options={{ direction: 'right' }}
              />
            </Resizable>

            <Caption style={{ width }} align={align}>
              <CaptionTextarea
                readOnly={readOnly}
                onFocus={(e) => {
                  e.preventDefault();
                }}
                placeholder="Write a caption..."
              />
            </Caption>
          </figure>

          {props.children}
        </PlateElement>
      </MediaToolbar>
    );
  }
);
