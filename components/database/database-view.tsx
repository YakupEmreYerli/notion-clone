"use client";

import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

import { DatabaseGrid } from "./database-grid";
import { DatabaseSkeleton } from "./database-skeleton";

interface DatabaseViewProps {
  documentId: Id<"documents">;
  editable?: boolean;
}

const DatabaseView = ({ documentId, editable = true }: DatabaseViewProps) => {
  const properties = useQuery(api.databases.getSchema, {
    databaseId: documentId,
  });
  const rows = useQuery(api.databases.getRows, { databaseId: documentId });

  if (properties === undefined || rows === undefined) {
    return <DatabaseSkeleton />;
  }

  return (
    <div className="px-4 md:px-8">
      <DatabaseGrid
        databaseId={documentId}
        properties={properties}
        rows={rows}
        editable={editable}
      />
    </div>
  );
};

export default DatabaseView;
