/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as databases from "../databases.js";
import type * as documents from "../documents.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_cellValue from "../lib/cellValue.js";
import type * as lib_coerce from "../lib/coerce.js";
import type * as lib_databaseCascade from "../lib/databaseCascade.js";
import type * as lib_ordering from "../lib/ordering.js";
import type * as lib_searchText from "../lib/searchText.js";
import type * as userSettings from "../userSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  databases: typeof databases;
  documents: typeof documents;
  "lib/auth": typeof lib_auth;
  "lib/cellValue": typeof lib_cellValue;
  "lib/coerce": typeof lib_coerce;
  "lib/databaseCascade": typeof lib_databaseCascade;
  "lib/ordering": typeof lib_ordering;
  "lib/searchText": typeof lib_searchText;
  userSettings: typeof userSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
