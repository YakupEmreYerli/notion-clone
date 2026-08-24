import type { Id } from "@/convex/_generated/dataModel";
import type { DatabaseProperty } from "@/components/database/types";

export function orderBoardProperties(
  properties: DatabaseProperty[],
  visiblePropertyIds?: Id<"databaseProperties">[],
  groupByPropertyId?: Id<"databaseProperties">,
): DatabaseProperty[] {
  const nonTitle = properties.filter((property) => !property.isTitle);
  // Eski Board kayıtlarında [] "varsayılan property'ler" anlamına gelir.
  // Table'ın explicit-empty semantiği Board'a geriye dönük uygulanmaz.
  if (visiblePropertyIds && visiblePropertyIds.length > 0) {
    const byId = new Map(nonTitle.map((property) => [property._id, property]));
    return visiblePropertyIds
      .map((propertyId) => byId.get(propertyId))
      .filter((property): property is DatabaseProperty => !!property);
  }

  const priority = (property: DatabaseProperty) => {
    if (property._id === groupByPropertyId) return 0;
    if (property.type === "select" || property.type === "multiSelect") return 1;
    return 2;
  };

  return [...nonTitle].sort(
    (left, right) =>
      priority(left) - priority(right) || left.order - right.order,
  );
}
