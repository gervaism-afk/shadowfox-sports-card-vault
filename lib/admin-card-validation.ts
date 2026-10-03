const strings = [
  "player",
  "year",
  "brand",
  "set_name",
  "subset",
  "card_number",
  "team",
  "serial_number",
  "parallel",
  "grading_company",
  "grade",
  "notes",
];
const flags = ["rookie", "autograph", "relic_patch"];
export function validateAdminCardUpdates(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Enter card details.");
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (strings.includes(key)) {
      if (
        typeof value !== "string" ||
        value.length > (key === "notes" ? 5000 : 150)
      )
        throw new Error(`Invalid ${key.replace(/_/g, " ")}.`);
      result[key] = value.trim();
    } else if (flags.includes(key)) {
      if (typeof value !== "boolean") throw new Error(`Invalid ${key}.`);
      result[key] = value;
    } else if (key === "sport") {
      if (value !== "Hockey" && value !== "Baseball")
        throw new Error("Choose Hockey or Baseball.");
      result[key] = value;
    } else if (key === "quantity") {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
        throw new Error("Quantity must be a whole number of at least 1.");
      result[key] = value;
    } else if (key === "estimated_value_cad") {
      if (
        value !== null &&
        (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      )
        throw new Error("Estimated value must be zero or more.");
      result[key] = value;
    } else throw new Error("This field cannot be changed here.");
  }
  if (!Object.keys(result).length) throw new Error("Enter card details.");
  return result;
}
