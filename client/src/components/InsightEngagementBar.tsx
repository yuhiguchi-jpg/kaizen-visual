import type { ReactNode } from "react";

type Props = {
  likeAction: ReactNode;
  commentAction: ReactNode;
  deleteAction?: ReactNode;
  children?: ReactNode;
};

export default function InsightEngagementBar({ likeAction, commentAction, deleteAction, children }: Props) {
  return (
    <div className="mt-5">
      <div data-insight-actions className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4 sm:flex-nowrap">
        <div data-insight-engagement className="inline-flex shrink-0 flex-nowrap items-center gap-2">
          {likeAction}
          {commentAction}
        </div>
        {deleteAction && <div data-insight-delete-action className="ml-auto shrink-0">{deleteAction}</div>}
      </div>
      {children}
    </div>
  );
}
