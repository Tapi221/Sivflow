import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";



type UseCardSetViewRouteStateSyncOptions = {
  cardSetId: string | null;
  currentIndex: number;
  currentCardId: string | null;
};



const stringifyPath = ({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}) => `${pathname}${search}${hash}`;
const useCardSetViewRouteStateSync = ({ cardSetId, currentIndex, currentCardId }: UseCardSetViewRouteStateSyncOptions) => {
  const location = useLocation();
  const navigate = useNavigate();

  const nextLocation = useMemo(() => {
    if (!cardSetId || !Number.isFinite(currentIndex) || currentIndex < 0) {
      return null;
    }

    const nextSearchParams = new URLSearchParams(location.search);
    nextSearchParams.set("cardSetId", cardSetId);
    nextSearchParams.set("index", String(currentIndex));

    if (currentCardId) {
      nextSearchParams.set("cardId", currentCardId);
    }

    const nextSearch = `?${nextSearchParams.toString()}`;
    const currentLocation = stringifyPath({
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    });
    const targetLocation = stringifyPath({
      pathname: location.pathname,
      search: nextSearch,
      hash: location.hash,
    });

    return targetLocation === currentLocation ? null : targetLocation;
  }, [
    cardSetId,
    currentCardId,
    currentIndex,
    location.hash,
    location.pathname,
    location.search,
  ]);

  useEffect(() => {
    if (!nextLocation) return;

    navigate(nextLocation, { replace: true });
  }, [navigate, nextLocation]);
};



export { useCardSetViewRouteStateSync };
