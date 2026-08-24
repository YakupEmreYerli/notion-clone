import type {
  DatabaseProperty,
  DatabaseRow,
  DatabaseView,
  PropertyOption,
  PropertyType,
  ViewType,
} from "@/components/database/types";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Test verisi kurucusu (data-builder).
 *
 * Amaç: bir test ya da fixture'ın "ne"yi kurduğunu tek bakışta okutmak.
 * Convex `Doc<>` şekillerini (`_id`, `_creationTime`, `databaseId`, `userId`,
 * `order`) elle yazmak yerine kurucu üretir; hücreler **özellik adıyla**
 * verilir, kurucu bunları özellik `_id`'lerine çevirir — üretim kodundaki
 * "hücreler ada göre değil `_id`'ye göre anahtarlanır" kuralı test tarafında da
 * bozulmadan kalır (bkz. `.claude/rules/project/convex.md`).
 *
 * Kurucu **değişmez**: her `with*` çağrısı yeni bir kurucu döndürür.
 */

/** Özellik adından kararlı, okunabilir bir kimlik üretir. */
function slug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type PropertyExtras = Partial<
  Omit<
    DatabaseProperty,
    "_id" | "_creationTime" | "databaseId" | "userId" | "name" | "type" | "order"
  >
>;

interface PropertySpec {
  name: string;
  type: PropertyType;
  extras: PropertyExtras;
}

/** Hücreler özellik adıyla verilir; kurucu `_id`'ye çevirir. */
type CellsByName = Record<
  string,
  DatabaseRow["cells"][Id<"databaseProperties">]
>;

interface ViewSpec {
  name: string;
  type: ViewType;
}

export interface BuiltDatabase {
  databaseId: Id<"documents">;
  /** Tüm özellikler, eklenme sırasında. */
  properties: DatabaseProperty[];
  /** `isTitle` işaretli özellik — board kartının başlığı. */
  titleProperty: DatabaseProperty;
  /** Başlık dışındaki özellikler — board kartında görünenler. */
  visibleProperties: DatabaseProperty[];
  rows: DatabaseRow[];
  view: DatabaseView;
  /** Ada göre özellik; yoksa fırlatır (sessiz `undefined` yerine). */
  property: (name: string) => DatabaseProperty;
  propertyId: (name: string) => Id<"databaseProperties">;
}

class DatabaseBuilder {
  private constructor(
    private readonly prefix: string,
    private readonly propertySpecs: readonly PropertySpec[],
    private readonly rowSpecs: readonly CellsByName[],
    private readonly viewSpec: ViewSpec,
  ) {}

  static create(prefix: string) {
    return new DatabaseBuilder(prefix, [], [], {
      name: "Table",
      type: "table",
    });
  }

  private withProperty(spec: PropertySpec) {
    return new DatabaseBuilder(
      this.prefix,
      [...this.propertySpecs, spec],
      this.rowSpecs,
      this.viewSpec,
    );
  }

  /** Başlık özelliği (`isTitle`). Bir veritabanında tek tane olur. */
  withTitle(name: string, extras: PropertyExtras = {}) {
    return this.withProperty({
      name,
      type: "text",
      extras: { ...extras, isTitle: true },
    });
  }

  withText(name: string, extras: PropertyExtras = {}) {
    return this.withProperty({ name, type: "text", extras });
  }

  withNumber(name: string, extras: PropertyExtras = {}) {
    return this.withProperty({ name, type: "number", extras });
  }

  withCheckbox(name: string, extras: PropertyExtras = {}) {
    return this.withProperty({ name, type: "checkbox", extras });
  }

  withSelect(
    name: string,
    options: PropertyOption[],
    extras: PropertyExtras = {},
  ) {
    return this.withProperty({
      name,
      type: "select",
      extras: { ...extras, options },
    });
  }

  /** Hücreler özellik **adıyla** verilir: `{ Title: "...", Status: "next" }`. */
  withRow(cells: CellsByName) {
    return new DatabaseBuilder(
      this.prefix,
      this.propertySpecs,
      [...this.rowSpecs, cells],
      this.viewSpec,
    );
  }

  withRows(...rows: CellsByName[]) {
    return new DatabaseBuilder(
      this.prefix,
      this.propertySpecs,
      [...this.rowSpecs, ...rows],
      this.viewSpec,
    );
  }

  withView(name: string, type: ViewType) {
    return new DatabaseBuilder(this.prefix, this.propertySpecs, this.rowSpecs, {
      name,
      type,
    });
  }

  build(): BuiltDatabase {
    const databaseId = `${this.prefix}-database` as Id<"documents">;
    const userId = `${this.prefix}-user`;

    const properties = this.propertySpecs.map((spec, index) => ({
      _id: `${this.prefix}-${slug(spec.name)}` as Id<"databaseProperties">,
      _creationTime: index + 1,
      databaseId,
      userId,
      name: spec.name,
      type: spec.type,
      order: index,
      ...spec.extras,
    })) satisfies DatabaseProperty[];

    const byName = new Map(properties.map((property) => [property.name, property]));
    const property = (name: string) => {
      const found = byName.get(name);
      if (!found) {
        throw new Error(
          `Kurucuda "${name}" adlı özellik yok. Var olanlar: ${[...byName.keys()].join(", ")}`,
        );
      }
      return found;
    };

    const rows = this.rowSpecs.map((cells, index) => ({
      _id: `${this.prefix}-row-${index + 1}` as Id<"databaseRows">,
      _creationTime: index + 1,
      databaseId,
      userId,
      order: index + 1,
      cells: Object.fromEntries(
        Object.entries(cells).map(([name, value]) => [property(name)._id, value]),
      ),
    })) satisfies DatabaseRow[];

    const titleProperty = properties.find((item) => item.isTitle);
    if (!titleProperty) {
      throw new Error("Kurucuya `withTitle()` ile bir başlık özelliği ekleyin.");
    }

    const view = {
      _id: `${this.prefix}-view` as Id<"databaseViews">,
      _creationTime: properties.length + rows.length + 1,
      databaseId,
      userId,
      name: this.viewSpec.name,
      type: this.viewSpec.type,
      position: 0,
    } satisfies DatabaseView;

    return {
      databaseId,
      properties,
      titleProperty,
      visibleProperties: properties.filter((item) => !item.isTitle),
      rows,
      view,
      property,
      propertyId: (name: string) => property(name)._id,
    };
  }
}

/** `databaseBuilder("books").withTitle("Title").withRow({ Title: "..." }).build()` */
export function databaseBuilder(prefix: string) {
  return DatabaseBuilder.create(prefix);
}
