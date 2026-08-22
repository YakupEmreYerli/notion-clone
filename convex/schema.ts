import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  cellValueValidator,
  propertyOptionValidator,
  propertyTypeValidator,
} from "./lib/cellValue";

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    userId: v.string(),
    isArchived: v.boolean(),
    parentDocument: v.optional(v.id("documents")),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.boolean(),
    order: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    isFavorite: v.optional(v.boolean()),
    editorFont: v.optional(v.string()),
    fullWidth: v.optional(v.boolean()),
    smallText: v.optional(v.boolean()),
    showToc: v.optional(v.boolean()),
    lastOpenedAt: v.optional(v.number()),
    // optional: mevcut satırlar migration istemez. undefined => "page"
    type: v.optional(v.union(v.literal("page"), v.literal("database"))),
  })
    .index("by_user", ["userId"])
    .index("by_user_parent", ["userId", "parentDocument"]),

  databaseProperties: defineTable({
    databaseId: v.id("documents"),
    userId: v.string(),
    name: v.string(),
    type: propertyTypeValidator,
    order: v.number(),
    width: v.optional(v.number()),
    options: v.optional(v.array(propertyOptionValidator)),
    isTitle: v.optional(v.boolean()),
  }).index("by_database_order", ["databaseId", "order"]),

  databaseRows: defineTable({
    databaseId: v.id("documents"),
    userId: v.string(),
    order: v.number(),
    cells: v.record(v.id("databaseProperties"), cellValueValidator),
  }).index("by_database_order", ["databaseId", "order"]),

  userSettings: defineTable({
    userId: v.string(),
    editorFont: v.optional(v.string()),
    focusMode: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
});
